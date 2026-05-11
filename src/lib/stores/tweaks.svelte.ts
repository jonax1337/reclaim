import { invoke } from '@tauri-apps/api/core';
import type { SystemInfo, Tweak, WingetApp } from '../types';

export interface Toast {
  id: number;
  kind: 'ok' | 'err' | 'info';
  msg: string;
  action?: { label: string; run: () => void | Promise<void> };
  ttl?: number;
}

export interface ConfirmRequest {
  title: string;
  body: string;
  danger?: boolean;
  confirmLabel?: string;
  onconfirm: () => void | Promise<void>;
}

class TweakStore {
  tweaks = $state<Tweak[]>([]);
  applied = $state<Set<string>>(new Set());
  selected = $state<Set<string>>(new Set());
  loading = $state(false);
  systemInfo = $state<SystemInfo | null>(null);
  search = $state('');
  preset = $state<'minimal' | 'recommended' | 'aggressive' | null>(null);
  toasts = $state<Toast[]>([]);
  apps = $state<WingetApp[]>([]);
  pendingConfirm = $state<ConfirmRequest | null>(null);

  private toastId = 0;

  async load() {
    this.loading = true;
    try {
      const [tw, info, apps] = await Promise.all([
        invoke<Tweak[]>('list_tweaks'),
        invoke<SystemInfo>('system_info').catch(() => null),
        invoke<WingetApp[]>('list_winget_apps').catch(() => [])
      ]);
      this.tweaks = tw;
      this.systemInfo = info;
      this.apps = apps;
      await this.refreshApplied();
    } finally {
      this.loading = false;
    }
  }

  async refreshApplied() {
    const states = await Promise.all(
      this.tweaks.map((t) =>
        invoke<{ id: string; applied: boolean }>('get_tweak_state', { id: t.id }).catch(() => ({
          id: t.id,
          applied: false
        }))
      )
    );
    const next = new Set<string>();
    for (const s of states) if (s.applied) next.add(s.id);
    this.applied = next;
  }

  toast(t: Omit<Toast, 'id'>) {
    const id = ++this.toastId;
    const ttl = t.ttl ?? (t.action ? 8000 : 4200);
    const toast: Toast = { ...t, id };
    this.toasts = [...this.toasts, toast];
    setTimeout(() => this.dismissToast(id), ttl);
  }

  dismissToast(id: number) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
  }

  confirm(req: ConfirmRequest) {
    this.pendingConfirm = req;
  }

  private async applyOne(id: string): Promise<void> {
    await invoke('apply_tweak', { id });
    const next = new Set(this.applied); next.add(id); this.applied = next;
  }

  private async revertOne(id: string): Promise<void> {
    await invoke('revert_tweak', { id });
    const next = new Set(this.applied); next.delete(id); this.applied = next;
  }

  async toggle(id: string) {
    const tweak = this.tweaks.find((t) => t.id === id);
    if (!tweak) return;
    const isApplied = this.applied.has(id);

    if (!isApplied && tweak.severity === 'risky') {
      this.confirm({
        title: `Apply "${tweak.name}"?`,
        body: tweak.warning ?? 'This tweak is marked as risky. It will modify your system, but can be reverted from the Activity tab.',
        danger: true,
        confirmLabel: 'Apply anyway',
        onconfirm: () => this.doToggle(tweak, false)
      });
      return;
    }
    await this.doToggle(tweak, isApplied);
  }

  private async doToggle(tweak: Tweak, isApplied: boolean) {
    try {
      if (isApplied) {
        await this.revertOne(tweak.id);
        this.toast({ kind: 'ok', msg: `Reverted: ${tweak.name}` });
      } else {
        await this.applyOne(tweak.id);
        this.toast({
          kind: 'ok',
          msg: `Applied: ${tweak.name}`,
          action: { label: 'Undo', run: () => this.revertOne(tweak.id).then(() => this.toast({ kind: 'info', msg: `Reverted: ${tweak.name}` })) }
        });
      }
    } catch (e) {
      this.toast({ kind: 'err', msg: `${tweak.name}: ${e}` });
    }
  }

  toggleSelected(id: string) {
    const next = new Set(this.selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selected = next;
  }

  applyPreset(name: 'minimal' | 'recommended' | 'aggressive' | null) {
    this.preset = name;
    if (!name) {
      this.selected = new Set();
      return;
    }
    const next = new Set<string>();
    for (const t of this.tweaks) {
      if (t.presets.includes(name) && !this.applied.has(t.id)) next.add(t.id);
    }
    this.selected = next;
  }

  async applySelection(restorePoint: boolean) {
    if (this.selected.size === 0) return;
    const ids = [...this.selected];
    const riskyOnes = this.tweaks.filter((t) => ids.includes(t.id) && t.severity === 'risky');
    if (riskyOnes.length > 0) {
      this.confirm({
        title: `Apply ${ids.length} tweak${ids.length === 1 ? '' : 's'}?`,
        body: `${riskyOnes.length} of these are marked as risky: ${riskyOnes.map((t) => t.name).join(', ')}.`,
        danger: true,
        confirmLabel: `Apply ${ids.length}`,
        onconfirm: () => this.preflightAndApply(ids, restorePoint)
      });
      return;
    }
    await this.preflightAndApply(ids, restorePoint);
  }

  private async preflightAndApply(ids: string[], restorePoint: boolean) {
    if (restorePoint) {
      try {
        await invoke('create_restore_point', { label: 'Reclaim batch apply' });
      } catch (e) {
        this.confirm({
          title: 'Restore point could not be created',
          body: `${e}\n\nThe System Restore safety net is unavailable. Apply anyway?`,
          danger: true,
          confirmLabel: 'Apply without restore point',
          onconfirm: () => this.doApplySelection(ids)
        });
        return;
      }
    }
    await this.doApplySelection(ids);
  }

  private async doApplySelection(ids: string[]) {
    this.toast({ kind: 'info', msg: `Applying ${ids.length} tweak${ids.length === 1 ? '' : 's'}…` });
    try {
      const results = await invoke<[string, boolean, string | null][]>('apply_batch', { ids });
      const ok = results.filter((r) => r[1]).length;
      const failed = results.length - ok;
      this.toast({
        kind: failed === 0 ? 'ok' : 'err',
        msg: `${ok} applied${failed > 0 ? `, ${failed} failed` : ''}.`
      });
      await this.refreshApplied();
      this.selected = new Set();
    } catch (e) {
      this.toast({ kind: 'err', msg: `Batch failed: ${e}` });
    }
  }
}

export const store = new TweakStore();

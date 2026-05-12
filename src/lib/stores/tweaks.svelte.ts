import { invoke } from '@tauri-apps/api/core';
import type { DetectionState, DriftEntry, SystemInfo, Tweak, TweakStatus, WingetApp } from '../types';

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
  /// Live detection states from the actual system. Keyed by tweak id.
  states = $state<Map<string, TweakStatus>>(new Map());
  /// Tweaks with a backup journal but no longer fully Applied — reverted by Windows Update etc.
  drift = $state<DriftEntry[]>([]);
  selected = $state<Set<string>>(new Set());
  loading = $state(false);
  detecting = $state(false);
  systemInfo = $state<SystemInfo | null>(null);
  search = $state('');
  preset = $state<'minimal' | 'recommended' | 'aggressive' | null>(null);
  /// Filter to hide tweaks that are already applied. Off by default.
  hideApplied = $state(false);
  /// Filter to show only tweaks where the live state differs from default *and* desired.
  showModifiedOnly = $state(false);
  toasts = $state<Toast[]>([]);
  apps = $state<WingetApp[]>([]);
  pendingConfirm = $state<ConfirmRequest | null>(null);

  // Derived: Set of ids that are fully Applied. Kept for backward compat with existing UI.
  applied = $derived.by(() => {
    const s = new Set<string>();
    for (const [id, st] of this.states) if (st.state === 'applied') s.add(id);
    return s;
  });

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
      await this.refreshStates();
    } finally {
      this.loading = false;
    }
  }

  /// Bulk-detect every tweak's live state from the actual system. Also refreshes drift list.
  async refreshStates() {
    this.detecting = true;
    try {
      const [statuses, drift] = await Promise.all([
        invoke<TweakStatus[]>('detect_all_tweaks').catch(() => [] as TweakStatus[]),
        invoke<DriftEntry[]>('list_drift').catch(() => [] as DriftEntry[])
      ]);
      const m = new Map<string, TweakStatus>();
      for (const s of statuses) m.set(s.id, s);
      this.states = m;
      this.drift = drift;
    } finally {
      this.detecting = false;
    }
  }

  stateOf(id: string): DetectionState {
    return this.states.get(id)?.state ?? 'unknown';
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

  private async refreshOne(id: string): Promise<void> {
    const status = await invoke<TweakStatus | null>('detect_one_tweak', { id }).catch(() => null);
    if (!status) return;
    const m = new Map(this.states);
    m.set(id, status);
    this.states = m;
  }

  private async applyOne(id: string): Promise<void> {
    await invoke('apply_tweak', { id });
    await this.refreshOne(id);
  }

  private async revertOne(id: string): Promise<void> {
    await invoke('revert_tweak', { id });
    await this.refreshOne(id);
  }

  async toggle(id: string) {
    const tweak = this.tweaks.find((t) => t.id === id);
    if (!tweak) return;
    const isApplied = this.stateOf(id) === 'applied';

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
      if (t.presets.includes(name) && this.stateOf(t.id) !== 'applied') next.add(t.id);
    }
    this.selected = next;
  }

  /// Selects every tweak in a named profile (Gaming, Privacy Max, etc) that isn't applied.
  selectProfile(ids: string[]) {
    const next = new Set<string>();
    for (const id of ids) {
      if (this.stateOf(id) !== 'applied') next.add(id);
    }
    this.selected = next;
  }

  /// Re-applies any tweaks that have drifted (backup exists but state ≠ applied).
  async reapplyDrift() {
    const ids = this.drift.map((d) => d.id);
    if (ids.length === 0) return;
    await this.preflightAndApply(ids, false);
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
      await this.refreshStates();
      this.selected = new Set();
    } catch (e) {
      this.toast({ kind: 'err', msg: `Batch failed: ${e}` });
    }
  }
}

export const store = new TweakStore();

import { invoke } from '@tauri-apps/api/core';
import { create } from 'zustand';
import type { DetectionState, DriftEntry, SystemInfo, Tweak, TweakStatus, WingetApp } from '../../types';

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

export type Preset = 'minimal' | 'recommended' | 'aggressive' | null;

interface TweaksState {
  tweaks: Tweak[];
  states: Map<string, TweakStatus>;
  drift: DriftEntry[];
  selected: Set<string>;
  loading: boolean;
  detecting: boolean;
  systemInfo: SystemInfo | null;
  search: string;
  preset: Preset;
  hideApplied: boolean;
  showModifiedOnly: boolean;
  toasts: Toast[];
  apps: WingetApp[];
  pendingConfirm: ConfirmRequest | null;

  // derived helper
  applied: () => Set<string>;
  stateOf: (id: string) => DetectionState;

  // setters
  setSearch: (s: string) => void;
  setHideApplied: (v: boolean) => void;
  setShowModifiedOnly: (v: boolean) => void;
  setPendingConfirm: (r: ConfirmRequest | null) => void;

  // actions
  load: () => Promise<void>;
  refreshStates: () => Promise<void>;
  toast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: number) => void;
  confirm: (r: ConfirmRequest) => void;
  toggle: (id: string) => Promise<void>;
  toggleSelected: (id: string) => void;
  applyPreset: (p: Preset) => void;
  selectProfile: (ids: string[]) => void;
  reapplyDrift: () => Promise<void>;
  applySelection: (restorePoint: boolean) => Promise<void>;
}

let toastIdCounter = 0;

export const useTweaks = create<TweaksState>((set, get) => {
  async function refreshOne(id: string) {
    const status = await invoke<TweakStatus | null>('detect_one_tweak', { id }).catch(() => null);
    if (!status) return;
    const m = new Map(get().states);
    m.set(id, status);
    set({ states: m });
  }

  async function applyOne(id: string) {
    await invoke('apply_tweak', { id });
    await refreshOne(id);
  }

  async function revertOne(id: string) {
    await invoke('revert_tweak', { id });
    await refreshOne(id);
  }

  async function doToggle(tweak: Tweak, isApplied: boolean) {
    try {
      if (isApplied) {
        await revertOne(tweak.id);
        get().toast({ kind: 'ok', msg: `Reverted: ${tweak.name}` });
      } else {
        await applyOne(tweak.id);
        get().toast({
          kind: 'ok',
          msg: `Applied: ${tweak.name}`,
          action: {
            label: 'Undo',
            run: () => revertOne(tweak.id).then(() => get().toast({ kind: 'info', msg: `Reverted: ${tweak.name}` }))
          }
        });
      }
    } catch (e) {
      get().toast({ kind: 'err', msg: `${tweak.name}: ${e}` });
    }
  }

  async function doApplySelection(ids: string[]) {
    get().toast({ kind: 'info', msg: `Applying ${ids.length} tweak${ids.length === 1 ? '' : 's'}…` });
    try {
      const results = await invoke<[string, boolean, string | null][]>('apply_batch', { ids });
      const ok = results.filter((r) => r[1]).length;
      const failed = results.length - ok;
      get().toast({
        kind: failed === 0 ? 'ok' : 'err',
        msg: `${ok} applied${failed > 0 ? `, ${failed} failed` : ''}.`
      });
      await get().refreshStates();
      set({ selected: new Set() });
    } catch (e) {
      get().toast({ kind: 'err', msg: `Batch failed: ${e}` });
    }
  }

  async function preflightAndApply(ids: string[], restorePoint: boolean) {
    if (restorePoint) {
      try {
        await invoke('create_restore_point', { label: 'Reclaim batch apply' });
      } catch (e) {
        get().confirm({
          title: 'Restore point could not be created',
          body: `${e}\n\nThe System Restore safety net is unavailable. Apply anyway?`,
          danger: true,
          confirmLabel: 'Apply without restore point',
          onconfirm: () => doApplySelection(ids)
        });
        return;
      }
    }
    await doApplySelection(ids);
  }

  return {
    tweaks: [],
    states: new Map(),
    drift: [],
    selected: new Set(),
    loading: false,
    detecting: false,
    systemInfo: null,
    search: '',
    preset: null,
    hideApplied: false,
    showModifiedOnly: false,
    toasts: [],
    apps: [],
    pendingConfirm: null,

    applied: () => {
      const s = new Set<string>();
      for (const [id, st] of get().states) if (st.state === 'applied') s.add(id);
      return s;
    },
    stateOf: (id) => get().states.get(id)?.state ?? 'unknown',

    setSearch: (search) => set({ search }),
    setHideApplied: (hideApplied) => set({ hideApplied }),
    setShowModifiedOnly: (showModifiedOnly) => set({ showModifiedOnly }),
    setPendingConfirm: (pendingConfirm) => set({ pendingConfirm }),

    async load() {
      set({ loading: true });
      try {
        const [tw, info, apps] = await Promise.all([
          invoke<Tweak[]>('list_tweaks'),
          invoke<SystemInfo>('system_info').catch(() => null),
          invoke<WingetApp[]>('list_winget_apps').catch(() => [])
        ]);
        set({ tweaks: tw, systemInfo: info, apps });
        await get().refreshStates();
      } finally {
        set({ loading: false });
      }
    },

    async refreshStates() {
      set({ detecting: true });
      try {
        const [statuses, drift] = await Promise.all([
          invoke<TweakStatus[]>('detect_all_tweaks').catch(() => [] as TweakStatus[]),
          invoke<DriftEntry[]>('list_drift').catch(() => [] as DriftEntry[])
        ]);
        const m = new Map<string, TweakStatus>();
        for (const s of statuses) m.set(s.id, s);
        set({ states: m, drift });
      } finally {
        set({ detecting: false });
      }
    },

    toast(t) {
      const id = ++toastIdCounter;
      const ttl = t.ttl ?? (t.action ? 8000 : 4200);
      const toast: Toast = { ...t, id };
      set({ toasts: [...get().toasts, toast] });
      setTimeout(() => get().dismissToast(id), ttl);
    },

    dismissToast(id) {
      set({ toasts: get().toasts.filter((t) => t.id !== id) });
    },

    confirm(req) {
      set({ pendingConfirm: req });
    },

    async toggle(id) {
      const tweak = get().tweaks.find((t) => t.id === id);
      if (!tweak) return;
      const isApplied = get().stateOf(id) === 'applied';

      if (!isApplied && tweak.severity === 'risky') {
        get().confirm({
          title: `Apply "${tweak.name}"?`,
          body: tweak.warning ?? 'This tweak is marked as risky. It will modify your system, but can be reverted from the Activity tab.',
          danger: true,
          confirmLabel: 'Apply anyway',
          onconfirm: () => doToggle(tweak, false)
        });
        return;
      }
      await doToggle(tweak, isApplied);
    },

    toggleSelected(id) {
      const next = new Set(get().selected);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      set({ selected: next });
    },

    applyPreset(preset) {
      set({ preset });
      if (!preset) {
        set({ selected: new Set() });
        return;
      }
      const next = new Set<string>();
      for (const t of get().tweaks) {
        if (t.presets.includes(preset) && get().stateOf(t.id) !== 'applied') next.add(t.id);
      }
      set({ selected: next });
    },

    selectProfile(ids) {
      const next = new Set<string>();
      for (const id of ids) {
        if (get().stateOf(id) !== 'applied') next.add(id);
      }
      set({ selected: next });
    },

    async reapplyDrift() {
      const ids = get().drift.map((d) => d.id);
      if (ids.length === 0) return;
      await preflightAndApply(ids, false);
    },

    async applySelection(restorePoint) {
      const sel = get().selected;
      if (sel.size === 0) return;
      const ids = [...sel];
      const riskyOnes = get().tweaks.filter((t) => ids.includes(t.id) && t.severity === 'risky');
      if (riskyOnes.length > 0) {
        get().confirm({
          title: `Apply ${ids.length} tweak${ids.length === 1 ? '' : 's'}?`,
          body: `${riskyOnes.length} of these are marked as risky: ${riskyOnes.map((t) => t.name).join(', ')}.`,
          danger: true,
          confirmLabel: `Apply ${ids.length}`,
          onconfirm: () => preflightAndApply(ids, restorePoint)
        });
        return;
      }
      await preflightAndApply(ids, restorePoint);
    }
  };
});

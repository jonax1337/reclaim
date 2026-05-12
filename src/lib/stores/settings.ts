import { create } from 'zustand';

type Theme = 'dark' | 'light' | 'system';

interface SettingsState {
  theme: Theme;
  restorePointDefault: boolean;
  reduceMotion: boolean;
  setTheme: (t: Theme) => void;
  setRestorePointDefault: (v: boolean) => void;
  setReduceMotion: (v: boolean) => void;
  applyTheme: () => void;
}

const KEY = 'reclaim.settings';

interface Persisted {
  theme: Theme;
  restorePointDefault: boolean;
  reduceMotion: boolean;
}

const DEFAULTS: Persisted = {
  theme: 'dark',
  restorePointDefault: true,
  reduceMotion: false
};

function load(): Persisted {
  if (typeof localStorage === 'undefined') return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

function persist(s: Persisted) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

export const useSettings = create<SettingsState>((set, get) => {
  const initial = load();
  return {
    ...initial,
    setTheme: (theme) => {
      set({ theme });
      persist({ theme, restorePointDefault: get().restorePointDefault, reduceMotion: get().reduceMotion });
      get().applyTheme();
    },
    setRestorePointDefault: (restorePointDefault) => {
      set({ restorePointDefault });
      persist({ theme: get().theme, restorePointDefault, reduceMotion: get().reduceMotion });
    },
    setReduceMotion: (reduceMotion) => {
      set({ reduceMotion });
      persist({ theme: get().theme, restorePointDefault: get().restorePointDefault, reduceMotion });
      get().applyTheme();
    },
    applyTheme: () => {
      if (typeof document === 'undefined') return;
      const { theme, reduceMotion } = get();
      let effective = theme;
      if (theme === 'system') {
        effective = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      }
      document.documentElement.dataset.theme = effective;
      document.documentElement.dataset.reduceMotion = reduceMotion ? '1' : '0';
    }
  };
});

export type { Theme };

type Theme = 'dark' | 'light' | 'system';

interface SettingsShape {
  theme: Theme;
  restorePointDefault: boolean;
  reduceMotion: boolean;
}

const DEFAULTS: SettingsShape = {
  theme: 'dark',
  restorePointDefault: true,
  reduceMotion: false
};

const KEY = 'reclaim.settings';

function load(): SettingsShape {
  if (typeof localStorage === 'undefined') return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

class SettingsStore {
  private state = $state<SettingsShape>(load());

  get theme() { return this.state.theme; }
  set theme(v: Theme) { this.state.theme = v; this.save(); this.applyTheme(); }

  get restorePointDefault() { return this.state.restorePointDefault; }
  set restorePointDefault(v: boolean) { this.state.restorePointDefault = v; this.save(); }

  get reduceMotion() { return this.state.reduceMotion; }
  set reduceMotion(v: boolean) { this.state.reduceMotion = v; this.save(); this.applyTheme(); }

  private save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.state)); } catch {}
  }

  applyTheme() {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    let theme = this.state.theme;
    if (theme === 'system') {
      theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    root.dataset.theme = theme;
    root.dataset.reduceMotion = this.state.reduceMotion ? '1' : '0';
  }
}

export const settings = new SettingsStore();

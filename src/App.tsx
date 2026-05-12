import { useEffect, useMemo, useState } from 'react';
import { FluentProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components';
import { getCurrentWindow } from '@tauri-apps/api/window';

import { useSettings } from './lib/stores/settings';
import { useTweaks } from './lib/stores/tweaks';
import type { ViewKey } from './types';

import { TitleBar } from './lib/components/TitleBar';
import { Sidebar } from './lib/components/Sidebar';
import { Dashboard } from './lib/components/Dashboard';
import { TweakCard } from './lib/components/TweakCard';
import { ApplyBar } from './lib/components/ApplyBar';
import { PresetChips } from './lib/components/PresetChips';
import { Toasts } from './lib/components/Toasts';
import { AppsPanel } from './lib/components/AppsPanel';
import { ServiceBrowser } from './lib/components/ServiceBrowser';
import { SettingsPanel } from './lib/components/SettingsPanel';
import { ActivityPanel } from './lib/components/ActivityPanel';
import { AppManager } from './lib/components/AppManager';
import { StartupApps } from './lib/components/StartupApps';
import { HardwarePanel } from './lib/components/HardwarePanel';
import { DriversPanel } from './lib/components/DriversPanel';
import { ProfilesPanel } from './lib/components/ProfilesPanel';
import { Skeleton } from './lib/components/Skeleton';
import { ConfirmDialog } from './lib/components/ConfirmDialog';
import { CommandPalette } from './lib/components/CommandPalette';
import { Icon } from './lib/components/Icon';

const titles: Record<ViewKey, string> = {
  dashboard: 'Dashboard',
  profiles: 'Profiles',
  privacy: 'Privacy & Telemetry',
  bloatware: 'Bloatware',
  ai: 'AI Features',
  explorer: 'Explorer & Shell',
  search: 'Search',
  performance: 'Performance',
  gaming: 'Gaming',
  services: 'Services',
  apps: 'Install Apps',
  'app-manager': 'App Manager',
  startup: 'Startup Apps',
  hardware: 'Hardware',
  drivers: 'GPU Drivers',
  updates: 'Windows Update',
  'group-policy': 'Group Policy',
  network: 'Network',
  power: 'Power',
  edge: 'Microsoft Edge',
  annoyances: 'Annoyances',
  developer: 'Developer',
  audio: 'Audio',
  security: 'Security Hardening',
  activity: 'Activity',
  settings: 'Settings'
};

const subtitles: Record<ViewKey, string> = {
  dashboard: '',
  profiles: 'One-click curated bundles. The progress ring shows live system state.',
  privacy: 'Stop the diagnostic stream and the personalised-ad pipeline.',
  bloatware: 'Remove pre-installed UWP apps for all users — and stop them returning.',
  ai: 'Disable Copilot and Recall.',
  explorer: 'Reclaim the file manager and the shell.',
  search: 'Cut Bing out of the Start menu.',
  performance: 'Snappier visuals, fewer background services.',
  gaming: 'Tweaks for full-screen play.',
  services: 'Disable the services you do not need.',
  apps: 'Curated list installed via winget. Silent & unattended.',
  'app-manager': "All bundled UWP apps. Remove what you don't use, reinstall what you removed by mistake.",
  startup: 'Programs that run when you log in. Toggle exactly what Task Manager > Startup does.',
  hardware: 'Live snapshot of your system. CPU, GPU, RAM, motherboard, storage.',
  drivers: 'Detected GPU driver versions and one-click installs of vendor updaters.',
  updates: 'Defer feature releases, exclude drivers, set active hours — without disabling security patches.',
  'group-policy': 'GPO-only policies that normally need gpedit.msc on Pro/Enterprise.',
  network: 'IPv6, LLMNR, NetBIOS, DoH, P2P-update sharing.',
  power: 'Hibernation, fast-startup, USB selective suspend, PCIe link mgmt.',
  edge: 'Strip the Edge re-bloat: Copilot sidebar, Bing, mini-menu, sponsored shopping.',
  annoyances: 'Win11 24H2/25H2 nags: auto-BitLocker, Hello prompts, Suggested Actions.',
  developer: 'Dev Mode, long paths, dark mode for legacy apps, full path in title bar.',
  audio: 'Communications ducking, system beep, logon sound.',
  security: 'Opposite direction: DEP, LSA Protection, no WSH, no WPAD, no SMBv1.',
  activity: 'Every applied tweak in chronological order — revert any of them here.',
  settings: 'Theme, default behaviours, system info.'
};

const categoryFor: Partial<Record<ViewKey, string>> = {
  privacy: 'privacy',
  bloatware: 'bloatware',
  ai: 'ai',
  explorer: 'explorer',
  search: 'search',
  performance: 'performance',
  gaming: 'gaming',
  services: 'services',
  updates: 'updates',
  'group-policy': 'group-policy',
  network: 'network',
  power: 'power',
  edge: 'edge',
  annoyances: 'annoyances',
  developer: 'developer',
  audio: 'audio',
  security: 'security'
};

export function App() {
  const [view, setView] = useState<ViewKey>('dashboard');
  const [servicesTab, setServicesTab] = useState<'curated' | 'browser'>('curated');
  const [paletteOpen, setPaletteOpen] = useState(false);

  const theme = useSettings((s) => s.theme);
  const applyTheme = useSettings((s) => s.applyTheme);

  const tweaks = useTweaks((s) => s.tweaks);
  const search = useTweaks((s) => s.search);
  const setSearch = useTweaks((s) => s.setSearch);
  const hideApplied = useTweaks((s) => s.hideApplied);
  const setHideApplied = useTweaks((s) => s.setHideApplied);
  const showModifiedOnly = useTweaks((s) => s.showModifiedOnly);
  const setShowModifiedOnly = useTweaks((s) => s.setShowModifiedOnly);
  const detecting = useTweaks((s) => s.detecting);
  const loading = useTweaks((s) => s.loading);
  const states = useTweaks((s) => s.states);
  const selected = useTweaks((s) => s.selected);
  const refreshStates = useTweaks((s) => s.refreshStates);
  const load = useTweaks((s) => s.load);
  const toggle = useTweaks((s) => s.toggle);
  const toggleSelected = useTweaks((s) => s.toggleSelected);
  const pendingConfirm = useTweaks((s) => s.pendingConfirm);
  const setPendingConfirm = useTweaks((s) => s.setPendingConfirm);

  // Effective theme — reflects "system"
  const effectiveTheme = useMemo<'dark' | 'light'>(() => {
    if (theme === 'system' && typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    return theme === 'light' ? 'light' : 'dark';
  }, [theme]);

  useEffect(() => {
    applyTheme();
    void (async () => {
      try {
        await getCurrentWindow().setEffects({ effects: ['mica'] as never });
      } catch {}
      await load();
    })();
  }, [applyTheme, load]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const visibleTweaks = useMemo(() => {
    const cat = categoryFor[view];
    if (!cat) return [];
    return tweaks.filter((t) => {
      if (t.category !== cat) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!t.name.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q)) return false;
      }
      const st = states.get(t.id)?.state ?? 'unknown';
      if (hideApplied && st === 'applied') return false;
      if (showModifiedOnly && st !== 'modified') return false;
      return true;
    });
  }, [view, tweaks, search, states, hideApplied, showModifiedOnly]);

  const showFilterRow = !!categoryFor[view] || view === 'services';

  return (
    <FluentProvider theme={effectiveTheme === 'light' ? webLightTheme : webDarkTheme} className="fp-root" style={{ background: 'transparent' }}>
      <TitleBar />
      <main className="app-main">
        <Sidebar current={view} onChange={setView} />
        <section className="content">
          <header className="top">
            <div>
              <h1>{titles[view]}</h1>
              {subtitles[view] && <p className="sub">{subtitles[view]}</p>}
            </div>
            {showFilterRow && (
              <div className="filter-row">
                <div className="search">
                  <Icon name="Search" size={14} />
                  <input
                    type="search"
                    placeholder="Filter tweaks…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className={`filter-chip${hideApplied ? ' on' : ''}`}
                  onClick={() => setHideApplied(!hideApplied)}
                  title="Hide tweaks that are already applied"
                >
                  <Icon name="Filter" size={12} /> Hide applied
                </button>
                <button
                  type="button"
                  className={`filter-chip${showModifiedOnly ? ' on' : ''}`}
                  onClick={() => setShowModifiedOnly(!showModifiedOnly)}
                  title="Show only tweaks where some settings differ from the desired state"
                >
                  <Icon name="AlertTriangle" size={12} /> Modified only
                </button>
                <button
                  type="button"
                  className="filter-chip refresh"
                  onClick={() => void refreshStates()}
                  disabled={detecting}
                  title="Re-scan the system to detect current tweak states"
                >
                  <Icon name="RefreshCw" size={12} className={detecting ? 'spin' : ''} />
                  {detecting ? 'Scanning…' : 'Re-scan'}
                </button>
              </div>
            )}
          </header>

          <div className="scroll">
            {view === 'dashboard' ? (
              <>
                <Dashboard />
                <div className="presets-row"><PresetChips /></div>
                {loading ? <Skeleton count={6} /> : (
                  <div className="grid">
                    {tweaks.slice(0, 6).map((t) => (
                      <TweakCard
                        key={t.id}
                        tweak={t}
                        applied={states.get(t.id)?.state === 'applied'}
                        selected={selected.has(t.id)}
                        status={states.get(t.id) ?? null}
                        onToggleApply={() => void toggle(t.id)}
                        onToggleSelected={() => toggleSelected(t.id)}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : view === 'profiles' ? <ProfilesPanel />
              : view === 'apps' ? <AppsPanel />
              : view === 'app-manager' ? <AppManager />
              : view === 'startup' ? <StartupApps />
              : view === 'hardware' ? <HardwarePanel />
              : view === 'drivers' ? <DriversPanel />
              : view === 'settings' ? <SettingsPanel />
              : view === 'activity' ? <ActivityPanel />
              : view === 'services' ? (
              <>
                <div className="seg" role="tablist">
                  <button role="tab" aria-selected={servicesTab === 'curated'} className={servicesTab === 'curated' ? 'active' : ''} onClick={() => setServicesTab('curated')}>Curated tweaks</button>
                  <button role="tab" aria-selected={servicesTab === 'browser'} className={servicesTab === 'browser' ? 'active' : ''} onClick={() => setServicesTab('browser')}>All services</button>
                </div>
                {servicesTab === 'curated' ? (
                  <>
                    <div className="presets-row"><PresetChips /></div>
                    {loading ? <Skeleton count={4} /> : visibleTweaks.length === 0 ? (
                      <div className="empty"><p>No service tweaks match your filter.</p></div>
                    ) : (
                      <div className="grid">
                        {visibleTweaks.map((t) => (
                          <TweakCard
                            key={t.id}
                            tweak={t}
                            applied={states.get(t.id)?.state === 'applied'}
                            selected={selected.has(t.id)}
                            status={states.get(t.id) ?? null}
                            onToggleApply={() => void toggle(t.id)}
                            onToggleSelected={() => toggleSelected(t.id)}
                          />
                        ))}
                      </div>
                    )}
                  </>
                ) : <ServiceBrowser />}
              </>
            ) : (
              <>
                <div className="presets-row"><PresetChips /></div>
                {loading ? <Skeleton count={5} /> : visibleTweaks.length === 0 ? (
                  <div className="empty">
                    <p>No tweaks match your filter in this category.</p>
                    {search && <button className="link" onClick={() => setSearch('')}>Clear filter</button>}
                  </div>
                ) : (
                  <div className="grid">
                    {visibleTweaks.map((t) => (
                      <TweakCard
                        key={t.id}
                        tweak={t}
                        applied={states.get(t.id)?.state === 'applied'}
                        selected={selected.has(t.id)}
                        status={states.get(t.id) ?? null}
                        onToggleApply={() => void toggle(t.id)}
                        onToggleSelected={() => toggleSelected(t.id)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            <ApplyBar />
          </div>
        </section>
      </main>

      <Toasts />

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} onNavigate={setView} />

      {pendingConfirm && (
        <ConfirmDialog
          open={true}
          onOpenChange={(o) => { if (!o) setPendingConfirm(null); }}
          title={pendingConfirm.title}
          body={pendingConfirm.body}
          danger={pendingConfirm.danger}
          confirmLabel={pendingConfirm.confirmLabel ?? 'Confirm'}
          onConfirm={() => {
            const req = pendingConfirm;
            void req.onconfirm();
            setPendingConfirm(null);
          }}
        />
      )}
    </FluentProvider>
  );
}

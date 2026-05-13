import { useEffect, useMemo, useState } from 'react';
import {
  FluentProvider,
  SearchBox,
  Button,
  Title2,
  Body1,
  Tab,
  TabList,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItemCheckbox,
  makeStyles,
  shorthands,
  tokens
} from '@fluentui/react-components';
import {
  Filter20Regular,
  ArrowClockwise20Regular
} from '@fluentui/react-icons';
import { getCurrentWindow } from '@tauri-apps/api/window';

import { useSettings } from './lib/stores/settings';
import { useTweaks } from './lib/stores/tweaks';
import { micaDarkTheme, micaLightTheme } from './lib/theme/micaTheme';
import type { ViewKey } from './types';

import { TitleBar } from './lib/components/TitleBar';
import { Sidebar } from './lib/components/Sidebar';
import { Dashboard } from './lib/components/Dashboard';
import { TweakCard } from './lib/components/TweakCard';
import { ApplyBar } from './lib/components/ApplyBar';
import { PresetChips } from './lib/components/PresetChips';
import { Toasts } from './lib/components/Toasts';
import { Apps } from './lib/components/Apps';
import { ServiceBrowser } from './lib/components/ServiceBrowser';
import { SettingsPanel } from './lib/components/SettingsPanel';
import { ActivityPanel } from './lib/components/ActivityPanel';
import { StartupApps } from './lib/components/StartupApps';
import { HardwarePanel } from './lib/components/HardwarePanel';
import { DriversPanel } from './lib/components/DriversPanel';
import { ProfilesPanel } from './lib/components/ProfilesPanel';
import { Skeleton } from './lib/components/Skeleton';
import { ConfirmDialog } from './lib/components/ConfirmDialog';
import { CommandPalette } from './lib/components/CommandPalette';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    flex: '1 1 auto',
    minHeight: 0,
    backgroundColor: 'transparent'
  },
  main: {
    display: 'flex',
    flex: '1 1 auto',
    minHeight: 0
  },
  content: {
    flex: '1 1 auto',
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    minHeight: 0
  },
  top: {
    display: 'flex',
    flexDirection: 'column',
    rowGap: tokens.spacingVerticalM,
    ...shorthands.padding('32px', '36px', '20px'),
    flexShrink: 0
  },
  h1: {
    margin: 0,
    letterSpacing: '-0.2px',
    color: tokens.colorNeutralForeground1
  },
  sub: {
    display: 'block',
    marginTop: tokens.spacingVerticalXS,
    maxWidth: '70ch',
    color: tokens.colorNeutralForeground2
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalS,
    rowGap: tokens.spacingVerticalS,
    flexWrap: 'wrap'
  },
  search: { flex: 1, minWidth: '200px' },
  scroll: {
    flex: '1 1 auto',
    minHeight: 0,
    overflowY: 'auto',
    ...shorthands.padding(0, '36px', '24px'),
    display: 'flex',
    flexDirection: 'column',
    rowGap: tokens.spacingVerticalL,
    scrollBehavior: 'smooth'
  },
  presetsRow: { paddingBottom: tokens.spacingVerticalS },
  grid: { display: 'flex', flexDirection: 'column', rowGap: tokens.spacingVerticalS },
  empty: {
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
    ...shorthands.padding('80px', 0),
    fontSize: tokens.fontSizeBase200
  },
  spin: {
    animationName: { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } },
    animationDuration: '900ms',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'linear'
  },
  segWrap: { marginBottom: tokens.spacingVerticalM }
});

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
  apps: 'Apps',
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
  apps: 'Install third-party software via winget, manage installed packages, and clean up Windows Store bloat.',
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
  const styles = useStyles();
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
    <FluentProvider theme={effectiveTheme === 'light' ? micaLightTheme : micaDarkTheme} className={styles.root}>
      <TitleBar />
      <main className={styles.main}>
        <Sidebar current={view} onChange={setView} />
        <section className={styles.content}>
          <header className={styles.top}>
            <div>
              <Title2 as="h1" className={styles.h1} block>{titles[view]}</Title2>
              {subtitles[view] && <Body1 className={styles.sub}>{subtitles[view]}</Body1>}
            </div>
            {showFilterRow && (
              <div className={styles.toolbar} role="toolbar" aria-label="Tweak filters">
                <SearchBox
                  className={styles.search}
                  placeholder="Filter tweaks…"
                  value={search}
                  onChange={(_, d) => setSearch(d.value)}
                />
                <Menu
                  checkedValues={{
                    filters: [
                      ...(hideApplied ? ['hideApplied'] : []),
                      ...(showModifiedOnly ? ['modifiedOnly'] : [])
                    ]
                  }}
                  onCheckedValueChange={(_, data) => {
                    if (data.name !== 'filters') return;
                    setHideApplied(data.checkedItems.includes('hideApplied'));
                    setShowModifiedOnly(data.checkedItems.includes('modifiedOnly'));
                  }}
                >
                  <MenuTrigger>
                    <Button
                      appearance="outline"
                      icon={<Filter20Regular />}
                      title="Filter tweaks"
                    >
                      Filter
                      {(hideApplied || showModifiedOnly) &&
                        ` · ${(hideApplied ? 1 : 0) + (showModifiedOnly ? 1 : 0)}`}
                    </Button>
                  </MenuTrigger>
                  <MenuPopover>
                    <MenuList>
                      <MenuItemCheckbox name="filters" value="hideApplied">
                        Hide applied
                      </MenuItemCheckbox>
                      <MenuItemCheckbox name="filters" value="modifiedOnly">
                        Modified only
                      </MenuItemCheckbox>
                    </MenuList>
                  </MenuPopover>
                </Menu>
                <Button
                  appearance="outline"
                  icon={<ArrowClockwise20Regular className={detecting ? styles.spin : undefined} />}
                  onClick={() => void refreshStates()}
                  disabled={detecting}
                  title="Re-scan the system to detect current tweak states"
                >
                  {detecting ? 'Scanning…' : 'Re-scan'}
                </Button>
              </div>
            )}
          </header>

          <div className={styles.scroll}>
            {view === 'dashboard' ? (
              <>
                <Dashboard />
                <div className={styles.presetsRow}><PresetChips /></div>
                {loading ? <Skeleton count={6} /> : (
                  <div className={styles.grid}>
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
              : view === 'apps' ? <Apps />
              : view === 'startup' ? <StartupApps />
              : view === 'hardware' ? <HardwarePanel />
              : view === 'drivers' ? <DriversPanel />
              : view === 'settings' ? <SettingsPanel />
              : view === 'activity' ? <ActivityPanel />
              : view === 'services' ? (
              <>
                <div className={styles.segWrap}>
                  <TabList
                    selectedValue={servicesTab}
                    onTabSelect={(_, d) => setServicesTab(d.value as 'curated' | 'browser')}
                  >
                    <Tab value="curated">Curated tweaks</Tab>
                    <Tab value="browser">All services</Tab>
                  </TabList>
                </div>
                {servicesTab === 'curated' ? (
                  <>
                    <div className={styles.presetsRow}><PresetChips /></div>
                    {loading ? <Skeleton count={4} /> : visibleTweaks.length === 0 ? (
                      <div className={styles.empty}><p>No service tweaks match your filter.</p></div>
                    ) : (
                      <div className={styles.grid}>
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
                <div className={styles.presetsRow}><PresetChips /></div>
                {loading ? <Skeleton count={5} /> : visibleTweaks.length === 0 ? (
                  <div className={styles.empty}>
                    <p>No tweaks match your filter in this category.</p>
                    {search && (
                      <Button appearance="transparent" onClick={() => setSearch('')}>
                        Clear filter
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className={styles.grid}>
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

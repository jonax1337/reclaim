import { useCallback, useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Card,
  Button,
  Checkbox,
  SearchBox,
  Tab,
  TabList,
  Title3,
  Body1,
  Caption1,
  PresenceBadge,
  Badge,
  Text,
  Tooltip,
  Spinner,
  makeStyles,
  mergeClasses,
  shorthands,
  tokens
} from '@fluentui/react-components';
import {
  ArrowClockwise16Regular,
  ArrowDownload16Regular,
  ArrowSync16Regular,
  Delete16Regular,
  Open16Regular,
  Box20Regular,
  Filter20Regular
} from '@fluentui/react-icons';
import { useTweaks } from '../stores/tweaks';

type TabKey = 'quick' | 'installed' | 'bloat';

interface UwpEntry {
  package: string;
  name: string;
  publisher: string;
  category: string;
  description: string;
  bloat: boolean;
  installed: boolean;
  version?: string | null;
  winget_id?: string | null;
}

const useStyles = makeStyles({
  tabs: { marginBottom: tokens.spacingVerticalL },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalM,
    rowGap: tokens.spacingVerticalS,
    flexWrap: 'wrap',
    marginBottom: tokens.spacingVerticalL
  },
  search: { flex: 1, minWidth: '200px' },
  meta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: tokens.spacingHorizontalS,
    color: tokens.colorNeutralForeground3,
    marginBottom: tokens.spacingVerticalM,
    flexWrap: 'wrap',
    rowGap: tokens.spacingVerticalS
  },
  selBlock: { display: 'inline-flex', alignItems: 'center', columnGap: tokens.spacingHorizontalS },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: tokens.spacingHorizontalM
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    rowGap: tokens.spacingVerticalS,
    ...shorthands.padding(tokens.spacingVerticalL, tokens.spacingHorizontalL),
    backgroundColor: tokens.colorNeutralBackground2
  },
  cardTop: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    columnGap: tokens.spacingHorizontalS
  },
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalS,
    minWidth: 0
  },
  desc: { color: tokens.colorNeutralForeground2 },
  actions: {
    display: 'flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalS,
    marginTop: 'auto',
    paddingTop: tokens.spacingVerticalS
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '20px 1fr auto',
    columnGap: tokens.spacingHorizontalM,
    alignItems: 'flex-start',
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalL),
    backgroundColor: tokens.colorNeutralBackground2
  },
  rowNoCheck: { gridTemplateColumns: '1fr auto' },
  selected: { boxShadow: `inset 0 0 0 1px ${tokens.colorBrandStroke1}` },
  info: { minWidth: 0, display: 'flex', flexDirection: 'column', rowGap: tokens.spacingVerticalXXS },
  head: { display: 'flex', alignItems: 'center', columnGap: tokens.spacingHorizontalS, flexWrap: 'wrap' },
  sub: {
    display: 'flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalXS,
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase100,
    flexWrap: 'wrap'
  },
  pkg: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    wordBreak: 'break-all'
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    rowGap: tokens.spacingVerticalS,
    ...shorthands.padding('64px', 0),
    color: tokens.colorNeutralForeground3,
    textAlign: 'center'
  },
  spin: {
    animationName: { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } },
    animationDuration: '900ms',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'linear'
  },
  lede: { color: tokens.colorNeutralForeground2, marginBottom: tokens.spacingVerticalS }
});

export function Apps() {
  const s = useStyles();
  const curatedApps = useTweaks((st) => st.apps);
  const toast = useTweaks((st) => st.toast);

  const [tab, setTab] = useState<TabKey>('quick');
  const [query, setQuery] = useState('');

  // winget state
  const [wingetInstalled, setWingetInstalled] = useState<Set<string>>(new Set());
  const [wingetScanned, setWingetScanned] = useState(false);
  const [wingetScanning, setWingetScanning] = useState(false);
  const [installing, setInstalling] = useState<Set<string>>(new Set());
  const [upgrading, setUpgrading] = useState<Set<string>>(new Set());

  // uwp state
  const [uwpApps, setUwpApps] = useState<UwpEntry[]>([]);
  const [uwpLoading, setUwpLoading] = useState(false);
  const [uwpBusy, setUwpBusy] = useState<Set<string>>(new Set());
  const [uwpSelected, setUwpSelected] = useState<Set<string>>(new Set());

  const scanWinget = useCallback(async () => {
    setWingetScanning(true);
    try {
      const list = await invoke<string[]>('list_winget_installed');
      setWingetInstalled(new Set(list));
      setWingetScanned(true);
    } catch (e) {
      toast({ kind: 'err', msg: `winget list failed: ${e}` });
    } finally {
      setWingetScanning(false);
    }
  }, [toast]);

  const loadUwp = useCallback(async () => {
    setUwpLoading(true);
    try {
      const result = await invoke<UwpEntry[]>('list_apps_inventory');
      setUwpApps(result);
    } catch (e) {
      toast({ kind: 'err', msg: `App inventory: ${e}` });
    } finally {
      setUwpLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void scanWinget();
    void loadUwp();
  }, [scanWinget, loadUwp]);

  // --- Quick install ---
  const quickCategories = useMemo(
    () => Array.from(new Set(curatedApps.map((a) => a.category))).sort(),
    [curatedApps]
  );
  const quickFiltered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return curatedApps;
    return curatedApps.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q)
    );
  }, [curatedApps, query]);

  // --- Installed (combined winget + uwp) ---
  type Combined =
    | { source: 'winget'; id: string; name: string; description: string; category: string; homepage?: string }
    | { source: 'uwp'; id: string; name: string; description: string; category: string; publisher: string; bloat: boolean };

  const installedCombined = useMemo<Combined[]>(() => {
    const out: Combined[] = [];
    for (const a of curatedApps) {
      if (wingetInstalled.has(a.id)) {
        out.push({
          source: 'winget',
          id: a.id,
          name: a.name,
          description: a.description,
          category: a.category,
          homepage: a.homepage ?? undefined
        });
      }
    }
    for (const a of uwpApps) {
      if (a.installed) {
        out.push({
          source: 'uwp',
          id: a.package,
          name: a.name,
          description: a.description,
          category: a.category || 'Store',
          publisher: a.publisher,
          bloat: a.bloat
        });
      }
    }
    return out.sort((x, y) => x.name.localeCompare(y.name));
  }, [curatedApps, wingetInstalled, uwpApps]);

  const installedFiltered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return installedCombined;
    return installedCombined.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q)
    );
  }, [installedCombined, query]);

  // --- Bloat ---
  const bloatList = useMemo(() => {
    const q = query.toLowerCase();
    return uwpApps.filter(
      (a) =>
        a.bloat &&
        (!q || a.name.toLowerCase().includes(q) || a.package.toLowerCase().includes(q))
    );
  }, [uwpApps, query]);

  // --- Mutations ---
  async function install(id: string) {
    setInstalling((p) => new Set(p).add(id));
    try {
      await invoke('install_winget_app', { id });
      toast({ kind: 'ok', msg: `Installed ${id}` });
      setWingetInstalled((p) => new Set(p).add(id));
    } catch (e) {
      toast({ kind: 'err', msg: `${id}: ${e}` });
    } finally {
      setInstalling((p) => { const n = new Set(p); n.delete(id); return n; });
    }
  }

  async function upgrade(id: string) {
    setUpgrading((p) => new Set(p).add(id));
    try {
      await invoke('upgrade_winget_app', { id });
      toast({ kind: 'ok', msg: `Upgraded ${id}` });
    } catch (e) {
      toast({ kind: 'err', msg: `${id}: ${e}` });
    } finally {
      setUpgrading((p) => { const n = new Set(p); n.delete(id); return n; });
    }
  }

  async function uninstallWinget(id: string) {
    setUpgrading((p) => new Set(p).add(id)); // re-use busy set for visual
    try {
      // No dedicated remove_winget_app command — fall back to winget directly via PowerShell.
      // For now, just inform.
      toast({ kind: 'info', msg: 'Removing winget apps not yet supported — use Windows Settings or "winget uninstall".' });
    } finally {
      setUpgrading((p) => { const n = new Set(p); n.delete(id); return n; });
    }
  }

  function markUwpBusy(pkg: string, on: boolean) {
    setUwpBusy((p) => { const n = new Set(p); on ? n.add(pkg) : n.delete(pkg); return n; });
  }

  async function removeUwp(pkg: string, name: string) {
    markUwpBusy(pkg, true);
    try {
      await invoke('remove_app_package', { package: pkg });
      setUwpApps((prev) => prev.map((a) => (a.package === pkg ? { ...a, installed: false } : a)));
      toast({
        kind: 'ok',
        msg: `Removed ${name}`,
        action: {
          label: 'Undo',
          run: async () => {
            const app = uwpApps.find((a) => a.package === pkg);
            await invoke('install_known_app', { package: pkg, wingetId: app?.winget_id });
            setUwpApps((prev) => prev.map((a) => (a.package === pkg ? { ...a, installed: true } : a)));
          }
        }
      });
    } catch (e) {
      toast({ kind: 'err', msg: `${name}: ${e}` });
    } finally {
      markUwpBusy(pkg, false);
    }
  }

  function toggleUwpSel(pkg: string) {
    setUwpSelected((p) => { const n = new Set(p); n.has(pkg) ? n.delete(pkg) : n.add(pkg); return n; });
  }

  async function batchRemoveBloat() {
    const list = bloatList.filter((a) => uwpSelected.has(a.package) && a.installed);
    if (list.length === 0) return;
    toast({ kind: 'info', msg: `Removing ${list.length} app${list.length === 1 ? '' : 's'}…` });
    let ok = 0, fail = 0;
    const removed: string[] = [];
    for (const a of list) {
      try { await invoke('remove_app_package', { package: a.package }); removed.push(a.package); ok++; }
      catch { fail++; }
    }
    setUwpApps((prev) => prev.map((a) => (removed.includes(a.package) ? { ...a, installed: false } : a)));
    setUwpSelected(new Set());
    toast({ kind: fail === 0 ? 'ok' : 'err', msg: `${ok} removed${fail > 0 ? `, ${fail} failed` : ''}.` });
  }

  function refresh() {
    void scanWinget();
    void loadUwp();
  }

  const scanning = wingetScanning || uwpLoading;

  return (
    <div>
      <TabList
        className={s.tabs}
        selectedValue={tab}
        onTabSelect={(_, d) => { setTab(d.value as TabKey); setUwpSelected(new Set()); }}
      >
        <Tab value="quick">Quick install</Tab>
        <Tab value="installed">
          Installed{wingetScanned ? ` (${installedCombined.length})` : ''}
        </Tab>
        <Tab value="bloat">
          Bloatware{uwpApps.length > 0 ? ` (${uwpApps.filter((a) => a.bloat && a.installed).length})` : ''}
        </Tab>
      </TabList>

      <div className={s.toolbar}>
        <SearchBox
          className={s.search}
          value={query}
          onChange={(_, d) => setQuery(d.value)}
          placeholder={
            tab === 'quick' ? 'Search apps to install…'
              : tab === 'installed' ? 'Search installed software…'
              : 'Search bloatware…'
          }
        />
        <Button
          appearance="outline"
          icon={<ArrowClockwise16Regular className={scanning ? s.spin : undefined} />}
          disabled={scanning}
          onClick={refresh}
        >
          Re-scan
        </Button>
      </div>

      {tab === 'quick' && (
        <QuickInstallView
          s={s}
          categories={quickCategories}
          filtered={quickFiltered}
          wingetInstalled={wingetInstalled}
          installing={installing}
          upgrading={upgrading}
          onInstall={install}
          onUpgrade={upgrade}
        />
      )}

      {tab === 'installed' && (
        <InstalledView
          s={s}
          loading={!wingetScanned && uwpLoading}
          list={installedFiltered}
          upgrading={upgrading}
          uwpBusy={uwpBusy}
          onUpgrade={upgrade}
          onRemoveUwp={removeUwp}
          onUninstallWinget={uninstallWinget}
        />
      )}

      {tab === 'bloat' && (
        <BloatView
          s={s}
          loading={uwpLoading && uwpApps.length === 0}
          list={bloatList}
          busy={uwpBusy}
          selected={uwpSelected}
          onToggleSel={toggleUwpSel}
          onClearSel={() => setUwpSelected(new Set())}
          onBatchRemove={batchRemoveBloat}
          onRemove={removeUwp}
        />
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────── Quick install
function QuickInstallView(props: {
  s: ReturnType<typeof useStyles>;
  categories: string[];
  filtered: ReturnType<typeof useTweaks.getState>['apps'];
  wingetInstalled: Set<string>;
  installing: Set<string>;
  upgrading: Set<string>;
  onInstall: (id: string) => void;
  onUpgrade: (id: string) => void;
}) {
  const { s, categories, filtered, wingetInstalled, installing, upgrading, onInstall, onUpgrade } = props;
  return (
    <>
      <Body1 className={s.lede}>
        Curated list installed via <code>winget</code>. Silent &amp; unattended.
      </Body1>
      {categories.map((cat) => {
        const list = filtered.filter((a) => a.category === cat);
        if (list.length === 0) return null;
        return (
          <div key={cat} style={{ display: 'flex', flexDirection: 'column', rowGap: 0, marginTop: 0 }}>
            <Title3 as="h3">{cat}</Title3>
            <div className={s.grid}>
              {list.map((app) => {
                const isInstalled = wingetInstalled.has(app.id);
                const isInstalling = installing.has(app.id);
                const isUpgrading = upgrading.has(app.id);
                return (
                  <Card key={app.id} className={s.card} appearance="filled-alternative">
                    <div className={s.cardTop}>
                      <div className={s.nameRow}>
                        {isInstalled && <PresenceBadge status="available" size="small" />}
                        <Text weight="semibold">{app.name}</Text>
                      </div>
                      {app.homepage && (
                        <Tooltip content="Open homepage" relationship="label">
                          <Button
                            appearance="subtle"
                            size="small"
                            icon={<Open16Regular />}
                            as="a"
                            href={app.homepage}
                            target="_blank"
                            rel="noreferrer noopener"
                          />
                        </Tooltip>
                      )}
                    </div>
                    <Caption1 className={s.desc}>{app.description}</Caption1>
                    <div className={s.actions}>
                      {isInstalled ? (
                        <Button
                          appearance="primary"
                          icon={<ArrowSync16Regular />}
                          disabled={isUpgrading}
                          onClick={() => onUpgrade(app.id)}
                        >
                          {isUpgrading ? 'Updating…' : 'Update'}
                        </Button>
                      ) : (
                        <Button
                          appearance="primary"
                          icon={<ArrowDownload16Regular />}
                          disabled={isInstalling}
                          onClick={() => onInstall(app.id)}
                        >
                          {isInstalling ? 'Installing…' : 'Install'}
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}

// ───────────────────────────────────────────────────────────── Installed (combined)
type CombinedItem =
  | { source: 'winget'; id: string; name: string; description: string; category: string; homepage?: string }
  | { source: 'uwp'; id: string; name: string; description: string; category: string; publisher: string; bloat: boolean };

function InstalledView(props: {
  s: ReturnType<typeof useStyles>;
  loading: boolean;
  list: CombinedItem[];
  upgrading: Set<string>;
  uwpBusy: Set<string>;
  onUpgrade: (id: string) => void;
  onRemoveUwp: (pkg: string, name: string) => void;
  onUninstallWinget: (id: string) => void;
}) {
  const { s, loading, list, upgrading, uwpBusy, onUpgrade, onRemoveUwp, onUninstallWinget } = props;

  if (loading) {
    return (
      <div className={s.empty}>
        <Spinner size="small" />
        <Text>Scanning installed software…</Text>
      </div>
    );
  }
  if (list.length === 0) {
    return (
      <div className={s.empty}>
        <Box20Regular />
        <Text weight="semibold">Nothing installed matches.</Text>
        <Caption1>Adjust the search or visit Quick install.</Caption1>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', rowGap: 8 }}>
      {list.map((a) => {
        const isWinget = a.source === 'winget';
        const isUpgrading = isWinget && upgrading.has(a.id);
        const isBusy = !isWinget && uwpBusy.has(a.id);
        return (
          <Card key={`${a.source}:${a.id}`} className={mergeClasses(s.row, s.rowNoCheck)} appearance="filled-alternative">
            <div className={s.info}>
              <div className={s.head}>
                <PresenceBadge status="available" size="small" />
                <Text weight="semibold">{a.name}</Text>
                <Badge appearance="tint" color={isWinget ? 'brand' : 'informative'} size="small">
                  {isWinget ? 'winget' : 'Store'}
                </Badge>
                {!isWinget && a.bloat && <Badge appearance="tint" color="warning" size="small">bloat</Badge>}
              </div>
              <div className={s.sub}>
                <code className={s.pkg}>{a.id}</code>
                {!isWinget && a.publisher && <><span>·</span><span>{a.publisher}</span></>}
                <span>·</span><span>{a.category}</span>
              </div>
              {a.description && <Caption1 style={{ color: 'inherit', marginTop: 4 }}>{a.description}</Caption1>}
            </div>
            <div className={s.actions}>
              {isWinget ? (
                <>
                  <Button
                    appearance="primary"
                    icon={<ArrowSync16Regular />}
                    disabled={isUpgrading}
                    onClick={() => onUpgrade(a.id)}
                  >
                    {isUpgrading ? 'Updating…' : 'Update'}
                  </Button>
                  {a.homepage && (
                    <Tooltip content="Open homepage" relationship="label">
                      <Button
                        appearance="subtle"
                        icon={<Open16Regular />}
                        as="a"
                        href={a.homepage}
                        target="_blank"
                        rel="noreferrer noopener"
                      />
                    </Tooltip>
                  )}
                </>
              ) : (
                <Button
                  appearance="secondary"
                  icon={<Delete16Regular />}
                  disabled={isBusy}
                  onClick={() => onRemoveUwp(a.id, a.name)}
                >
                  Remove
                </Button>
              )}
            </div>
          </Card>
        );
      })}
      {/* Reference suppression — onUninstallWinget kept for future winget-remove command. */}
      <span style={{ display: 'none' }}>{String(typeof onUninstallWinget)}</span>
    </div>
  );
}

// ───────────────────────────────────────────────────────────── Bloatware
function BloatView(props: {
  s: ReturnType<typeof useStyles>;
  loading: boolean;
  list: UwpEntry[];
  busy: Set<string>;
  selected: Set<string>;
  onToggleSel: (pkg: string) => void;
  onClearSel: () => void;
  onBatchRemove: () => void;
  onRemove: (pkg: string, name: string) => void;
}) {
  const { s, loading, list, busy, selected, onToggleSel, onClearSel, onBatchRemove, onRemove } = props;

  if (loading) {
    return (
      <div className={s.empty}>
        <Spinner size="small" />
        <Text>Loading AppX inventory…</Text>
      </div>
    );
  }
  if (list.length === 0) {
    return (
      <div className={s.empty}>
        <Filter20Regular />
        <Text weight="semibold">No bloatware detected.</Text>
        <Caption1>Either everything's already gone or your install was clean to begin with.</Caption1>
      </div>
    );
  }
  return (
    <>
      <Body1 className={s.lede}>
        Pre-installed Windows Store apps flagged as low-value. Tick the ones you want gone and remove in bulk.
      </Body1>
      <div className={s.meta}>
        <Caption1>{list.length} bloat app{list.length === 1 ? '' : 's'}</Caption1>
        {selected.size > 0 ? (
          <span className={s.selBlock}>
            <Caption1>{selected.size} selected</Caption1>
            <Button appearance="subtle" size="small" onClick={onClearSel}>Clear</Button>
            <Button appearance="primary" size="small" icon={<Delete16Regular />} onClick={onBatchRemove}>
              Remove selected
            </Button>
          </span>
        ) : null}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', rowGap: 8 }}>
        {list.map((app) => {
          const isBusy = busy.has(app.package);
          const isSel = selected.has(app.package);
          return (
            <Card
              key={app.package}
              className={mergeClasses(s.row, isSel && s.selected)}
              appearance="filled-alternative"
            >
              <Checkbox
                checked={isSel}
                onChange={() => onToggleSel(app.package)}
                aria-label={`Select ${app.name}`}
                disabled={!app.installed}
              />
              <div className={s.info}>
                <div className={s.head}>
                  <Text weight="semibold">{app.name}</Text>
                  {!app.installed && <Badge appearance="outline" size="small">removed</Badge>}
                </div>
                <div className={s.sub}>
                  <code className={s.pkg}>{app.package}</code>
                  {app.version && <><span>·</span><span>v{app.version}</span></>}
                  {app.publisher && <><span>·</span><span>{app.publisher}</span></>}
                </div>
                {app.description && <Caption1 style={{ color: 'inherit', marginTop: 4 }}>{app.description}</Caption1>}
              </div>
              <div className={s.actions}>
                {app.installed && (
                  <Button
                    appearance="secondary"
                    icon={<Delete16Regular />}
                    disabled={isBusy}
                    onClick={() => onRemove(app.package, app.name)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}

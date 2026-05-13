import { useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Card,
  Button,
  Checkbox,
  SearchBox,
  Select,
  TabList,
  Tab,
  Title3,
  Caption1,
  Text,
  Badge,
  Tooltip,
  MessageBar,
  MessageBarBody,
  makeStyles,
  mergeClasses,
  shorthands,
  tokens
} from '@fluentui/react-components';
import {
  Desktop20Regular,
  ArrowDownload16Regular,
  ArrowClockwise16Regular,
  Open16Regular,
  SearchSquare16Regular,
  CubeAdd20Regular,
  ShieldError20Regular
} from '@fluentui/react-icons';
import { useTweaks } from '../stores/tweaks';

interface Gpu {
  name: string;
  driver_version: string;
  driver_date: string;
  vram_gb: number;
  vendor: string;
}
interface InstalledDriver {
  device: string;
  class: string;
  manufacturer: string;
  provider: string;
  version: string;
  date: string;
  status: string;
}
interface DriverUpdate {
  id: string;
  title: string;
  size_mb: number;
  driver_class: string;
  driver_date: string;
  driver_version: string;
  manufacturer: string;
  is_mandatory: boolean;
}

type TabKind = 'gpu' | 'all' | 'updates';

const vendorTools: Record<string, { wingetId: string; label: string; download: string }> = {
  NVIDIA: {
    wingetId: 'Nvidia.GeForceExperience',
    label: 'GeForce Experience',
    download: 'https://www.nvidia.com/Download/index.aspx'
  },
  AMD: {
    wingetId: 'AdvancedMicroDevices.AMDSoftwareAdrenalinEdition',
    label: 'AMD Adrenalin',
    download: 'https://www.amd.com/en/support'
  },
  Intel: {
    wingetId: 'Intel.IntelDriverAndSupportAssistant',
    label: 'Intel Driver Assistant',
    download: 'https://www.intel.com/content/www/us/en/support/detect.html'
  }
};

function vendorBadgeColor(v: string): 'success' | 'danger' | 'informative' | 'subtle' {
  if (v === 'NVIDIA') return 'success';
  if (v === 'AMD') return 'danger';
  if (v === 'Intel') return 'informative';
  return 'subtle';
}

function driverAgeDays(date: string): number | null {
  if (!date) return null;
  const t = Date.parse(date);
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86400000);
}

const useStyles = makeStyles({
  tabs: { marginBottom: tokens.spacingVerticalL },
  hdr: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    columnGap: tokens.spacingHorizontalS,
    marginBottom: tokens.spacingVerticalM,
    flexWrap: 'wrap',
    rowGap: tokens.spacingVerticalS
  },
  metaInline: { marginRight: 'auto', color: tokens.colorNeutralForeground3 },
  spin: {
    animationName: { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } },
    animationDuration: '900ms',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'linear'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: tokens.spacingHorizontalL
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    rowGap: tokens.spacingVerticalS,
    ...shorthands.padding(tokens.spacingVerticalL, tokens.spacingHorizontalL),
    backgroundColor: tokens.colorNeutralBackground2
  },
  cardHead: {
    display: 'flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalS
  },
  cardTitle: { margin: 0, flex: 1 },
  dl: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    columnGap: tokens.spacingHorizontalL,
    rowGap: tokens.spacingVerticalXS,
    margin: 0
  },
  dt: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  dd: { margin: 0, color: tokens.colorNeutralForeground1, fontSize: tokens.fontSizeBase200 },
  age: { color: tokens.colorNeutralForeground3 },
  stale: { color: tokens.colorStatusWarningForeground1, fontWeight: tokens.fontWeightSemibold },
  cardFooter: {
    display: 'flex',
    columnGap: tokens.spacingHorizontalS,
    marginTop: 'auto',
    flexWrap: 'wrap',
    rowGap: tokens.spacingVerticalS
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
  actionBar: {
    display: 'flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalS,
    marginBottom: tokens.spacingVerticalM,
    flexWrap: 'wrap',
    rowGap: tokens.spacingVerticalS
  },
  spacer: { flex: 1 },
  updList: { display: 'flex', flexDirection: 'column', rowGap: tokens.spacingVerticalS },
  upd: {
    display: 'grid',
    gridTemplateColumns: '20px 1fr',
    columnGap: tokens.spacingHorizontalM,
    alignItems: 'flex-start',
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalL),
    backgroundColor: tokens.colorNeutralBackground2
  },
  updSelected: { boxShadow: `inset 0 0 0 1px ${tokens.colorBrandStroke1}` },
  updMeta: { display: 'flex', flexDirection: 'column', rowGap: tokens.spacingVerticalXXS },
  updSub: {
    display: 'flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalXS,
    flexWrap: 'wrap',
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase100
  },
  tag: {
    ...shorthands.padding('1px', '7px'),
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusSmall
  },
  mandatory: {
    color: tokens.colorStatusWarningForeground1,
    fontWeight: tokens.fontWeightSemibold
  },
  filterRow: {
    display: 'flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalS,
    marginBottom: tokens.spacingVerticalS,
    flexWrap: 'wrap',
    rowGap: tokens.spacingVerticalS
  },
  search: { flex: 1, minWidth: '200px' },
  count: { display: 'block', color: tokens.colorNeutralForeground3, marginBottom: tokens.spacingVerticalM },
  table: {
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    overflow: 'hidden',
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2)
  },
  thead: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1.4fr 1fr 1.2fr',
    columnGap: tokens.spacingHorizontalM,
    ...shorthands.padding(tokens.spacingVerticalSNudge, tokens.spacingHorizontalL),
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: tokens.colorNeutralStroke2,
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightMedium,
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  trow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1.4fr 1fr 1.2fr',
    columnGap: tokens.spacingHorizontalM,
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalL),
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: tokens.colorNeutralStroke2,
    fontSize: tokens.fontSizeBase200,
    ':last-child': { borderBottomStyle: 'none' },
    ':hover': { backgroundColor: tokens.colorNeutralBackground2Hover }
  },
  trunc: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  ver: { fontFamily: tokens.fontFamilyMonospace, color: tokens.colorNeutralForeground2 },
  loading: { color: tokens.colorNeutralForeground3 },
  warnMsg: { marginTop: tokens.spacingVerticalS }
});

export function DriversPanel() {
  const s = useStyles();
  const toast = useTweaks((s) => s.toast);
  const [tab, setTab] = useState<TabKind>('gpu');

  // GPU section
  const [gpus, setGpus] = useState<Gpu[]>([]);
  const [installing, setInstalling] = useState<Set<string>>(new Set());
  const [loadingGpu, setLoadingGpu] = useState(false);

  // All Drivers
  const [drivers, setDrivers] = useState<InstalledDriver[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [queryAll, setQueryAll] = useState('');
  const [classFilter, setClassFilter] = useState('all');

  // WU updates
  const [updates, setUpdates] = useState<DriverUpdate[]>([]);
  const [scanning, setScanning] = useState(false);
  const [installingAll, setInstallingAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastScan, setLastScan] = useState<Date | null>(null);

  async function loadGpus() {
    setLoadingGpu(true);
    try {
      const info = await invoke<{ gpus?: Gpu[] }>('hardware_info');
      setGpus(info.gpus ?? []);
    } catch (e) {
      toast({ kind: 'err', msg: `${e}` });
    } finally {
      setLoadingGpu(false);
    }
  }

  async function loadAll() {
    setLoadingAll(true);
    try {
      const res = await invoke<InstalledDriver[]>('list_drivers');
      setDrivers(res);
    } catch (e) {
      toast({ kind: 'err', msg: `${e}` });
    } finally {
      setLoadingAll(false);
    }
  }

  useEffect(() => {
    void loadGpus();
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const classes = useMemo(
    () => ['all', ...Array.from(new Set(drivers.map((d) => d.class).filter(Boolean))).sort()],
    [drivers]
  );

  const driversFiltered = useMemo(() => {
    const q = queryAll.toLowerCase();
    return drivers.filter((d) => {
      if (classFilter !== 'all' && d.class !== classFilter) return false;
      if (q && !d.device.toLowerCase().includes(q) && !d.provider.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [drivers, queryAll, classFilter]);

  async function scan() {
    setScanning(true);
    try {
      const res = await invoke<DriverUpdate[]>('scan_driver_updates');
      setUpdates(res);
      setLastScan(new Date());
      toast({
        kind: res.length > 0 ? 'info' : 'ok',
        msg: res.length > 0
          ? `${res.length} driver update${res.length === 1 ? '' : 's'} available.`
          : 'No driver updates pending.'
      });
    } catch (e) {
      toast({ kind: 'err', msg: `Driver scan: ${e}` });
    } finally {
      setScanning(false);
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(updates.map((u) => u.id)));
  }

  async function installSelected() {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setInstallingAll(true);
    toast({
      kind: 'info',
      msg: `Downloading & installing ${ids.length} driver${ids.length === 1 ? '' : 's'}… (this can take a while)`
    });
    try {
      const r = await invoke<{ message: string; installed: number; failed: number; reboot_required: boolean }>(
        'install_driver_updates',
        { ids }
      );
      toast({
        kind: r.failed === 0 ? 'ok' : 'err',
        msg: `${r.message}. Installed ${r.installed}, failed ${r.failed}.${r.reboot_required ? ' Reboot required.' : ''}`,
        ttl: 12000
      });
      setSelectedIds(new Set());
      await scan();
    } catch (e) {
      toast({ kind: 'err', msg: `Driver install: ${e}` });
    } finally {
      setInstallingAll(false);
    }
  }

  async function installVendor(vendor: string) {
    const tool = vendorTools[vendor];
    if (!tool) return;
    setInstalling((prev) => {
      const n = new Set(prev);
      n.add(vendor);
      return n;
    });
    try {
      toast({ kind: 'info', msg: `Installing ${tool.label}…` });
      await invoke('install_winget_app', { id: tool.wingetId });
      toast({ kind: 'ok', msg: `Installed ${tool.label}` });
    } catch (e) {
      toast({ kind: 'err', msg: `${tool.label}: ${e}` });
    } finally {
      setInstalling((prev) => {
        const n = new Set(prev);
        n.delete(vendor);
        return n;
      });
    }
  }

  return (
    <div>
      <div className={s.tabs}>
        <TabList selectedValue={tab} onTabSelect={(_, d) => setTab(d.value as TabKind)}>
          <Tab value="gpu" icon={<Desktop20Regular />}>GPUs</Tab>
          <Tab value="updates" icon={<CubeAdd20Regular />}>
            Driver Updates{updates.length > 0 ? ` (${updates.length})` : ''}
          </Tab>
          <Tab value="all">All Drivers</Tab>
        </TabList>
      </div>

      {tab === 'gpu' && (
        <>
          <div className={s.hdr}>
            <Button
              appearance="outline"
              icon={<ArrowClockwise16Regular className={loadingGpu ? s.spin : undefined} />}
              onClick={() => void loadGpus()}
            >
              Reload
            </Button>
          </div>

          {gpus.length === 0 && !loadingGpu ? (
            <p className={s.loading}>No GPUs reported.</p>
          ) : (
            <div className={s.grid}>
              {gpus.map((gpu) => {
                const age = driverAgeDays(gpu.driver_date);
                const tool = vendorTools[gpu.vendor];
                return (
                  <Card key={gpu.name} className={s.card} appearance="filled-alternative">
                    <div className={s.cardHead}>
                      <Desktop20Regular />
                      <Title3 as="h3" className={s.cardTitle}>{gpu.name}</Title3>
                      <Badge appearance="tint" color={vendorBadgeColor(gpu.vendor)}>{gpu.vendor}</Badge>
                    </div>
                    <dl className={s.dl}>
                      {gpu.vram_gb > 0 && (
                        <>
                          <dt className={s.dt}>VRAM</dt>
                          <dd className={s.dd}>{gpu.vram_gb} GB</dd>
                        </>
                      )}
                      <dt className={s.dt}>Driver</dt>
                      <dd className={s.dd}>{gpu.driver_version}</dd>
                      <dt className={s.dt}>Released</dt>
                      <dd className={s.dd}>
                        {gpu.driver_date || '—'}
                        {age !== null && (
                          <span className={mergeClasses(s.age, age > 180 && s.stale)}> · {age}d ago</span>
                        )}
                      </dd>
                    </dl>
                    {age !== null && age > 180 && (
                      <MessageBar intent="warning" className={s.warnMsg}>
                        <MessageBarBody>Driver is over 6 months old. Consider updating.</MessageBarBody>
                      </MessageBar>
                    )}
                    {tool && (
                      <div className={s.cardFooter}>
                        <Button
                          appearance="primary"
                          icon={<ArrowDownload16Regular />}
                          disabled={installing.has(gpu.vendor)}
                          onClick={() => void installVendor(gpu.vendor)}
                        >
                          {installing.has(gpu.vendor) ? 'Installing…' : `Install ${tool.label}`}
                        </Button>
                        <Button
                          appearance="subtle"
                          icon={<Open16Regular />}
                          as="a"
                          href={tool.download}
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          Manual download
                        </Button>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === 'updates' && (
        <>
          <div className={s.hdr}>
            {lastScan && (
              <Caption1 className={s.metaInline}>Last scan: {lastScan.toLocaleTimeString()}</Caption1>
            )}
            <Button
              appearance="outline"
              icon={<SearchSquare16Regular className={scanning ? s.spin : undefined} />}
              disabled={scanning || installingAll}
              onClick={() => void scan()}
            >
              {scanning ? 'Scanning…' : 'Scan for updates'}
            </Button>
          </div>

          {updates.length > 0 ? (
            <>
              <div className={s.actionBar}>
                <Caption1>{selectedIds.size} of {updates.length} selected</Caption1>
                <Button appearance="subtle" size="small" onClick={selectAll}>Select all</Button>
                <Button appearance="subtle" size="small" onClick={() => setSelectedIds(new Set())}>Clear</Button>
                <span className={s.spacer} />
                <Button
                  appearance="primary"
                  icon={<ArrowDownload16Regular className={installingAll ? s.spin : undefined} />}
                  disabled={selectedIds.size === 0 || installingAll}
                  onClick={() => void installSelected()}
                >
                  {installingAll ? 'Installing…' : `Install ${selectedIds.size}`}
                </Button>
              </div>

              <div className={s.updList}>
                {updates.map((u) => {
                  const sel = selectedIds.has(u.id);
                  return (
                    <Card
                      key={u.id}
                      className={mergeClasses(s.upd, sel && s.updSelected)}
                      appearance="filled-alternative"
                    >
                      <Checkbox
                        checked={sel}
                        onChange={() => toggleSelected(u.id)}
                        aria-label={u.title}
                      />
                      <div className={s.updMeta}>
                        <Text weight="semibold">{u.title}</Text>
                        <div className={s.updSub}>
                          {u.manufacturer && <span>{u.manufacturer}</span>}
                          {u.driver_class && (
                            <><span>·</span><span className={s.tag}>{u.driver_class}</span></>
                          )}
                          {u.driver_version && (
                            <><span>·</span><span>v{u.driver_version}</span></>
                          )}
                          {u.driver_date && (
                            <><span>·</span><span>{u.driver_date}</span></>
                          )}
                          <span>·</span>
                          <span>{u.size_mb} MB</span>
                          {u.is_mandatory && <span className={s.mandatory}>Mandatory</span>}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          ) : !scanning && lastScan ? (
            <div className={s.empty}>
              <ShieldError20Regular />
              <Text weight="semibold">No driver updates pending.</Text>
              <Caption1>Run a scan again later if you've installed new hardware.</Caption1>
            </div>
          ) : (
            !scanning && (
              <div className={s.empty}>
                <CubeAdd20Regular />
                <Text weight="semibold">Scan for driver updates.</Text>
                <Caption1>This contacts Windows Update directly. No third-party tools.</Caption1>
              </div>
            )
          )}
        </>
      )}

      {tab === 'all' && (
        <>
          <div className={s.filterRow}>
            <SearchBox
              className={s.search}
              value={queryAll}
              onChange={(_, d) => setQueryAll(d.value)}
              placeholder="Filter by device or provider…"
            />
            <Select value={classFilter} onChange={(_, d) => setClassFilter(d.value)}>
              {classes.map((c) => (
                <option key={c} value={c}>{c === 'all' ? 'All classes' : c}</option>
              ))}
            </Select>
            <Button
              appearance="outline"
              icon={<ArrowClockwise16Regular className={loadingAll ? s.spin : undefined} />}
              onClick={() => void loadAll()}
            >
              Reload
            </Button>
          </div>
          <Caption1 className={s.count}>{driversFiltered.length} of {drivers.length}</Caption1>

          <div className={s.table}>
            <div className={s.thead}>
              <span>Device</span>
              <span>Class</span>
              <span>Provider</span>
              <span>Version</span>
              <span>Date</span>
            </div>
            {driversFiltered.map((d) => {
              const age = driverAgeDays(d.date);
              return (
                <div key={d.device + d.version} className={s.trow}>
                  <Tooltip content={d.device} relationship="label">
                    <span className={s.trunc}>{d.device}</span>
                  </Tooltip>
                  <span className={s.trunc}>{d.class || '—'}</span>
                  <span className={s.trunc}>{d.provider}</span>
                  <span className={s.ver}>{d.version}</span>
                  <span>
                    {d.date || '—'}
                    {age !== null && (
                      <span className={mergeClasses(s.age, age > 365 && s.stale)}> ({age}d)</span>
                    )}
                  </span>
                </div>
              );
            })}
            {driversFiltered.length === 0 && !loadingAll && (
              <p className={s.empty}>No drivers match this filter.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

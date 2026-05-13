import { useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Button,
  SearchBox,
  Select,
  TabList,
  Tab,
  Caption1,
  PresenceBadge,
  Text,
  Tooltip,
  makeStyles,
  mergeClasses,
  shorthands,
  tokens
} from '@fluentui/react-components';
import {
  ArrowClockwise16Regular,
  Play16Regular,
  Stop16Regular
} from '@fluentui/react-icons';
import { useTweaks } from '../stores/tweaks';

interface ServiceInfo {
  name: string;
  display_name: string;
  status: string;
  startup: string;
}

type FilterStatus = 'all' | 'running' | 'stopped';

const startupOptions = ['Automatic', 'Manual', 'Disabled'];
const filterTabs: FilterStatus[] = ['all', 'running', 'stopped'];

const useStyles = makeStyles({
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalS,
    marginBottom: tokens.spacingVerticalS,
    flexWrap: 'wrap',
    rowGap: tokens.spacingVerticalS
  },
  search: { width: '320px' },
  spin: {
    animationName: { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } },
    animationDuration: '900ms',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'linear'
  },
  meta: { color: tokens.colorNeutralForeground3, marginBottom: tokens.spacingVerticalM },
  table: {
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    overflow: 'hidden',
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2)
  },
  thead: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1.2fr auto',
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
  row: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1.2fr auto',
    columnGap: tokens.spacingHorizontalM,
    alignItems: 'center',
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalL),
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: tokens.colorNeutralStroke2,
    ':last-child': { borderBottomStyle: 'none' },
    ':hover': { backgroundColor: tokens.colorNeutralBackground2Hover }
  },
  busy: { opacity: 0.55 },
  ta_r: { textAlign: 'right' },
  name: { display: 'flex', flexDirection: 'column', rowGap: '2px', minWidth: 0 },
  id: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3
  },
  status: {
    display: 'inline-flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalXS,
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: tokens.colorNeutralForeground4
  },
  dotRun: { backgroundColor: tokens.colorPaletteGreenForeground1 },
  empty: {
    ...shorthands.padding(tokens.spacingVerticalXXL, 0),
    textAlign: 'center',
    color: tokens.colorNeutralForeground3
  }
});

export function ServiceBrowser() {
  const s = useStyles();
  const toast = useTweaks((s) => s.toast);
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [busy, setBusy] = useState<Set<string>>(new Set());

  async function load() {
    setLoading(true);
    try {
      const res = await invoke<ServiceInfo[]>('list_services');
      setServices(res);
    } catch (e) {
      toast({ kind: 'err', msg: `Could not load services: ${e}` });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return services.filter((s) => {
      if (filterStatus === 'running' && s.status.toLowerCase() !== 'running') return false;
      if (filterStatus === 'stopped' && s.status.toLowerCase() === 'running') return false;
      if (q && !s.name.toLowerCase().includes(q) && !s.display_name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [services, query, filterStatus]);

  function setBusyState(name: string, on: boolean) {
    setBusy((prev) => {
      const n = new Set(prev);
      if (on) n.add(name);
      else n.delete(name);
      return n;
    });
  }

  function patch(name: string, patchObj: Partial<ServiceInfo>) {
    setServices((prev) => prev.map((s) => (s.name === name ? { ...s, ...patchObj } : s)));
  }

  async function changeStartup(svc: ServiceInfo, value: string) {
    setBusyState(svc.name, true);
    try {
      await invoke('set_service_startup', { name: svc.name, startup: value });
      patch(svc.name, { startup: value });
      toast({ kind: 'ok', msg: `${svc.display_name || svc.name} → ${value}` });
    } catch (e) {
      toast({ kind: 'err', msg: `${svc.name}: ${e}` });
    } finally {
      setBusyState(svc.name, false);
    }
  }

  async function startSvc(svc: ServiceInfo) {
    setBusyState(svc.name, true);
    try {
      await invoke('start_service', { name: svc.name });
      patch(svc.name, { status: 'Running' });
      toast({ kind: 'ok', msg: `Started ${svc.name}` });
    } catch (e) {
      toast({ kind: 'err', msg: `${svc.name}: ${e}` });
    } finally {
      setBusyState(svc.name, false);
    }
  }

  async function stopSvc(svc: ServiceInfo) {
    setBusyState(svc.name, true);
    try {
      await invoke('stop_service', { name: svc.name });
      patch(svc.name, { status: 'Stopped' });
      toast({ kind: 'ok', msg: `Stopped ${svc.name}` });
    } catch (e) {
      toast({ kind: 'err', msg: `${svc.name}: ${e}` });
    } finally {
      setBusyState(svc.name, false);
    }
  }

  return (
    <div>
      <div className={s.toolbar}>
        <SearchBox
          className={s.search}
          value={query}
          onChange={(_, d) => setQuery(d.value)}
          placeholder="Filter by name or display name…"
        />
        <TabList
          selectedValue={filterStatus}
          onTabSelect={(_, d) => setFilterStatus(d.value as FilterStatus)}
          size="small"
        >
          {filterTabs.map((f) => (
            <Tab key={f} value={f} style={{ textTransform: 'capitalize' }}>{f}</Tab>
          ))}
        </TabList>
        <Tooltip content="Reload" relationship="label">
          <Button
            appearance="subtle"
            icon={<ArrowClockwise16Regular className={loading ? s.spin : undefined} />}
            onClick={() => void load()}
          />
        </Tooltip>
      </div>

      <Caption1 className={s.meta}>
        {filtered.length} of {services.length} service{services.length === 1 ? '' : 's'}
      </Caption1>

      <div className={s.table}>
        <div className={s.thead}>
          <span>Service</span>
          <span>Status</span>
          <span>Startup</span>
          <span className={s.ta_r}>Actions</span>
        </div>

        {filtered.map((svc) => {
          const isRunning = svc.status.toLowerCase() === 'running';
          const isBusy = busy.has(svc.name);
          const hasCustomStartup = !startupOptions.includes(svc.startup);
          return (
            <div key={svc.name} className={mergeClasses(s.row, isBusy && s.busy)}>
              <div className={s.name}>
                <Text weight="medium">{svc.display_name || svc.name}</Text>
                <code className={s.id}>{svc.name}</code>
              </div>
              <span className={s.status}>
                <PresenceBadge status={isRunning ? 'available' : 'offline'} size="small" />
                {svc.status}
              </span>
              <Select
                value={svc.startup}
                disabled={isBusy}
                onChange={(_, d) => void changeStartup(svc, d.value)}
                size="small"
              >
                {startupOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
                {hasCustomStartup && <option value={svc.startup}>{svc.startup}</option>}
              </Select>
              <span className={s.ta_r}>
                <Tooltip content={isRunning ? 'Stop' : 'Start'} relationship="label">
                  <Button
                    appearance="subtle"
                    size="small"
                    icon={isRunning ? <Stop16Regular /> : <Play16Regular />}
                    disabled={isBusy}
                    onClick={() => void (isRunning ? stopSvc(svc) : startSvc(svc))}
                  />
                </Tooltip>
              </span>
            </div>
          );
        })}

        {filtered.length === 0 && !loading && (
          <p className={s.empty}>No services match your filter.</p>
        )}
      </div>
    </div>
  );
}

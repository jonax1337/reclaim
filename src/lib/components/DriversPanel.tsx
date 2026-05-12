import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Icon } from './Icon';
import { useTweaks } from '../stores/tweaks';
import './DriversPanel.css';

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

type Tab = 'gpu' | 'all' | 'updates';

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

function vendorColor(v: string) {
  if (v === 'NVIDIA') return '#76b900';
  if (v === 'AMD') return '#ed1c24';
  if (v === 'Intel') return '#0071c5';
  return 'var(--accent-default)';
}

function driverAgeDays(date: string): number | null {
  if (!date) return null;
  const t = Date.parse(date);
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86400000);
}

export function DriversPanel() {
  const toast = useTweaks((s) => s.toast);
  const [tab, setTab] = useState<Tab>('gpu');

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
        msg:
          res.length > 0
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
    <div className="drivers-panel">
      <div className="tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'gpu'}
          className={tab === 'gpu' ? 'active' : ''}
          onClick={() => setTab('gpu')}
        >
          <Icon name="Monitor" size={13} /> GPUs
        </button>
        <button
          role="tab"
          aria-selected={tab === 'updates'}
          className={tab === 'updates' ? 'active' : ''}
          onClick={() => setTab('updates')}
        >
          <Icon name="PackagePlus" size={13} /> Driver Updates
          {updates.length > 0 && <span className="badge">{updates.length}</span>}
        </button>
        <button
          role="tab"
          aria-selected={tab === 'all'}
          className={tab === 'all' ? 'active' : ''}
          onClick={() => setTab('all')}
        >
          <Icon name="Filter" size={13} /> All Drivers
        </button>
      </div>

      {tab === 'gpu' && (
        <>
          <div className="hdr">
            <p className="lede">
              Driver versions detected via WMI. The vendor's own updater is the safest path —
              use the "Driver Updates" tab to pull updates from Windows Update without leaving the app.
            </p>
            <button className="refresh" onClick={() => void loadGpus()}>
              <Icon name="RefreshCw" size={13} className={loadingGpu ? 'spin' : ''} /> Reload
            </button>
          </div>

          {gpus.length === 0 && !loadingGpu ? (
            <p className="loading">No GPUs reported.</p>
          ) : (
            <div className="grid">
              {gpus.map((gpu) => {
                const age = driverAgeDays(gpu.driver_date);
                const tool = vendorTools[gpu.vendor];
                return (
                  <article
                    key={gpu.name}
                    className="gpucard"
                    style={{ ['--c' as any]: vendorColor(gpu.vendor) } as CSSProperties}
                  >
                    <header>
                      <Icon name="Monitor" size={16} />
                      <h3>{gpu.name}</h3>
                      <span className="vendor-pill">{gpu.vendor}</span>
                    </header>
                    <dl>
                      {gpu.vram_gb > 0 && (
                        <>
                          <dt>VRAM</dt>
                          <dd>{gpu.vram_gb} GB</dd>
                        </>
                      )}
                      <dt>Driver</dt>
                      <dd>{gpu.driver_version}</dd>
                      <dt>Released</dt>
                      <dd>
                        {gpu.driver_date || '—'}
                        {age !== null && (
                          <span className={`age${age > 180 ? ' stale' : ''}`}> · {age}d ago</span>
                        )}
                      </dd>
                    </dl>
                    {age !== null && age > 180 && (
                      <p className="warn">Driver is over 6 months old. Consider updating.</p>
                    )}
                    {tool && (
                      <footer>
                        <button
                          className="primary"
                          disabled={installing.has(gpu.vendor)}
                          onClick={() => void installVendor(gpu.vendor)}
                        >
                          <Icon name="Download" size={13} />{' '}
                          {installing.has(gpu.vendor) ? 'Installing…' : `Install ${tool.label}`}
                        </button>
                        <a
                          className="link"
                          href={tool.download}
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          <Icon name="ExternalLink" size={13} /> Manual download
                        </a>
                      </footer>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === 'updates' && (
        <>
          <div className="hdr">
            <p className="lede">
              Pulls driver updates from Windows Update via the COM API. Microsoft signs &amp; hosts these on
              behalf of the vendors. <strong>Admin required.</strong>
              {lastScan && (
                <span className="meta-inline">Last scan: {lastScan.toLocaleTimeString()}</span>
              )}
            </p>
            <div className="hdr-actions">
              <button
                className="primary scan"
                disabled={scanning || installingAll}
                onClick={() => void scan()}
              >
                <Icon name="SearchCheck" size={13} className={scanning ? 'spin' : ''} />
                {scanning ? 'Scanning…' : 'Scan for updates'}
              </button>
            </div>
          </div>

          {updates.length > 0 ? (
            <>
              <div className="action-bar">
                <span>
                  {selectedIds.size} of {updates.length} selected
                </span>
                <button className="link" onClick={selectAll}>
                  Select all
                </button>
                <button className="link" onClick={() => setSelectedIds(new Set())}>
                  Clear
                </button>
                <button
                  className="primary install-btn"
                  disabled={selectedIds.size === 0 || installingAll}
                  onClick={() => void installSelected()}
                >
                  <Icon name="Download" size={13} className={installingAll ? 'spin' : ''} />
                  {installingAll ? 'Installing…' : `Install ${selectedIds.size}`}
                </button>
              </div>

              <div className="upd-list">
                {updates.map((u) => {
                  const sel = selectedIds.has(u.id);
                  return (
                    <article key={u.id} className={`upd${sel ? ' selected' : ''}`}>
                      <button
                        className="checkbox"
                        role="checkbox"
                        aria-checked={sel}
                        onClick={() => toggleSelected(u.id)}
                      >
                        {sel && (
                          <svg viewBox="0 0 16 16" width="10" height="10" fill="none">
                            <path
                              d="M2 8l4 4 8-9"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </button>
                      <div className="upd-meta">
                        <strong>{u.title}</strong>
                        <div className="sub">
                          {u.manufacturer && <span>{u.manufacturer}</span>}
                          {u.driver_class && (
                            <>
                              <span>·</span>
                              <span className="tag">{u.driver_class}</span>
                            </>
                          )}
                          {u.driver_version && (
                            <>
                              <span>·</span>
                              <span>v{u.driver_version}</span>
                            </>
                          )}
                          {u.driver_date && (
                            <>
                              <span>·</span>
                              <span>{u.driver_date}</span>
                            </>
                          )}
                          <span>·</span>
                          <span>{u.size_mb} MB</span>
                          {u.is_mandatory && <span className="mandatory">Mandatory</span>}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          ) : !scanning && lastScan ? (
            <div className="empty">
              <Icon name="ShieldAlert" size={28} />
              <p>No driver updates pending.</p>
              <span>Run a scan again later if you've installed new hardware.</span>
            </div>
          ) : (
            !scanning && (
              <div className="empty">
                <Icon name="PackagePlus" size={28} />
                <p>Scan for driver updates.</p>
                <span>This contacts Windows Update directly. No third-party tools.</span>
              </div>
            )
          )}
        </>
      )}

      {tab === 'all' && (
        <>
          <div className="hdr">
            <p className="lede">
              All currently installed signed drivers from <code>Win32_PnPSignedDriver</code>.
            </p>
            <button className="refresh" onClick={() => void loadAll()}>
              <Icon name="RefreshCw" size={13} className={loadingAll ? 'spin' : ''} /> Reload
            </button>
          </div>

          <div className="filter-row">
            <div className="search">
              <Icon name="Search" size={14} />
              <input
                type="search"
                value={queryAll}
                onChange={(e) => setQueryAll(e.target.value)}
                placeholder="Filter by device or provider…"
              />
            </div>
            <select value={classFilter} onChange={(e) => setClassFilter(e.currentTarget.value)}>
              {classes.map((c) => (
                <option key={c} value={c}>
                  {c === 'all' ? 'All classes' : c}
                </option>
              ))}
            </select>
            <span className="count">
              {driversFiltered.length} of {drivers.length}
            </span>
          </div>

          <div className="table">
            <div className="thead">
              <span>Device</span>
              <span>Class</span>
              <span>Provider</span>
              <span>Version</span>
              <span>Date</span>
            </div>
            <div className="tbody">
              {driversFiltered.map((d) => {
                const age = driverAgeDays(d.date);
                return (
                  <div key={d.device + d.version} className="trow">
                    <span className="dev" title={d.device}>
                      {d.device}
                    </span>
                    <span className="class-cell">{d.class || '—'}</span>
                    <span>{d.provider}</span>
                    <span className="ver">{d.version}</span>
                    <span className="date">
                      {d.date || '—'}
                      {age !== null && (
                        <span className={`age${age > 365 ? ' stale' : ''}`}> ({age}d)</span>
                      )}
                    </span>
                  </div>
                );
              })}
              {driversFiltered.length === 0 && !loadingAll && (
                <p className="empty-row">No drivers match this filter.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

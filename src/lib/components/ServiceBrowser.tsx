import { useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Icon } from './Icon';
import { useTweaks } from '../stores/tweaks';
import './ServiceBrowser.css';

interface ServiceInfo {
  name: string;
  display_name: string;
  status: string;
  startup: string;
}

type FilterStatus = 'all' | 'running' | 'stopped';

const startupOptions = ['Automatic', 'Manual', 'Disabled'];
const filterTabs: FilterStatus[] = ['all', 'running', 'stopped'];

export function ServiceBrowser() {
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
    <div className="service-browser">
      <div className="toolbar">
        <div className="search">
          <Icon name="Search" size={14} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by name or display name…"
          />
        </div>
        <div className="seg" role="tablist">
          {filterTabs.map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={filterStatus === f}
              className={filterStatus === f ? 'active' : ''}
              onClick={() => setFilterStatus(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <button className="refresh" onClick={() => void load()} title="Reload">
          <Icon name="RefreshCw" size={14} className={loading ? 'spin' : ''} />
        </button>
      </div>

      <p className="meta">
        {filtered.length} of {services.length} service{services.length === 1 ? '' : 's'}
      </p>

      <div className="table">
        <div className="thead">
          <span>Service</span>
          <span>Status</span>
          <span>Startup</span>
          <span className="ta-r">Actions</span>
        </div>

        <div className="tbody">
          {filtered.map((svc) => {
            const isRunning = svc.status.toLowerCase() === 'running';
            const isBusy = busy.has(svc.name);
            const hasCustomStartup = !startupOptions.includes(svc.startup);
            return (
              <div key={svc.name} className={`row${isBusy ? ' busy' : ''}`}>
                <div className="cell name">
                  <span className="display">{svc.display_name || svc.name}</span>
                  <code className="id">{svc.name}</code>
                </div>
                <div className="cell">
                  <span className={`status${isRunning ? ' running' : ''}`}>
                    <span className="dot" />
                    {svc.status}
                  </span>
                </div>
                <div className="cell">
                  <select
                    value={svc.startup}
                    disabled={isBusy}
                    onChange={(e) => void changeStartup(svc, e.currentTarget.value)}
                  >
                    {startupOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                    {hasCustomStartup && <option value={svc.startup}>{svc.startup}</option>}
                  </select>
                </div>
                <div className="cell ta-r actions">
                  {isRunning ? (
                    <button
                      className="icon-btn"
                      disabled={isBusy}
                      title="Stop"
                      onClick={() => void stopSvc(svc)}
                    >
                      <Icon name="Square" size={12} />
                    </button>
                  ) : (
                    <button
                      className="icon-btn"
                      disabled={isBusy}
                      title="Start"
                      onClick={() => void startSvc(svc)}
                    >
                      <Icon name="Play" size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && !loading && (
            <p className="empty">No services match your filter.</p>
          )}
        </div>
      </div>
    </div>
  );
}

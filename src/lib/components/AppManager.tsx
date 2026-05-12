import { useCallback, useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Icon } from './Icon';
import { useTweaks } from '../stores/tweaks';
import './AppManager.css';

interface AppEntry {
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

type FilterKind = 'all' | 'installed' | 'removed' | 'bloat';

const FILTER_OPTIONS: [FilterKind, string][] = [
  ['all', 'All'],
  ['installed', 'Installed'],
  ['removed', 'Removed'],
  ['bloat', 'Bloat only']
];

export function AppManager() {
  const toast = useTweaks((s) => s.toast);

  const [apps, setApps] = useState<AppEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKind>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await invoke<AppEntry[]>('list_apps_inventory');
      setApps(result);
    } catch (e) {
      toast({ kind: 'err', msg: `App inventory: ${e}` });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return apps.filter((a) => {
      if (filter === 'installed' && !a.installed) return false;
      if (filter === 'removed' && a.installed) return false;
      if (filter === 'bloat' && !a.bloat) return false;
      if (q && !a.name.toLowerCase().includes(q) && !a.package.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [apps, query, filter]);

  const categories = useMemo(
    () => Array.from(new Set(filtered.map((a) => a.category))).sort(),
    [filtered]
  );

  function markBusy(pkg: string, on: boolean) {
    setBusy((prev) => {
      const n = new Set(prev);
      if (on) n.add(pkg);
      else n.delete(pkg);
      return n;
    });
  }

  function toggleSelected(pkg: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(pkg)) n.delete(pkg);
      else n.add(pkg);
      return n;
    });
  }

  async function doInstall(app: AppEntry) {
    await invoke('install_known_app', { package: app.package, wingetId: app.winget_id });
    setApps((prev) => prev.map((a) => (a.package === app.package ? { ...a, installed: true } : a)));
    toast({ kind: 'ok', msg: `Installed ${app.name}` });
  }

  async function toggleApp(app: AppEntry) {
    markBusy(app.package, true);
    try {
      if (app.installed) {
        await invoke('remove_app_package', { package: app.package });
        setApps((prev) =>
          prev.map((a) => (a.package === app.package ? { ...a, installed: false } : a))
        );
        toast({
          kind: 'ok',
          msg: `Removed ${app.name}`,
          action: { label: 'Undo', run: () => doInstall(app) }
        });
      } else {
        await doInstall(app);
      }
    } catch (e) {
      toast({ kind: 'err', msg: `${app.name}: ${e}` });
    } finally {
      markBusy(app.package, false);
    }
  }

  async function batchRemove() {
    const list = filtered.filter((a) => selected.has(a.package) && a.installed);
    if (list.length === 0) return;
    toast({ kind: 'info', msg: `Removing ${list.length} app${list.length === 1 ? '' : 's'}…` });
    let ok = 0;
    let fail = 0;
    const removedPkgs: string[] = [];
    for (const app of list) {
      try {
        await invoke('remove_app_package', { package: app.package });
        removedPkgs.push(app.package);
        ok++;
      } catch {
        fail++;
      }
    }
    setApps((prev) =>
      prev.map((a) => (removedPkgs.includes(a.package) ? { ...a, installed: false } : a))
    );
    setSelected(new Set());
    toast({
      kind: fail === 0 ? 'ok' : 'err',
      msg: `${ok} removed${fail > 0 ? `, ${fail} failed` : ''}.`
    });
  }

  function selectAllVisible() {
    setSelected((prev) => {
      const n = new Set(prev);
      for (const a of filtered) if (a.installed) n.add(a.package);
      return n;
    });
  }

  return (
    <div className="app-manager">
      <div className="toolbar">
        <div className="search">
          <Icon name="Search" size={14} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search apps or package id…"
          />
        </div>
        <div className="seg" role="tablist">
          {FILTER_OPTIONS.map(([v, lbl]) => (
            <button
              key={v}
              role="tab"
              aria-selected={filter === v}
              className={filter === v ? 'active' : ''}
              onClick={() => setFilter(v)}
            >
              {lbl}
            </button>
          ))}
        </div>
        <button className="iconbtn" onClick={load} title="Reload">
          <Icon name="RefreshCw" size={14} className={loading ? 'spin' : ''} />
        </button>
      </div>

      <div className="meta-bar">
        <span>
          {filtered.length} of {apps.length} apps
        </span>
        {selected.size > 0 ? (
          <span className="sel">
            <Icon name="CheckSquare" size={12} /> {selected.size} selected
            <button className="link" onClick={() => setSelected(new Set())}>
              Clear
            </button>
            <button className="danger-btn" onClick={batchRemove}>
              <Icon name="Trash2" size={12} /> Remove selected
            </button>
          </span>
        ) : (
          <button className="link" onClick={selectAllVisible}>
            Select all visible installed
          </button>
        )}
      </div>

      {categories.map((cat) => {
        const list = filtered.filter((a) => a.category === cat);
        if (list.length === 0) return null;
        return (
          <div key={cat}>
            <h3 className="cat">{cat}</h3>
            <div className="grid">
              {list.map((app) => {
                const isBusy = busy.has(app.package);
                const isSel = selected.has(app.package);
                const rowClass = [
                  'row',
                  app.installed ? 'installed' : '',
                  app.bloat ? 'bloat' : '',
                  isSel ? 'selected' : ''
                ]
                  .filter(Boolean)
                  .join(' ');
                return (
                  <article key={app.package} className={rowClass}>
                    <button
                      className="checkbox"
                      type="button"
                      role="checkbox"
                      aria-checked={isSel}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelected(app.package);
                      }}
                    >
                      {isSel && (
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
                    <div className="info">
                      <div className="head">
                        <strong>{app.name}</strong>
                        {app.bloat && <span className="tag bloat-tag">bloat</span>}
                        {!app.installed && <span className="tag removed">removed</span>}
                      </div>
                      <div className="sub">
                        <code>{app.package}</code>
                        {app.version && (
                          <>
                            <span>·</span>
                            <span>v{app.version}</span>
                          </>
                        )}
                        {app.publisher && (
                          <>
                            <span>·</span>
                            <span>{app.publisher}</span>
                          </>
                        )}
                      </div>
                      {app.description && <p className="desc">{app.description}</p>}
                    </div>
                    <div className="actions">
                      {app.installed ? (
                        <button
                          className="ibtn danger"
                          disabled={isBusy}
                          onClick={() => toggleApp(app)}
                        >
                          <Icon name="Trash2" size={12} /> Remove
                        </button>
                      ) : (
                        <button
                          className="ibtn primary"
                          disabled={isBusy}
                          title={
                            app.winget_id
                              ? `winget: ${app.winget_id}`
                              : 'Tries Add-AppxPackage; falls back to MS Store'
                          }
                          onClick={() => toggleApp(app)}
                        >
                          <Icon name="Download" size={12} /> Install
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && !loading && (
        <p className="empty">
          <Icon name="Filter" size={20} />
          <br />
          No apps match this filter.
        </p>
      )}
    </div>
  );
}

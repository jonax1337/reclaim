import { useCallback, useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Switch } from '@fluentui/react-components';
import { Icon } from './Icon';
import { useTweaks } from '../stores/tweaks';
import './StartupApps.css';

interface StartupItem {
  name: string;
  command: string;
  source: string;
  user: string;
  enabled: boolean;
}

export function StartupApps() {
  const toast = useTweaks((s) => s.toast);

  const [items, setItems] = useState<StartupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await invoke<StartupItem[]>('list_startup');
      setItems(result);
    } catch (e) {
      toast({ kind: 'err', msg: `Startup: ${e}` });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return items.filter(
      (i) =>
        query === '' ||
        i.name.toLowerCase().includes(q) ||
        i.command.toLowerCase().includes(q)
    );
  }, [items, query]);

  async function toggle(item: StartupItem) {
    if (item.source === 'Startup folder') {
      toast({ kind: 'info', msg: 'Startup folder items: delete the .lnk in the folder to remove.' });
      return;
    }
    const key = `${item.source}::${item.name}`;
    setBusy((prev) => {
      const n = new Set(prev);
      n.add(key);
      return n;
    });
    try {
      const scope = item.source.startsWith('HKCU') ? 'hkcu' : 'hklm';
      const next = !item.enabled;
      await invoke('set_startup_enabled', { scope, name: item.name, enabled: next });
      setItems((prev) =>
        prev.map((i) =>
          i.source === item.source && i.user === item.user && i.name === item.name
            ? { ...i, enabled: next }
            : i
        )
      );
      toast({ kind: 'ok', msg: `${next ? 'Enabled' : 'Disabled'}: ${item.name}` });
    } catch (e) {
      toast({ kind: 'err', msg: `${item.name}: ${e}` });
    } finally {
      setBusy((prev) => {
        const n = new Set(prev);
        n.delete(key);
        return n;
      });
    }
  }

  return (
    <div className="startup-apps">
      <div className="toolbar">
        <div className="search">
          <Icon name="Search" size={14} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter startup items…"
          />
        </div>
        <button className="iconbtn" onClick={load} title="Reload">
          <Icon name="RefreshCw" size={14} className={loading ? 'spin' : ''} />
        </button>
      </div>

      <p className="meta">
        {filtered.length} of {items.length} startup item{items.length === 1 ? '' : 's'}
      </p>

      <div className="list">
        {filtered.map((item) => {
          const key = `${item.source}::${item.name}`;
          const rowClass = ['row', !item.enabled ? 'disabled' : ''].filter(Boolean).join(' ');
          return (
            <article
              key={`${item.source}:${item.user}:${item.name}`}
              className={rowClass}
            >
              <div className="meta-cell">
                <strong>{item.name}</strong>
                <code className="cmd">{item.command}</code>
                <div className="sub">
                  <span className="tag">{item.source}</span>
                  <span>{item.user}</span>
                </div>
              </div>
              <div className="action">
                <Switch
                  checked={item.enabled}
                  disabled={busy.has(key) || item.source === 'Startup folder'}
                  onChange={() => toggle(item)}
                />
              </div>
            </article>
          );
        })}

        {filtered.length === 0 && !loading && (
          <p className="empty">No startup items match.</p>
        )}
      </div>
    </div>
  );
}

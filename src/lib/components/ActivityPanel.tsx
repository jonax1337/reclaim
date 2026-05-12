import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Icon } from './Icon';
import { SeverityBadge } from './SeverityBadge';
import { useTweaks } from '../stores/tweaks';
import type { Severity } from '../../types';
import './ActivityPanel.css';

interface ActivityEntry {
  id: string;
  name: string;
  category: string;
  severity: string;
  /** Unix seconds since epoch. */
  applied_at: number;
}

function relative(unix: number): string {
  if (!Number.isFinite(unix) || unix === 0) return '—';
  const ms = Date.now() - unix * 1000;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(unix * 1000).toLocaleDateString();
}

export function ActivityPanel() {
  const refreshStates = useTweaks((s) => s.refreshStates);
  const toast = useTweaks((s) => s.toast);

  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<Set<string>>(new Set());

  async function load() {
    setLoading(true);
    try {
      const next = await invoke<ActivityEntry[]>('list_activity');
      setEntries(next);
    } catch (e) {
      toast({ kind: 'err', msg: `Activity: ${e}` });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function revert(e: ActivityEntry) {
    setBusy((prev) => {
      const n = new Set(prev);
      n.add(e.id);
      return n;
    });
    try {
      await invoke('revert_tweak', { id: e.id });
      setEntries((prev) => prev.filter((x) => x.id !== e.id));
      await refreshStates();
      toast({ kind: 'ok', msg: `Reverted: ${e.name}` });
    } catch (err) {
      toast({ kind: 'err', msg: `${e.name}: ${err}` });
    } finally {
      setBusy((prev) => {
        const n = new Set(prev);
        n.delete(e.id);
        return n;
      });
    }
  }

  return (
    <>
      <div className="act-hdr">
        <p className="act-lede">
          Every applied tweak is journalled to <code>%APPDATA%\Reclaim\backups\</code>.
          Reverting restores the original registry values, service start types, and re-registers AppX packages.
        </p>
        <button className="act-refresh" onClick={() => void load()}>
          <Icon name="RefreshCw" size={13} className={loading ? 'spin' : ''} />
          Reload
        </button>
      </div>

      {entries.length === 0 && !loading ? (
        <div className="act-empty">
          <Icon name="Inbox" size={28} />
          <p>No tweaks applied yet.</p>
          <span>Apply something — it will show up here so you can roll it back later.</span>
        </div>
      ) : (
        <div className="act-list">
          {entries.map((e) => (
            <div className="act-item" key={e.id}>
              <div className="act-left">
                <strong>{e.name}</strong>
                <div className="act-meta">
                  {e.severity && <SeverityBadge level={e.severity as Severity} />}
                  {e.category && <span className="act-cat">{e.category}</span>}
                  <span className="act-time">{relative(e.applied_at)}</span>
                  <code className="act-id">{e.id}</code>
                </div>
              </div>
              <button
                className="act-revert"
                disabled={busy.has(e.id)}
                onClick={() => void revert(e)}
              >
                <Icon name="Undo2" size={13} />
                Revert
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

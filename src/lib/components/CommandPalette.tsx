import { useEffect, useMemo, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Icon } from './Icon';
import { useTweaks } from '../stores/tweaks';
import type { ViewKey } from '../../types';
import './CommandPalette.css';

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onNavigate: (v: ViewKey) => void;
};

type NavItem  = { kind: 'nav';   id: ViewKey; label: string; hint: string };
type TweakItm = { kind: 'tweak'; id: string;  label: string; hint: string; applied: boolean; cat: string };
type AppItem  = { kind: 'app';   id: string;  label: string; hint: string };
type Item = NavItem | TweakItm | AppItem;

const navItems: NavItem[] = [
  { kind: 'nav', id: 'dashboard',   label: 'Dashboard',           hint: 'Go to overview' },
  { kind: 'nav', id: 'privacy',     label: 'Privacy & Telemetry', hint: 'Go to category' },
  { kind: 'nav', id: 'bloatware',   label: 'Bloatware',           hint: 'Go to category' },
  { kind: 'nav', id: 'ai',          label: 'AI Features',         hint: 'Go to category' },
  { kind: 'nav', id: 'explorer',    label: 'Explorer & Shell',    hint: 'Go to category' },
  { kind: 'nav', id: 'search',      label: 'Search',              hint: 'Go to category' },
  { kind: 'nav', id: 'performance', label: 'Performance',         hint: 'Go to category' },
  { kind: 'nav', id: 'gaming',      label: 'Gaming',              hint: 'Go to category' },
  { kind: 'nav', id: 'services',    label: 'Services',            hint: 'Go to category' },
  { kind: 'nav', id: 'apps',        label: 'Install Apps',        hint: 'Go to category' }
];

function fuzzy(text: string, q: string): boolean {
  if (!q) return true;
  const t = text.toLowerCase();
  let i = 0;
  for (const ch of q.toLowerCase()) {
    const idx = t.indexOf(ch, i);
    if (idx === -1) return false;
    i = idx + 1;
  }
  return true;
}

export function CommandPalette({ open, onOpenChange, onNavigate }: Props) {
  const tweaks = useTweaks((s) => s.tweaks);
  const states = useTweaks((s) => s.states);
  const apps = useTweaks((s) => s.apps);
  const toggle = useTweaks((s) => s.toggle);
  const toast = useTweaks((s) => s.toast);

  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const results = useMemo<Item[]>(() => {
    const q = query.trim();
    const items: Item[] = [];
    for (const n of navItems) {
      if (fuzzy(n.label, q)) items.push(n);
    }
    for (const t of tweaks) {
      if (fuzzy(t.name, q) || fuzzy(t.description, q)) {
        items.push({
          kind: 'tweak',
          id: t.id,
          label: t.name,
          hint: t.description,
          applied: states.get(t.id)?.state === 'applied',
          cat: t.category
        });
      }
    }
    for (const a of apps) {
      if (fuzzy(a.name, q) || fuzzy(a.id, q)) {
        items.push({ kind: 'app', id: a.id, label: a.name, hint: a.id });
      }
    }
    return items.slice(0, 50);
  }, [query, tweaks, states, apps]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setCursor(0);
      queueMicrotask(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setCursor(0);
  }, [results]);

  function close() { onOpenChange(false); }

  async function activate(item: Item) {
    if (item.kind === 'nav') {
      onNavigate(item.id);
    } else if (item.kind === 'tweak') {
      const tweak = tweaks.find((t) => t.id === item.id);
      if (tweak) {
        onNavigate(tweak.category as ViewKey);
        await toggle(tweak.id);
      }
    } else {
      try {
        toast({ kind: 'info', msg: `Installing ${item.label}…` });
        await invoke('install_winget_app', { id: item.id });
        toast({ kind: 'ok', msg: `Installed ${item.label}` });
      } catch (e) {
        toast({ kind: 'err', msg: `${item.label}: ${e}` });
      }
    }
    close();
  }

  function scrollCursorIntoView(idx: number) {
    queueMicrotask(() => {
      const el = document.querySelector(`[data-cmd-idx="${idx}"]`);
      el?.scrollIntoView({ block: 'nearest' });
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => {
        const next = Math.min(c + 1, results.length - 1);
        scrollCursorIntoView(next);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => {
        const next = Math.max(c - 1, 0);
        scrollCursorIntoView(next);
        return next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const it = results[cursor];
      if (it) void activate(it);
    }
  }

  if (!open) return null;

  return (
    <>
      <div className="cp-scrim" onClick={close} role="presentation" />
      <div className="cp-palette" role="dialog" aria-modal="true" aria-label="Command palette">
        <div className="cp-input-row">
          <Icon name="Search" size={16} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search tweaks, apps, pages…"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd>esc</kbd>
        </div>

        <div className="cp-results">
          {results.length === 0 ? (
            <p className="cp-empty">No matches.</p>
          ) : (
            results.map((item, i) => (
              <button
                key={item.kind + ':' + item.id}
                type="button"
                data-cmd-idx={i}
                className={`cp-item${i === cursor ? ' cursor' : ''}`}
                onClick={() => void activate(item)}
                onMouseEnter={() => setCursor(i)}
              >
                <span className="cp-icon">
                  {item.kind === 'nav' ? <Icon name="LayoutDashboard" size={14} />
                    : item.kind === 'tweak' ? <Icon name="ToggleRight" size={14} />
                    : <Icon name="Package" size={14} />}
                </span>
                <span className="cp-label">{item.label}</span>
                <span className="cp-hint">{item.hint}</span>
                {item.kind === 'tweak' ? (
                  <span className={`cp-badge${item.applied ? ' on' : ''}`}>
                    {item.applied ? 'Revert' : 'Apply'}
                  </span>
                ) : item.kind === 'app' ? (
                  <span className="cp-badge">Install</span>
                ) : (
                  <span className="cp-badge muted">Open</span>
                )}
              </button>
            ))
          )}
        </div>

        <footer className="cp-footer">
          <span className="cp-ft"><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span className="cp-ft"><kbd><Icon name="CornerDownLeft" size={10} /></kbd> select</span>
          <span className="cp-ft right">{results.length} result{results.length === 1 ? '' : 's'}</span>
        </footer>
      </div>
    </>
  );
}

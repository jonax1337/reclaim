import { useEffect, useMemo, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Dialog,
  DialogSurface,
  Input,
  Badge,
  makeStyles,
  mergeClasses,
  shorthands,
  tokens
} from '@fluentui/react-components';
import {
  Search20Regular,
  Board16Regular,
  ToggleRight16Regular,
  Box16Regular,
  ArrowEnter16Regular
} from '@fluentui/react-icons';
import { useTweaks } from '../stores/tweaks';
import type { ViewKey } from '../../types';

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

const useStyles = makeStyles({
  surface: {
    width: 'min(620px, calc(100vw - 48px))',
    maxWidth: 'min(620px, calc(100vw - 48px))',
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '70vh',
    overflow: 'hidden'
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalMNudge,
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalL),
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: tokens.colorNeutralStroke2
  },
  input: {
    flex: 1,
    '& input': {
      fontSize: tokens.fontSizeBase400
    }
  },
  results: {
    flex: 1,
    overflowY: 'auto',
    ...shorthands.padding(tokens.spacingVerticalXS)
  },
  empty: {
    ...shorthands.padding(tokens.spacingVerticalXXXL, 0),
    textAlign: 'center',
    color: tokens.colorNeutralForeground3
  },
  item: {
    display: 'grid',
    gridTemplateColumns: '24px 1fr auto',
    gridTemplateRows: 'auto auto',
    columnGap: tokens.spacingHorizontalMNudge,
    alignItems: 'center',
    width: '100%',
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: tokens.borderRadiusMedium,
    textAlign: 'left',
    color: tokens.colorNeutralForeground1,
    cursor: 'pointer',
    transitionDuration: tokens.durationFaster,
    transitionTimingFunction: tokens.curveDecelerateMax,
    transitionProperty: 'background-color'
  },
  cursor: { backgroundColor: tokens.colorSubtleBackgroundSelected },
  itemIcon: {
    gridRow: '1 / 3',
    color: tokens.colorNeutralForeground3,
    display: 'flex',
    alignItems: 'center'
  },
  iconActive: { color: tokens.colorBrandForeground1 },
  itemLabel: { fontSize: tokens.fontSizeBase300, fontWeight: tokens.fontWeightMedium },
  itemHint: {
    gridColumn: 2,
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '100%'
  },
  badgeWrap: { gridRow: '1 / 3' },
  footer: {
    display: 'flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalL,
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalL),
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: tokens.colorNeutralStroke2,
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3
  },
  ft: { display: 'inline-flex', alignItems: 'center', columnGap: tokens.spacingHorizontalXS },
  right: { marginLeft: 'auto' },
  kbd: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: '10px',
    ...shorthands.padding('2px', '6px'),
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    borderRadius: tokens.borderRadiusSmall,
    color: tokens.colorNeutralForeground2,
    display: 'inline-flex',
    alignItems: 'center',
    columnGap: '2px'
  }
});

export function CommandPalette({ open, onOpenChange, onNavigate }: Props) {
  const s = useStyles();
  const tweaks = useTweaks((st) => st.tweaks);
  const states = useTweaks((st) => st.states);
  const apps = useTweaks((st) => st.apps);
  const toggle = useTweaks((st) => st.toggle);
  const toast = useTweaks((st) => st.toast);

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
      const t = tweaks.find((tk) => tk.id === item.id);
      if (t) {
        onNavigate(t.category as ViewKey);
        await toggle(t.id);
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

  return (
    <Dialog open={open} onOpenChange={(_, d) => onOpenChange(d.open)} modalType="modal">
      <DialogSurface className={s.surface}>
        <div className={s.inputRow}>
          <Search20Regular />
          <Input
            ref={inputRef}
            className={s.input}
            value={query}
            onChange={(_, d) => setQuery(d.value)}
            onKeyDown={onKeyDown}
            placeholder="Search tweaks, apps, pages…"
            autoComplete="off"
            spellCheck={false}
            appearance="filled-darker"
          />
          <kbd className={s.kbd}>esc</kbd>
        </div>

        <div className={s.results}>
          {results.length === 0 ? (
            <p className={s.empty}>No matches.</p>
          ) : (
            results.map((item, i) => {
              const isActive = i === cursor;
              return (
                <button
                  key={item.kind + ':' + item.id}
                  type="button"
                  data-cmd-idx={i}
                  className={mergeClasses(s.item, isActive && s.cursor)}
                  onClick={() => void activate(item)}
                  onMouseEnter={() => setCursor(i)}
                >
                  <span className={mergeClasses(s.itemIcon, isActive && s.iconActive)}>
                    {item.kind === 'nav' ? <Board16Regular />
                      : item.kind === 'tweak' ? <ToggleRight16Regular />
                      : <Box16Regular />}
                  </span>
                  <span className={s.itemLabel}>{item.label}</span>
                  <span className={s.itemHint}>{item.hint}</span>
                  <span className={s.badgeWrap}>
                    {item.kind === 'tweak' ? (
                      <Badge appearance="tint" color={item.applied ? 'danger' : 'brand'} size="small">
                        {item.applied ? 'Revert' : 'Apply'}
                      </Badge>
                    ) : item.kind === 'app' ? (
                      <Badge appearance="tint" color="brand" size="small">Install</Badge>
                    ) : (
                      <Badge appearance="tint" color="subtle" size="small">Open</Badge>
                    )}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <footer className={s.footer}>
          <span className={s.ft}><kbd className={s.kbd}>↑</kbd><kbd className={s.kbd}>↓</kbd> navigate</span>
          <span className={s.ft}><kbd className={s.kbd}><ArrowEnter16Regular /></kbd> select</span>
          <span className={mergeClasses(s.ft, s.right)}>{results.length} result{results.length === 1 ? '' : 's'}</span>
        </footer>
      </DialogSurface>
    </Dialog>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Card,
  Switch,
  Button,
  SearchBox,
  Caption1,
  Text,
  makeStyles,
  mergeClasses,
  shorthands,
  tokens
} from '@fluentui/react-components';
import { ArrowClockwise16Regular } from '@fluentui/react-icons';
import { useTweaks } from '../stores/tweaks';

interface StartupItem {
  name: string;
  command: string;
  source: string;
  user: string;
  enabled: boolean;
}

const useStyles = makeStyles({
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalS,
    rowGap: tokens.spacingVerticalS,
    flexWrap: 'wrap',
    marginBottom: tokens.spacingVerticalM
  },
  search: { flex: 1, minWidth: '200px' },
  spin: {
    animationName: { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } },
    animationDuration: '900ms',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'linear'
  },
  meta: { color: tokens.colorNeutralForeground3, marginBottom: tokens.spacingVerticalM },
  list: { display: 'flex', flexDirection: 'column', rowGap: tokens.spacingVerticalS },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    columnGap: tokens.spacingHorizontalL,
    alignItems: 'center',
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalL),
    backgroundColor: tokens.colorNeutralBackground2
  },
  disabled: { opacity: 0.6 },
  meta2: {
    display: 'flex',
    flexDirection: 'column',
    rowGap: '2px',
    minWidth: 0
  },
  cmd: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  sub: {
    display: 'flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalS,
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase100
  },
  tag: {
    ...shorthands.padding('1px', '7px'),
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusSmall
  },
  empty: {
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
    ...shorthands.padding('48px', 0)
  }
});

export function StartupApps() {
  const s = useStyles();
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
    <div>
      <div className={s.toolbar}>
        <SearchBox
          className={s.search}
          value={query}
          onChange={(_, d) => setQuery(d.value)}
          placeholder="Filter startup items…"
        />
        <Button
          appearance="outline"
          icon={<ArrowClockwise16Regular className={loading ? s.spin : undefined} />}
          onClick={load}
        >
          Reload
        </Button>
      </div>

      <Caption1 className={s.meta}>
        {filtered.length} of {items.length} startup item{items.length === 1 ? '' : 's'}
      </Caption1>

      <div className={s.list}>
        {filtered.map((item) => {
          const key = `${item.source}::${item.name}`;
          return (
            <Card
              key={`${item.source}:${item.user}:${item.name}`}
              className={mergeClasses(s.row, !item.enabled && s.disabled)}
              appearance="filled-alternative"
            >
              <div className={s.meta2}>
                <Text weight="semibold">{item.name}</Text>
                <span className={s.cmd}>{item.command}</span>
                <div className={s.sub}>
                  <span className={s.tag}>{item.source}</span>
                  <span>{item.user}</span>
                </div>
              </div>
              <Switch
                checked={item.enabled}
                disabled={busy.has(key) || item.source === 'Startup folder'}
                onChange={() => toggle(item)}
              />
            </Card>
          );
        })}

        {filtered.length === 0 && !loading && (
          <p className={s.empty}>No startup items match.</p>
        )}
      </div>
    </div>
  );
}

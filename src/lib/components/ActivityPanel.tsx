import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Card,
  Button,
  Body1,
  Caption1,
  PresenceBadge,
  Text,
  makeStyles,
  shorthands,
  tokens
} from '@fluentui/react-components';
import {
  ArrowClockwise16Regular,
  ArrowUndo16Regular,
  MailInbox20Regular
} from '@fluentui/react-icons';
import { SeverityBadge } from './SeverityBadge';
import { useTweaks } from '../stores/tweaks';
import type { Severity } from '../../types';

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

const useStyles = makeStyles({
  hdr: {
    display: 'flex',
    alignItems: 'flex-start',
    columnGap: tokens.spacingHorizontalL,
    marginBottom: tokens.spacingVerticalM
  },
  lede: { flex: 1, maxWidth: '78ch', color: tokens.colorNeutralForeground2 },
  spin: {
    animationName: { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } },
    animationDuration: '900ms',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'linear'
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
  list: { display: 'flex', flexDirection: 'column', rowGap: tokens.spacingVerticalS },
  item: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalL,
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalL),
    backgroundColor: tokens.colorNeutralBackground2
  },
  left: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', rowGap: tokens.spacingVerticalXS },
  nameRow: { display: 'flex', alignItems: 'center', columnGap: tokens.spacingHorizontalS },
  meta: {
    display: 'flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalS,
    rowGap: tokens.spacingVerticalXS,
    flexWrap: 'wrap',
    color: tokens.colorNeutralForeground3
  },
  cat: {
    ...shorthands.padding('1px', '7px'),
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusSmall,
    textTransform: 'capitalize',
    fontSize: tokens.fontSizeBase100
  },
  id: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground4
  },
  code: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
    ...shorthands.padding('1px', '5px'),
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusSmall
  }
});

export function ActivityPanel() {
  const s = useStyles();
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
      <div className={s.hdr}>
        <Body1 className={s.lede}>
          Every applied tweak is journalled to <code className={s.code}>%APPDATA%\Reclaim\backups\</code>.
          Reverting restores the original registry values, service start types, and re-registers AppX packages.
        </Body1>
        <Button
          appearance="secondary"
          icon={<ArrowClockwise16Regular className={loading ? s.spin : undefined} />}
          onClick={() => void load()}
        >
          Reload
        </Button>
      </div>

      {entries.length === 0 && !loading ? (
        <div className={s.empty}>
          <MailInbox20Regular />
          <Text weight="semibold">No tweaks applied yet.</Text>
          <Caption1>Apply something — it will show up here so you can roll it back later.</Caption1>
        </div>
      ) : (
        <div className={s.list}>
          {entries.map((e) => (
            <Card key={e.id} className={s.item} appearance="filled-alternative">
              <div className={s.left}>
                <div className={s.nameRow}>
                  <PresenceBadge status="available" size="small" />
                  <Text weight="semibold">{e.name}</Text>
                </div>
                <div className={s.meta}>
                  {e.severity && <SeverityBadge level={e.severity as Severity} />}
                  {e.category && <span className={s.cat}>{e.category}</span>}
                  <Caption1>{relative(e.applied_at)}</Caption1>
                  <code className={s.id}>{e.id}</code>
                </div>
              </div>
              <Button
                appearance="secondary"
                icon={<ArrowUndo16Regular />}
                disabled={busy.has(e.id)}
                onClick={() => void revert(e)}
              >
                Revert
              </Button>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

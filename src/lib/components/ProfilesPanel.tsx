import { useEffect, useState, type CSSProperties } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Card,
  Button,
  Title3,
  Body1,
  Caption1,
  Spinner,
  Text,
  makeStyles,
  shorthands,
  tokens
} from '@fluentui/react-components';
import { Icon } from './Icon';
import { useTweaks } from '../stores/tweaks';
import type { FluentIconName } from '../icons';
import type { Profile } from '../../types';

const useStyles = makeStyles({
  lede: { display: 'block', maxWidth: '70ch', marginBottom: tokens.spacingVerticalL, color: tokens.colorNeutralForeground2 },
  status: {
    display: 'flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalS,
    color: tokens.colorNeutralForeground3,
    ...shorthands.padding(tokens.spacingVerticalXL, 0)
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: tokens.spacingHorizontalL
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    rowGap: tokens.spacingVerticalM,
    ...shorthands.padding(tokens.spacingVerticalL, tokens.spacingHorizontalL),
    backgroundColor: tokens.colorNeutralBackground2
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalM
  },
  iconWrap: {
    width: '44px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground1,
    flexShrink: 0
  },
  titleCol: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', rowGap: '2px' },
  title: { margin: 0 },
  ring: {
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    background: `conic-gradient(${tokens.colorBrandForeground1} var(--pct, 0%), ${tokens.colorNeutralStroke2} 0)`,
    position: 'relative',
    flexShrink: 0,
    ':before': {
      content: '""',
      position: 'absolute',
      inset: '4px',
      borderRadius: '50%',
      backgroundColor: tokens.colorNeutralBackground2
    },
    '& > span': { position: 'relative', zIndex: 1 }
  },
  desc: { color: tokens.colorNeutralForeground2 },
  actions: {
    display: 'flex',
    columnGap: tokens.spacingHorizontalS,
    marginTop: 'auto'
  }
});

export function ProfilesPanel() {
  const s = useStyles();
  const stateOf = useTweaks((s) => s.stateOf);
  const selected = useTweaks((s) => s.selected);
  const selectProfile = useTweaks((s) => s.selectProfile);
  const applySelection = useTweaks((s) => s.applySelection);
  const confirm = useTweaks((s) => s.confirm);
  const toast = useTweaks((s) => s.toast);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const next = await invoke<Profile[]>('list_profiles');
      setProfiles(next);
    } catch (e) {
      toast({ kind: 'err', msg: `Profiles: ${e}` });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function summarise(p: Profile) {
    let applied = 0;
    let notApplied = 0;
    for (const id of p.tweak_ids) {
      if (stateOf(id) === 'applied') applied++;
      else notApplied++;
    }
    return { total: p.tweak_ids.length, applied, notApplied };
  }

  function handleSelect(p: Profile) {
    selectProfile(p.tweak_ids);
    const size = useTweaks.getState().selected.size;
    toast({
      kind: 'info',
      msg: `${p.name}: ${size} tweak${size === 1 ? '' : 's'} selected. Hit Apply to commit.`
    });
  }

  function handleApply(p: Profile) {
    const stats = summarise(p);
    if (stats.notApplied === 0) {
      toast({ kind: 'info', msg: `${p.name}: already fully applied.` });
      return;
    }
    confirm({
      title: `Apply "${p.name}"?`,
      body: `${p.description}\n\nWill apply ${stats.notApplied} tweak${stats.notApplied === 1 ? '' : 's'} (${stats.applied} already applied).`,
      confirmLabel: `Apply ${stats.notApplied}`,
      onconfirm: async () => {
        selectProfile(p.tweak_ids);
        await applySelection(stats.notApplied >= 5);
      }
    });
  }

  void selected;

  return (
    <div>
      <Body1 className={s.lede}>
        Curated bundles. Click a profile to select every tweak in it; Apply runs them all.
        The progress ring shows how much of the profile is already in place — including changes you made outside this app.
      </Body1>

      {loading && profiles.length === 0 ? (
        <div className={s.status}><Spinner size="tiny" /> <Text>Loading…</Text></div>
      ) : (
        <div className={s.grid}>
          {profiles.map((p) => {
            const stats = summarise(p);
            const pct = stats.total === 0 ? 0 : Math.round((stats.applied / stats.total) * 100);
            const ringStyle = { '--pct': `${pct}%` } as CSSProperties;
            return (
              <Card key={p.id} className={s.card} appearance="filled-alternative">
                <div className={s.header}>
                  <div className={s.iconWrap}>
                    <Icon name={p.icon as FluentIconName} size={20} />
                  </div>
                  <div className={s.titleCol}>
                    <Title3 as="h3" className={s.title}>{p.name}</Title3>
                    <Caption1>{stats.applied}/{stats.total} applied</Caption1>
                  </div>
                  <div
                    className={s.ring}
                    style={ringStyle}
                    title={`${pct}% of this profile is currently applied`}
                  >
                    <span>{pct}%</span>
                  </div>
                </div>
                <Body1 className={s.desc}>{p.description}</Body1>
                <div className={s.actions}>
                  <Button appearance="secondary" onClick={() => handleSelect(p)}>
                    Select tweaks
                  </Button>
                  <Button
                    appearance="primary"
                    onClick={() => handleApply(p)}
                    disabled={stats.notApplied === 0}
                  >
                    {stats.notApplied === 0 ? 'Fully applied' : `Apply ${stats.notApplied}`}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

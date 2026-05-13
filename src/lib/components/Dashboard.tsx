import { useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Card,
  Button,
  Title1,
  Body1,
  Caption1,
  Text,
  makeStyles,
  mergeClasses,
  shorthands,
  tokens
} from '@fluentui/react-components';
import {
  Warning20Regular,
  Pulse20Regular,
  ShieldCheckmark20Regular,
  ErrorCircle20Regular,
  DeveloperBoard20Regular,
  ShieldError20Regular
} from '@fluentui/react-icons';
import { useTweaks } from '../stores/tweaks';

const useStyles = makeStyles({
  hero: {
    display: 'flex',
    flexDirection: 'column',
    rowGap: tokens.spacingVerticalXS,
    marginBottom: tokens.spacingVerticalL
  },
  kicker: {
    color: tokens.colorBrandForeground1,
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    fontSize: tokens.fontSizeBase100,
    fontWeight: tokens.fontWeightSemibold
  },
  title: { margin: 0, letterSpacing: '-0.4px' },
  lede: { maxWidth: '70ch', color: tokens.colorNeutralForeground2 },
  drift: {
    display: 'flex',
    alignItems: 'flex-start',
    columnGap: tokens.spacingHorizontalM,
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalL),
    backgroundColor: tokens.colorStatusWarningBackground1,
    ...shorthands.border('1px', 'solid', tokens.colorStatusWarningBorder1),
    borderRadius: tokens.borderRadiusMedium,
    marginBottom: tokens.spacingVerticalL
  },
  driftIcon: { color: tokens.colorStatusWarningForeground1, flexShrink: 0, marginTop: '2px' },
  driftText: { flex: 1, display: 'flex', flexDirection: 'column', rowGap: tokens.spacingVerticalXXS },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: tokens.spacingHorizontalM,
    marginBottom: tokens.spacingVerticalL
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    rowGap: tokens.spacingVerticalXS,
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalL),
    backgroundColor: tokens.colorNeutralBackground2
  },
  statHead: {
    display: 'flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalS,
    color: tokens.colorNeutralForeground3
  },
  statValue: {
    fontSize: tokens.fontSizeHero700,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    lineHeight: tokens.lineHeightHero700,
    fontVariantNumeric: 'tabular-nums'
  },
  statValueText: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    lineHeight: tokens.lineHeightBase400
  },
  statLabel: { color: tokens.colorNeutralForeground3 },
  statAlert: {
    backgroundColor: tokens.colorStatusWarningBackground1,
    ...shorthands.border('1px', 'solid', tokens.colorStatusWarningBorder1)
  },
  statWarn: {
    backgroundColor: tokens.colorStatusDangerBackground1,
    ...shorthands.border('1px', 'solid', tokens.colorStatusDangerBorder1)
  },
  elevateBtn: { marginTop: tokens.spacingVerticalXS, alignSelf: 'flex-start' }
});

export function Dashboard() {
  const s = useStyles();
  const tweaks = useTweaks((s) => s.tweaks);
  const states = useTweaks((s) => s.states);
  const drift = useTweaks((s) => s.drift);
  const info = useTweaks((s) => s.systemInfo);
  const reapplyDriftAction = useTweaks((s) => s.reapplyDrift);
  const toast = useTweaks((s) => s.toast);

  const total = tweaks.length;
  const appliedCount = useMemo(
    () => [...states.values()].filter((s) => s.state === 'applied').length,
    [states]
  );
  const modifiedCount = useMemo(
    () => [...states.values()].filter((s) => s.state === 'modified').length,
    [states]
  );
  const driftCount = drift.length;
  const osLabel = info?.os_name?.replace('Microsoft ', '') ?? '';

  const [elevating, setElevating] = useState(false);
  const [reapplying, setReapplying] = useState(false);

  async function reapplyDrift() {
    if (reapplying) return;
    setReapplying(true);
    try {
      await reapplyDriftAction();
    } finally {
      setReapplying(false);
    }
  }

  async function restartAsAdmin() {
    if (elevating) return;
    setElevating(true);
    try {
      await invoke('restart_as_admin');
    } catch (e) {
      setElevating(false);
      toast({ kind: 'err', msg: `Elevation failed: ${e}` });
    }
  }

  return (
    <>
      <div className={s.hero}>
        <span className={s.kicker}>Welcome back</span>
        <Title1 as="h1" className={s.title} block>Reclaim your Windows.</Title1>
        <Body1 className={s.lede}>
          Reversible tweaks for privacy, bloatware, performance and more.
          Pick a preset or curate your own.
        </Body1>
      </div>

      {driftCount > 0 && (
        <div className={s.drift} role="alert">
          <Warning20Regular className={s.driftIcon} />
          <div className={s.driftText}>
            <Text weight="semibold">
              {driftCount} previously-applied tweak{driftCount === 1 ? ' is' : 's are'} no longer in effect.
            </Text>
            <Caption1>
              Windows Update or another tool may have reverted them. Re-apply restores them from the saved journal.
            </Caption1>
          </div>
          <Button appearance="primary" onClick={() => void reapplyDrift()} disabled={reapplying}>
            {reapplying ? 'Re-applying…' : `Re-apply ${driftCount}`}
          </Button>
        </div>
      )}

      <div className={s.stats}>
        <Card className={s.stat} appearance="filled-alternative">
          <div className={s.statHead}><Pulse20Regular /><Caption1>Tweaks applied</Caption1></div>
          <div className={s.statValue}>{appliedCount}</div>
          <Caption1 className={s.statLabel}>of {total} available</Caption1>
        </Card>

        <Card className={s.stat} appearance="filled-alternative">
          <div className={s.statHead}><ShieldCheckmark20Regular /><Caption1>Tweaks available</Caption1></div>
          <div className={s.statValue}>{total}</div>
          <Caption1 className={s.statLabel}>across all categories</Caption1>
        </Card>

        {modifiedCount > 0 && (
          <Card className={mergeClasses(s.stat, s.statAlert)} appearance="filled-alternative">
            <div className={s.statHead}><Warning20Regular /><Caption1>Modified externally</Caption1></div>
            <div className={s.statValue}>{modifiedCount}</div>
            <Caption1 className={s.statLabel}>partially differing from desired</Caption1>
          </Card>
        )}

        {info && (
          <>
            <Card className={s.stat} appearance="filled-alternative">
              <div className={s.statHead}><DeveloperBoard20Regular /><Caption1>System</Caption1></div>
              <div className={s.statValueText}>{osLabel || 'Windows'}</div>
              <Caption1 className={s.statLabel}>Build {info.build}</Caption1>
            </Card>

            {!info.is_admin && (
              <Card className={mergeClasses(s.stat, s.statWarn)} appearance="filled-alternative">
                <div className={s.statHead}><ErrorCircle20Regular /><Caption1>Not admin</Caption1></div>
                <div className={s.statValueText}>Not admin</div>
                <Caption1 className={s.statLabel}>Some tweaks will fail</Caption1>
                <Button
                  appearance="primary"
                  size="small"
                  className={s.elevateBtn}
                  icon={<ShieldError20Regular />}
                  onClick={() => void restartAsAdmin()}
                  disabled={elevating}
                >
                  {elevating ? 'Elevating…' : 'Restart as Administrator'}
                </Button>
              </Card>
            )}
          </>
        )}
      </div>
    </>
  );
}

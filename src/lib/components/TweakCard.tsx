import { useMemo } from 'react';
import {
  Card,
  Checkbox,
  PresenceBadge,
  Text,
  Caption1,
  makeStyles,
  mergeClasses,
  shorthands,
  tokens
} from '@fluentui/react-components';
import {
  Warning12Regular,
  Warning16Regular
} from '@fluentui/react-icons';
import { SeverityBadge } from './SeverityBadge';
import { Toggle } from './Toggle';
import type { DetectionState, Tweak, TweakStatus } from '../../types';

type Props = {
  tweak: Tweak;
  applied: boolean;
  selected: boolean;
  status?: TweakStatus | null;
  onToggleApply: () => void;
  onToggleSelected: () => void;
};

const useStyles = makeStyles({
  card: {
    display: 'grid',
    gridTemplateColumns: '20px 1fr auto',
    columnGap: tokens.spacingHorizontalL,
    alignItems: 'center',
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalXL),
    minHeight: '68px',
    backgroundColor: tokens.colorNeutralBackground2,
    transitionDuration: tokens.durationFaster,
    transitionTimingFunction: tokens.curveDecelerateMax,
    transitionProperty: 'background-color, border-color, box-shadow',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground2Hover
    }
  },
  applied: {
    backgroundColor: 'color-mix(in srgb, var(--colorBrandBackground, #4cc2ff) 7%, transparent)',
    ':hover': {
      backgroundColor: 'color-mix(in srgb, var(--colorBrandBackground, #4cc2ff) 12%, transparent)'
    }
  },
  selected: {
    backgroundColor: 'color-mix(in srgb, var(--colorBrandBackground, #4cc2ff) 12%, transparent)',
    boxShadow: `inset 0 0 0 1px ${tokens.colorBrandStroke1}`
  },
  modified: {
    backgroundColor: 'rgba(255,200,87,0.05)',
    boxShadow: 'inset 0 0 0 1px rgba(255,200,87,0.32)'
  },
  checkboxWrap: {
    display: 'flex',
    alignItems: 'flex-start',
    paddingTop: '2px'
  },
  body: { minWidth: 0 },
  header: {
    display: 'flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalSNudge,
    rowGap: tokens.spacingVerticalXS,
    marginBottom: tokens.spacingVerticalXXS,
    flexWrap: 'wrap'
  },
  title: {
    margin: 0,
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    lineHeight: tokens.lineHeightBase300
  },
  desc: {
    display: 'block',
    color: tokens.colorNeutralForeground2,
    maxWidth: '72ch'
  },
  warn: {
    marginTop: tokens.spacingVerticalS,
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalMNudge),
    backgroundColor: 'rgba(252,225,0,0.06)',
    ...shorthands.border('1px', 'solid', 'rgba(252,225,0,0.18)'),
    borderRadius: tokens.borderRadiusMedium,
    color: '#ffe680',
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
    display: 'flex',
    alignItems: 'flex-start',
    columnGap: tokens.spacingHorizontalS
  },
  warnIcon: { flexShrink: 0, marginTop: '1px' },
  footer: {
    display: 'flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalSNudge,
    rowGap: tokens.spacingVerticalXS,
    marginTop: tokens.spacingVerticalSNudge,
    flexWrap: 'wrap',
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3
  },
  ops: { fontVariantNumeric: 'tabular-nums' },
  sep: { color: tokens.colorNeutralForeground4 },
  preset: {
    ...shorthands.padding('1px', '7px'),
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground2,
    textTransform: 'capitalize',
    fontWeight: tokens.fontWeightMedium,
    fontSize: '10.5px',
    letterSpacing: '0.2px'
  },
  appliedTag: {
    display: 'inline-flex',
    alignItems: 'center',
    columnGap: '3px',
    color: tokens.colorPaletteGreenForeground1,
    fontWeight: tokens.fontWeightMedium
  },
  modifiedTag: {
    display: 'inline-flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalXS,
    color: '#ffc857',
    fontWeight: tokens.fontWeightMedium
  },
  action: { paddingTop: '1px' }
});

export function TweakCard({ tweak, applied, selected, status, onToggleApply, onToggleSelected }: Props) {
  const s = useStyles();
  const state: DetectionState = status?.state ?? (applied ? 'applied' : 'not_applied');
  const opCount = useMemo(
    () => tweak.registry.length + tweak.services.length + tweak.appx.length + (tweak.ps_apply ? 1 : 0),
    [tweak]
  );

  const cardClass = mergeClasses(
    s.card,
    applied && s.applied,
    state === 'modified' && s.modified,
    selected && s.selected
  );

  return (
    <Card appearance="filled-alternative" className={cardClass}>
      <div className={s.checkboxWrap} onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={selected}
          onChange={onToggleSelected}
          aria-label={selected ? `Deselect ${tweak.name}` : `Select ${tweak.name}`}
          size="medium"
        />
      </div>

      <div className={s.body}>
        <header className={s.header}>
          <Text as="h3" className={s.title}>{tweak.name}</Text>
          <SeverityBadge level={tweak.severity} />
        </header>

        <Caption1 className={s.desc}>{tweak.description}</Caption1>

        {tweak.warning && (
          <div className={s.warn} role="note">
            <Warning16Regular className={s.warnIcon} />
            <span>{tweak.warning}</span>
          </div>
        )}

        <footer className={s.footer}>
          <span className={s.ops} title={`${opCount} operation${opCount === 1 ? '' : 's'}`}>
            {opCount} op{opCount === 1 ? '' : 's'}
          </span>
          {tweak.presets.length > 0 && (
            <>
              <span className={s.sep}>·</span>
              {tweak.presets.map((p) => (
                <span key={p} className={s.preset}>{p}</span>
              ))}
            </>
          )}
          {state === 'applied' ? (
            <>
              <span className={s.sep}>·</span>
              <span className={s.appliedTag} title="Applied">
                <PresenceBadge status="available" size="small" />
              </span>
            </>
          ) : state === 'modified' ? (
            <>
              <span className={s.sep}>·</span>
              <span
                className={s.modifiedTag}
                title={`${status?.ops_matching ?? 0} of ${status?.ops_total ?? 0} settings match the desired state. Another tool may have changed some of these.`}
              >
                <Warning12Regular />
                Modified externally ({status?.ops_matching}/{status?.ops_total})
              </span>
            </>
          ) : null}
        </footer>
      </div>

      <div className={s.action}>
        <Toggle checked={applied} onChange={onToggleApply} />
      </div>
    </Card>
  );
}

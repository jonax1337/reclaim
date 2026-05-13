import { Button, ToggleButton, Caption1, makeStyles, tokens } from '@fluentui/react-components';
import {
  Sparkle16Regular, Sparkle16Filled,
  ShieldDismiss16Regular, ShieldDismiss16Filled,
  Flash16Regular, Flash16Filled
} from '@fluentui/react-icons';
import type { FC } from 'react';
import { useTweaks } from '../stores/tweaks';
import type { Preset } from '../stores/tweaks';

type IconPair = { regular: FC; filled: FC };

const presets: { key: Exclude<Preset, null>; label: string; icon: IconPair; hint: string }[] = [
  { key: 'minimal',     label: 'Minimal',     icon: { regular: Sparkle16Regular,        filled: Sparkle16Filled        }, hint: 'Show file extensions, disable telemetry & Bing.' },
  { key: 'recommended', label: 'Recommended', icon: { regular: ShieldDismiss16Regular,  filled: ShieldDismiss16Filled  }, hint: 'Balanced privacy + a clean UI.' },
  { key: 'aggressive',  label: 'Aggressive',  icon: { regular: Flash16Regular,          filled: Flash16Filled          }, hint: 'Strip Xbox, location, optional features.' }
];

const useStyles = makeStyles({
  row: {
    display: 'flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalS,
    rowGap: tokens.spacingVerticalS,
    flexWrap: 'wrap'
  },
  label: { color: tokens.colorNeutralForeground3, marginRight: tokens.spacingHorizontalXXS }
});

export function PresetChips() {
  const s = useStyles();
  const preset = useTweaks((st) => st.preset);
  const applyPreset = useTweaks((st) => st.applyPreset);

  return (
    <div className={s.row}>
      <Caption1 className={s.label}>Presets:</Caption1>
      {presets.map((p) => {
        const active = preset === p.key;
        const IconComp = (active ? p.icon.filled : p.icon.regular) as FC<{ className?: string }>;
        return (
          <ToggleButton
            key={p.key}
            shape="circular"
            size="small"
            appearance={active ? 'primary' : 'subtle'}
            checked={active}
            icon={<IconComp />}
            title={p.hint}
            onClick={() => applyPreset(active ? null : p.key)}
          >
            {p.label}
          </ToggleButton>
        );
      })}
      {preset && (
        <Button shape="circular" size="small" appearance="transparent" onClick={() => applyPreset(null)}>
          Clear
        </Button>
      )}
    </div>
  );
}

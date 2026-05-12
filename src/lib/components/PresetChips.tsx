import './PresetChips.css';
import { Icon } from './Icon';
import { useTweaks } from '../stores/tweaks';
import type { FluentIconName } from '../icons';
import type { Preset } from '../stores/tweaks';

const presets: { key: Exclude<Preset, null>; label: string; icon: FluentIconName; hint: string }[] = [
  { key: 'minimal',     label: 'Minimal',     icon: 'Sparkles',  hint: 'Show file extensions, disable telemetry & Bing.' },
  { key: 'recommended', label: 'Recommended', icon: 'ShieldOff', hint: 'Balanced privacy + a clean UI.' },
  { key: 'aggressive',  label: 'Aggressive',  icon: 'Flame',     hint: 'Strip Xbox, location, optional features.' }
];

export function PresetChips() {
  const preset = useTweaks((s) => s.preset);
  const applyPreset = useTweaks((s) => s.applyPreset);

  return (
    <div className="chips">
      <span className="lbl">Presets:</span>
      {presets.map((p) => (
        <button
          key={p.key}
          type="button"
          className={`chip${preset === p.key ? ' active' : ''}`}
          title={p.hint}
          onClick={() => applyPreset(preset === p.key ? null : p.key)}
        >
          <Icon name={p.icon} size={13} bold={preset === p.key} />
          {p.label}
        </button>
      ))}
      {preset && (
        <button type="button" className="chip clear" onClick={() => applyPreset(null)}>Clear</button>
      )}
    </div>
  );
}

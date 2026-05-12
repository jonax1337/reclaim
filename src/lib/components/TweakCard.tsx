import './TweakCard.css';
import { useMemo } from 'react';
import { Icon } from './Icon';
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

export function TweakCard({ tweak, applied, selected, status, onToggleApply, onToggleSelected }: Props) {
  const state: DetectionState = status?.state ?? (applied ? 'applied' : 'not_applied');
  const opCount = useMemo(
    () => tweak.registry.length + tweak.services.length + tweak.appx.length + (tweak.ps_apply ? 1 : 0),
    [tweak]
  );

  const cls = [
    'tweak-card',
    applied ? 'applied' : '',
    selected ? 'selected' : '',
    state === 'modified' ? 'modified' : '',
    tweak.severity === 'risky' ? 'risky' : ''
  ].filter(Boolean).join(' ');

  return (
    <article className={cls}>
      <button
        type="button"
        className="select"
        role="checkbox"
        aria-checked={selected}
        aria-label={selected ? `Deselect ${tweak.name}` : `Select ${tweak.name}`}
        onClick={(e) => { e.stopPropagation(); onToggleSelected(); }}
      >
        {selected && <Icon name="Check" size={12} bold />}
      </button>

      <div className="body">
        <header>
          <h3>{tweak.name}</h3>
          <SeverityBadge level={tweak.severity} />
        </header>

        <p className="desc">{tweak.description}</p>

        {tweak.warning && (
          <div className="warn">
            <Icon name="AlertTriangle" size={13} />
            <span>{tweak.warning}</span>
          </div>
        )}

        <footer>
          <span className="ops" title={`${opCount} operation${opCount === 1 ? '' : 's'}`}>
            {opCount} op{opCount === 1 ? '' : 's'}
          </span>
          {tweak.presets.length > 0 && (
            <>
              <span className="dot-sep">·</span>
              {tweak.presets.map((p) => (
                <span key={p} className="preset">{p}</span>
              ))}
            </>
          )}
          {state === 'applied' ? (
            <>
              <span className="dot-sep">·</span>
              <span className="applied-tag"><Icon name="Check" size={10} bold /> Applied</span>
            </>
          ) : state === 'modified' ? (
            <>
              <span className="dot-sep">·</span>
              <span
                className="modified-tag"
                title={`${status?.ops_matching ?? 0} of ${status?.ops_total ?? 0} settings match the desired state. Another tool may have changed some of these.`}
              >
                <Icon name="AlertTriangle" size={10} />
                Modified externally ({status?.ops_matching}/{status?.ops_total})
              </span>
            </>
          ) : null}
        </footer>
      </div>

      <div className="action">
        <Toggle checked={applied} onChange={onToggleApply} />
      </div>
    </article>
  );
}

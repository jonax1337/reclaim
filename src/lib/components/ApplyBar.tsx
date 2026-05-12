import './ApplyBar.css';
import { useEffect, useMemo, useState } from 'react';
import { Icon } from './Icon';
import { useTweaks } from '../stores/tweaks';
import { useSettings } from '../stores/settings';
import { DiffDialog } from './DiffDialog';

export function ApplyBar() {
  const selected = useTweaks((s) => s.selected);
  const tweaks = useTweaks((s) => s.tweaks);
  const applySelection = useTweaks((s) => s.applySelection);
  const restorePointDefault = useSettings((s) => s.restorePointDefault);

  const count = selected.size;
  const hasRisky = useMemo(
    () => tweaks.some((t) => selected.has(t.id) && t.severity === 'risky'),
    [tweaks, selected]
  );
  const smartRP = count >= 5 || hasRisky;

  const [restorePoint, setRestorePoint] = useState(restorePointDefault || smartRP);
  const [diffOpen, setDiffOpen] = useState(false);

  useEffect(() => {
    setRestorePoint(restorePointDefault || smartRP);
  }, [restorePointDefault, smartRP]);

  const selectedIds = useMemo(() => [...selected], [selected]);

  function clearSelection() {
    useTweaks.setState({ selected: new Set() });
  }

  return (
    <>
      {count > 0 && (
        <div className="apply-bar">
          <div className="count">
            <span className="num">{count}</span>
            <span className="label">tweak{count === 1 ? '' : 's'} selected</span>
            <button className="clear" onClick={clearSelection}>Clear</button>
          </div>

          <div className="divider" aria-hidden="true" />

          <label className="rp">
            <input
              type="checkbox"
              checked={restorePoint}
              onChange={(e) => setRestorePoint(e.target.checked)}
            />
            <Icon name="ShieldCheck" size={13} />
            <span>Restore point first</span>
          </label>

          <button
            className="ghost"
            onClick={() => setDiffOpen(true)}
            title="Preview every system change before committing"
          >
            <Icon name="SearchCheck" size={13} />
            Preview
          </button>

          <button className="primary" onClick={() => void applySelection(restorePoint)}>
            <Icon name="Play" size={13} bold />
            Apply selected
          </button>
        </div>
      )}

      <DiffDialog open={diffOpen} onOpenChange={setDiffOpen} ids={selectedIds} />
    </>
  );
}

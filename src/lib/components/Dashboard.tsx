import { useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Icon } from './Icon';
import { useTweaks } from '../stores/tweaks';
import './Dashboard.css';

export function Dashboard() {
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
      <div className="dash-hero">
        <span className="dash-kicker">Welcome back</span>
        <h1>Reclaim your Windows.</h1>
        <p className="dash-lede">
          Reversible tweaks for privacy, bloatware, performance and more.
          Pick a preset or curate your own.
        </p>
      </div>

      {driftCount > 0 && (
        <div className="dash-drift">
          <Icon name="AlertTriangle" size={16} />
          <div className="dash-drift-text">
            <strong>{driftCount} previously-applied tweak{driftCount === 1 ? ' is' : 's are'} no longer in effect.</strong>
            <span>Windows Update or another tool may have reverted them. Re-apply restores them from the saved journal.</span>
          </div>
          <button className="dash-drift-btn" onClick={() => void reapplyDrift()} disabled={reapplying}>
            {reapplying ? 'Re-applying…' : `Re-apply ${driftCount}`}
          </button>
        </div>
      )}

      <div className="dash-stats">
        <div className="dash-stat">
          <div className="dash-icon"><Icon name="Activity" size={16} /></div>
          <div className="dash-value">{appliedCount}</div>
          <div className="dash-label">Tweaks applied</div>
        </div>

        <div className="dash-stat">
          <div className="dash-icon"><Icon name="ShieldCheck" size={16} /></div>
          <div className="dash-value">{total}</div>
          <div className="dash-label">Tweaks available</div>
        </div>

        {modifiedCount > 0 && (
          <div className="dash-stat alert">
            <div className="dash-icon"><Icon name="AlertTriangle" size={16} /></div>
            <div className="dash-value">{modifiedCount}</div>
            <div className="dash-label">Modified externally</div>
          </div>
        )}

        {info && (
          <>
            <div className="dash-stat">
              <div className="dash-icon"><Icon name="Cpu" size={16} /></div>
              <div className="dash-value text">{osLabel || 'Windows'}</div>
              <div className="dash-label">Build {info.build}</div>
            </div>

            {!info.is_admin && (
              <div className="dash-stat warn">
                <div className="dash-icon"><Icon name="AlertOctagon" size={16} /></div>
                <div className="dash-value text">Not admin</div>
                <div className="dash-label">Some tweaks will fail</div>
                <button
                  className="dash-elevate"
                  onClick={() => void restartAsAdmin()}
                  disabled={elevating}
                  type="button"
                >
                  <Icon name="ShieldAlert" size={13} bold />
                  {elevating ? 'Elevating…' : 'Restart as Administrator'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

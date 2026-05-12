import { useEffect, useState, type CSSProperties } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Icon } from './Icon';
import { useTweaks } from '../stores/tweaks';
import type { FluentIconName } from '../icons';
import type { Profile } from '../../types';
import './ProfilesPanel.css';

export function ProfilesPanel() {
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
    // After selectProfile runs synchronously, read the latest selected size from store.
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

  // Keep `selected` referenced so the summary recomputes when selection updates.
  void selected;

  return (
    <div className="profiles">
      <p className="profiles-lede">
        Curated bundles. Click a profile to select every tweak in it; Apply runs them all.
        The progress ring shows how much of the profile is already in place — including changes you made outside this app.
      </p>

      {loading && profiles.length === 0 ? (
        <p className="profiles-status">Loading…</p>
      ) : (
        <div className="profiles-grid">
          {profiles.map((p) => {
            const s = summarise(p);
            const pct = s.total === 0 ? 0 : Math.round((s.applied / s.total) * 100);
            const ringStyle = { '--pct': `${pct}%` } as CSSProperties;
            return (
              <article className="profile-card" key={p.id}>
                <header>
                  <div className="profile-icon-wrap">
                    <Icon name={p.icon as FluentIconName} size={20} />
                  </div>
                  <div className="profile-title">
                    <h3>{p.name}</h3>
                    <p className="profile-count">{s.applied}/{s.total} applied</p>
                  </div>
                  <div
                    className="profile-ring"
                    style={ringStyle}
                    title={`${pct}% of this profile is currently applied`}
                  >
                    {pct}%
                  </div>
                </header>
                <p className="profile-desc">{p.description}</p>
                <div className="profile-actions">
                  <button className="ghost" onClick={() => handleSelect(p)}>
                    Select tweaks
                  </button>
                  <button
                    className="primary"
                    onClick={() => handleApply(p)}
                    disabled={s.notApplied === 0}
                  >
                    {s.notApplied === 0 ? 'Fully applied' : `Apply ${s.notApplied}`}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import { onMount } from 'svelte';
  import Icon from './Icon.svelte';
  import { store } from '../stores/tweaks.svelte';
  import type { Profile } from '../types';

  let profiles = $state<Profile[]>([]);
  let loading = $state(false);

  async function load() {
    loading = true;
    try {
      profiles = await invoke<Profile[]>('list_profiles');
    } catch (e) {
      store.toast({ kind: 'err', msg: `Profiles: ${e}` });
    } finally {
      loading = false;
    }
  }

  function summarise(p: Profile) {
    let applied = 0;
    let notApplied = 0;
    for (const id of p.tweak_ids) {
      if (store.stateOf(id) === 'applied') applied++;
      else notApplied++;
    }
    return { total: p.tweak_ids.length, applied, notApplied };
  }

  function selectProfile(p: Profile) {
    store.selectProfile(p.tweak_ids);
    store.toast({
      kind: 'info',
      msg: `${p.name}: ${store.selected.size} tweak${store.selected.size === 1 ? '' : 's'} selected. Hit Apply to commit.`
    });
  }

  async function applyProfile(p: Profile) {
    const stats = summarise(p);
    if (stats.notApplied === 0) {
      store.toast({ kind: 'info', msg: `${p.name}: already fully applied.` });
      return;
    }
    store.confirm({
      title: `Apply "${p.name}"?`,
      body: `${p.description}\n\nWill apply ${stats.notApplied} tweak${stats.notApplied === 1 ? '' : 's'} (${stats.applied} already applied).`,
      confirmLabel: `Apply ${stats.notApplied}`,
      onconfirm: async () => {
        store.selectProfile(p.tweak_ids);
        await store.applySelection(stats.notApplied >= 5);
      }
    });
  }

  onMount(load);
</script>

<div class="profiles">
  <p class="lede">
    Curated bundles. Click a profile to select every tweak in it; Apply runs them all.
    The progress ring shows how much of the profile is already in place — including changes you made outside this app.
  </p>

  {#if loading && profiles.length === 0}
    <p class="status">Loading…</p>
  {:else}
    <div class="grid">
      {#each profiles as p (p.id)}
        {@const s = summarise(p)}
        {@const pct = s.total === 0 ? 0 : Math.round((s.applied / s.total) * 100)}
        <article class="card">
          <header>
            <div class="icon-wrap"><Icon name={p.icon as any} size={20} /></div>
            <div class="title">
              <h3>{p.name}</h3>
              <p class="count">{s.applied}/{s.total} applied</p>
            </div>
            <div
              class="ring"
              style="--pct: {pct}%"
              title="{pct}% of this profile is currently applied"
            >
              {pct}%
            </div>
          </header>
          <p class="desc">{p.description}</p>
          <div class="actions">
            <button class="ghost" onclick={() => selectProfile(p)}>
              Select tweaks
            </button>
            <button class="primary" onclick={() => applyProfile(p)} disabled={s.notApplied === 0}>
              {s.notApplied === 0 ? 'Fully applied' : `Apply ${s.notApplied}`}
            </button>
          </div>
        </article>
      {/each}
    </div>
  {/if}
</div>

<style>
  .profiles {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .lede {
    margin: 0 0 4px;
    color: var(--text-secondary);
    font-size: 13px;
    line-height: 1.5;
    max-width: 80ch;
  }
  .status { color: var(--text-tertiary); }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 14px;
  }
  .card {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 16px;
    background: var(--surface-card);
    border: 1px solid var(--stroke-subtle);
    border-radius: var(--radius-md);
    transition: all var(--motion-fast) var(--ease-decel);
  }
  .card:hover {
    background: var(--surface-card-hover);
    border-color: var(--stroke-default);
    box-shadow: var(--shadow-card);
  }
  header {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 12px;
    align-items: center;
  }
  .icon-wrap {
    width: 36px; height: 36px;
    display: grid;
    place-items: center;
    border-radius: var(--radius-sm);
    background: var(--accent-overlay-weak);
    color: var(--accent-fill);
  }
  .title h3 {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
  }
  .count {
    margin: 2px 0 0;
    font-size: 11px;
    color: var(--text-tertiary);
    font-variant-numeric: tabular-nums;
  }
  .ring {
    width: 44px; height: 44px;
    border-radius: 50%;
    background:
      conic-gradient(var(--accent-fill) var(--pct), var(--stroke-subtle) var(--pct));
    display: grid;
    place-items: center;
    font-size: 10.5px;
    font-weight: 600;
    color: var(--text-primary);
    position: relative;
  }
  .ring::before {
    content: "";
    position: absolute;
    inset: 4px;
    border-radius: 50%;
    background: var(--surface-card);
  }
  .ring { isolation: isolate; }
  .ring::before { z-index: -1; }
  .desc {
    margin: 0;
    color: var(--text-secondary);
    font-size: 12.5px;
    line-height: 1.5;
  }
  .actions {
    display: flex;
    gap: 8px;
    margin-top: 4px;
  }
  .actions button {
    flex: 1;
    padding: 6px 12px;
    font-size: 12.5px;
    font-weight: 500;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--motion-fast) var(--ease-decel);
  }
  .ghost {
    background: transparent;
    border: 1px solid var(--stroke-default);
    color: var(--text-primary);
  }
  .ghost:hover { background: var(--surface-card-hover); }
  .primary {
    background: var(--accent-fill);
    border: 1px solid var(--accent-fill);
    color: var(--text-on-accent);
  }
  .primary:hover:not(:disabled) { filter: brightness(1.08); }
  .primary:disabled {
    background: var(--surface-card-active);
    border-color: var(--stroke-subtle);
    color: var(--text-tertiary);
    cursor: not-allowed;
  }
</style>

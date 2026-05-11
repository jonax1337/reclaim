<script lang="ts">
  import Icon from './Icon.svelte';
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { store } from '../stores/tweaks.svelte';
  import SeverityBadge from './SeverityBadge.svelte';
  import type { Severity } from '../types';

  interface ActivityEntry {
    id: string;
    name: string;
    category: string;
    severity: string;
    /** Unix seconds since epoch. */
    applied_at: number;
  }

  let entries = $state<ActivityEntry[]>([]);
  let loading = $state(false);
  let busy = $state<Set<string>>(new Set());

  async function load() {
    loading = true;
    try {
      entries = await invoke<ActivityEntry[]>('list_activity');
    } catch (e) {
      store.toast({ kind: 'err', msg: `Activity: ${e}` });
    } finally {
      loading = false;
    }
  }

  onMount(load);

  function relative(unix: number): string {
    if (!Number.isFinite(unix) || unix === 0) return '—';
    const ms = Date.now() - unix * 1000;
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d}d ago`;
    return new Date(unix * 1000).toLocaleDateString();
  }

  async function revert(e: ActivityEntry) {
    const next = new Set(busy); next.add(e.id); busy = next;
    try {
      await invoke('revert_tweak', { id: e.id });
      entries = entries.filter((x) => x.id !== e.id);
      const a = new Set(store.applied); a.delete(e.id); store.applied = a;
      store.toast({ kind: 'ok', msg: `Reverted: ${e.name}` });
    } catch (err) {
      store.toast({ kind: 'err', msg: `${e.name}: ${err}` });
    } finally {
      const n = new Set(busy); n.delete(e.id); busy = n;
    }
  }
</script>

<div class="hdr">
  <p class="lede">
    Every applied tweak is journalled to <code>%APPDATA%\Reclaim\backups\</code>.
    Reverting restores the original registry values, service start types, and re-registers AppX packages.
  </p>
  <button class="refresh" onclick={load}>
    <Icon name="RefreshCw" size={13} class={loading ? 'spin' : ''} />
    Reload
  </button>
</div>

{#if entries.length === 0 && !loading}
  <div class="empty">
    <Icon name="Inbox" size={28} />
    <p>No tweaks applied yet.</p>
    <span>Apply something — it will show up here so you can roll it back later.</span>
  </div>
{:else}
  <div class="list">
    {#each entries as e (e.id)}
      <div class="item">
        <div class="left">
          <strong>{e.name}</strong>
          <div class="meta">
            {#if e.severity}
              <SeverityBadge level={e.severity as Severity} />
            {/if}
            {#if e.category}<span class="cat">{e.category}</span>{/if}
            <span class="time">{relative(e.applied_at)}</span>
            <code class="id">{e.id}</code>
          </div>
        </div>
        <button
          class="revert"
          disabled={busy.has(e.id)}
          onclick={() => revert(e)}
        >
          <Icon name="Undo2" size={13} />
          Revert
        </button>
      </div>
    {/each}
  </div>
{/if}

<style>
  .hdr {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 16px;
  }
  .lede {
    margin: 0;
    color: var(--text-secondary);
    font-size: 13px;
    line-height: 1.55;
    max-width: 70ch;
  }
  code { font-family: var(--font-mono); font-size: 12px; padding: 1px 6px; background: var(--surface-card-active); border-radius: 3px; }

  .refresh {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: var(--radius-sm);
    background: var(--surface-card);
    border: 1px solid var(--stroke-subtle);
    color: var(--text-secondary);
    font-size: 12px;
    transition: all var(--motion-fast) var(--ease-decel);
  }
  .refresh:hover { background: var(--surface-card-hover); color: var(--text-primary); }
  .refresh :global(.spin) { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .list { display: flex; flex-direction: column; gap: 6px; }
  .item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    background: var(--surface-card);
    border: 1px solid var(--stroke-subtle);
    border-radius: var(--radius-md);
    transition: background-color var(--motion-fast) var(--ease-decel);
  }
  .item:hover { background: var(--surface-card-hover); }
  .left { flex: 1; min-width: 0; }
  .left strong { font-size: 13px; font-weight: 600; color: var(--text-primary); }

  .meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
    font-size: 11px;
    color: var(--text-tertiary);
    flex-wrap: wrap;
  }
  .cat { text-transform: capitalize; }
  .time { font-variant-numeric: tabular-nums; }
  .id { font-family: var(--font-mono); font-size: 10.5px; }

  .revert {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 12px;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-primary);
    border: 1px solid var(--stroke-default);
    font-size: 12px;
    font-weight: 500;
    transition: all var(--motion-fast) var(--ease-decel);
  }
  .revert:hover:not([disabled]) {
    background: rgba(255,153,164,0.10);
    color: var(--severity-risky);
    border-color: rgba(255,153,164,0.30);
  }
  .revert[disabled] { opacity: 0.5; cursor: progress; }

  .empty {
    text-align: center;
    padding: 80px 0;
    color: var(--text-tertiary);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }
  .empty :global(svg) { color: var(--text-disabled); }
  .empty p { margin: 0; font-size: 14px; color: var(--text-secondary); }
  .empty span { font-size: 12px; max-width: 40ch; }
</style>

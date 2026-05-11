<script lang="ts">
  import Icon from './Icon.svelte';
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { store } from '../stores/tweaks.svelte';
  import Toggle from './Toggle.svelte';

  interface StartupItem {
    name: string;
    command: string;
    source: string;
    user: string;
    enabled: boolean;
  }

  let items = $state<StartupItem[]>([]);
  let loading = $state(false);
  let busy = $state<Set<string>>(new Set());
  let query = $state('');

  async function load() {
    loading = true;
    try {
      items = await invoke<StartupItem[]>('list_startup');
    } catch (e) {
      store.toast({ kind: 'err', msg: `Startup: ${e}` });
    } finally {
      loading = false;
    }
  }

  onMount(load);

  let filtered = $derived(
    items.filter((i) =>
      query === '' ||
      i.name.toLowerCase().includes(query.toLowerCase()) ||
      i.command.toLowerCase().includes(query.toLowerCase())
    )
  );

  async function toggle(item: StartupItem) {
    if (item.source === 'Startup folder') {
      store.toast({ kind: 'info', msg: 'Startup folder items: delete the .lnk in the folder to remove.' });
      return;
    }
    const key = `${item.source}::${item.name}`;
    const n = new Set(busy); n.add(key); busy = n;
    try {
      const scope = item.source.startsWith('HKCU') ? 'hkcu' : 'hklm';
      await invoke('set_startup_enabled', { scope, name: item.name, enabled: !item.enabled });
      item.enabled = !item.enabled;
      items = [...items];
      store.toast({ kind: 'ok', msg: `${item.enabled ? 'Enabled' : 'Disabled'}: ${item.name}` });
    } catch (e) {
      store.toast({ kind: 'err', msg: `${item.name}: ${e}` });
    } finally {
      const m = new Set(busy); m.delete(key); busy = m;
    }
  }
</script>

<div class="toolbar">
  <div class="search">
    <Icon name="Search" size={14} />
    <input type="search" bind:value={query} placeholder="Filter startup items…" />
  </div>
  <button class="iconbtn" onclick={load} title="Reload">
    <Icon name="RefreshCw" size={14} class={loading ? 'spin' : ''} />
  </button>
</div>

<p class="meta">
  {filtered.length} of {items.length} startup item{items.length === 1 ? '' : 's'}
</p>

<div class="list">
  {#each filtered as item (item.source + ':' + item.user + ':' + item.name)}
    {@const key = `${item.source}::${item.name}`}
    <article class="row" class:disabled={!item.enabled}>
      <div class="meta-cell">
        <strong>{item.name}</strong>
        <code class="cmd">{item.command}</code>
        <div class="sub">
          <span class="tag">{item.source}</span>
          <span>{item.user}</span>
        </div>
      </div>
      <div class="action">
        <Toggle
          checked={item.enabled}
          disabled={busy.has(key) || item.source === 'Startup folder'}
          onchange={() => toggle(item)}
        />
      </div>
    </article>
  {/each}

  {#if filtered.length === 0 && !loading}
    <p class="empty">No startup items match.</p>
  {/if}
</div>

<style>
  .toolbar { display: flex; gap: 12px; align-items: center; margin-bottom: 8px; }
  .search { position: relative; flex: 1; max-width: 380px; }
  .search input { padding-left: 28px; width: 100%; font-size: 13px; }
  .search :global(svg) { position: absolute; left: 8px; top: 50%; transform: translateY(-50%); color: var(--text-tertiary); }
  .iconbtn { color: var(--text-secondary); padding: 7px 9px; border-radius: var(--radius-sm); background: var(--surface-card); border: 1px solid var(--stroke-subtle); }
  .iconbtn:hover { background: var(--surface-card-hover); color: var(--text-primary); }
  .iconbtn :global(.spin) { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .meta { margin: 0 0 12px; font-size: 11.5px; color: var(--text-tertiary); }

  .list { display: flex; flex-direction: column; gap: 6px; }
  .row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 14px;
    align-items: center;
    padding: 12px 14px;
    background: var(--surface-card);
    border: 1px solid var(--stroke-subtle);
    border-radius: var(--radius-md);
    transition: background-color var(--motion-fast) var(--ease-decel);
  }
  .row:hover { background: var(--surface-card-hover); }
  .row.disabled { opacity: 0.55; }
  .meta-cell { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
  .meta-cell strong { font-size: 13px; font-weight: 600; }
  .cmd {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sub {
    display: flex;
    gap: 8px;
    align-items: center;
    font-size: 11px;
    color: var(--text-tertiary);
  }
  .tag {
    padding: 1px 7px;
    border-radius: 3px;
    background: var(--surface-card-active);
    color: var(--text-secondary);
    font-size: 10px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }

  .empty { text-align: center; padding: 60px 0; color: var(--text-tertiary); font-size: 13px; }
</style>

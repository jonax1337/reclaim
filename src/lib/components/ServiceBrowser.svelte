<script lang="ts">
  import Icon from './Icon.svelte';
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { store } from '../stores/tweaks.svelte';

  interface ServiceInfo {
    name: string;
    display_name: string;
    status: string;
    startup: string;
  }

  let services = $state<ServiceInfo[]>([]);
  let loading = $state(false);
  let query = $state('');
  let filterStatus = $state<'all' | 'running' | 'stopped'>('all');
  let busy = $state<Set<string>>(new Set());

  const startupOptions = ['Automatic', 'Manual', 'Disabled'];

  async function load() {
    loading = true;
    try {
      services = await invoke<ServiceInfo[]>('list_services');
    } catch (e) {
      store.toast({ kind: 'err', msg: `Could not load services: ${e}` });
    } finally {
      loading = false;
    }
  }

  onMount(load);

  let filtered = $derived.by(() => {
    const q = query.toLowerCase();
    return services.filter((s) => {
      if (filterStatus === 'running' && s.status.toLowerCase() !== 'running') return false;
      if (filterStatus === 'stopped' && s.status.toLowerCase() === 'running') return false;
      if (q && !s.name.toLowerCase().includes(q) && !s.display_name.toLowerCase().includes(q))
        return false;
      return true;
    });
  });

  function setBusy(name: string, on: boolean) {
    const n = new Set(busy);
    if (on) n.add(name); else n.delete(name);
    busy = n;
  }

  async function changeStartup(svc: ServiceInfo, value: string) {
    setBusy(svc.name, true);
    try {
      await invoke('set_service_startup', { name: svc.name, startup: value });
      svc.startup = value;
      services = [...services];
      store.toast({ kind: 'ok', msg: `${svc.display_name || svc.name} → ${value}` });
    } catch (e) {
      store.toast({ kind: 'err', msg: `${svc.name}: ${e}` });
    } finally {
      setBusy(svc.name, false);
    }
  }

  async function startSvc(svc: ServiceInfo) {
    setBusy(svc.name, true);
    try {
      await invoke('start_service', { name: svc.name });
      svc.status = 'Running';
      services = [...services];
      store.toast({ kind: 'ok', msg: `Started ${svc.name}` });
    } catch (e) {
      store.toast({ kind: 'err', msg: `${svc.name}: ${e}` });
    } finally {
      setBusy(svc.name, false);
    }
  }

  async function stopSvc(svc: ServiceInfo) {
    setBusy(svc.name, true);
    try {
      await invoke('stop_service', { name: svc.name });
      svc.status = 'Stopped';
      services = [...services];
      store.toast({ kind: 'ok', msg: `Stopped ${svc.name}` });
    } catch (e) {
      store.toast({ kind: 'err', msg: `${svc.name}: ${e}` });
    } finally {
      setBusy(svc.name, false);
    }
  }
</script>

<div class="toolbar">
  <div class="search">
    <Icon name="Search" size={14} />
    <input type="search" bind:value={query} placeholder="Filter by name or display name…" />
  </div>
  <div class="seg" role="tablist">
    {#each ['all', 'running', 'stopped'] as f}
      <button
        role="tab"
        aria-selected={filterStatus === f}
        class:active={filterStatus === f}
        onclick={() => (filterStatus = f as typeof filterStatus)}
      >{f}</button>
    {/each}
  </div>
  <button class="refresh" onclick={load} title="Reload">
    <Icon name="RefreshCw" size={14} class={loading ? 'spin' : ''} />
  </button>
</div>

<p class="meta">
  {filtered.length} of {services.length} service{services.length === 1 ? '' : 's'}
</p>

<div class="table">
  <div class="thead">
    <span>Service</span>
    <span>Status</span>
    <span>Startup</span>
    <span class="ta-r">Actions</span>
  </div>

  <div class="tbody">
    {#each filtered as svc (svc.name)}
      {@const isRunning = svc.status.toLowerCase() === 'running'}
      {@const isBusy = busy.has(svc.name)}
      <div class="row" class:busy={isBusy}>
        <div class="cell name">
          <span class="display">{svc.display_name || svc.name}</span>
          <code class="id">{svc.name}</code>
        </div>
        <div class="cell">
          <span class="status" class:running={isRunning}>
            <span class="dot"></span>
            {svc.status}
          </span>
        </div>
        <div class="cell">
          <select
            value={svc.startup}
            disabled={isBusy}
            onchange={(e) => changeStartup(svc, (e.currentTarget as HTMLSelectElement).value)}
          >
            {#each startupOptions as opt}
              <option value={opt}>{opt}</option>
            {/each}
            {#if !startupOptions.includes(svc.startup)}
              <option value={svc.startup}>{svc.startup}</option>
            {/if}
          </select>
        </div>
        <div class="cell ta-r actions">
          {#if isRunning}
            <button class="icon-btn" disabled={isBusy} title="Stop" onclick={() => stopSvc(svc)}>
              <Icon name="Square" size={12} />
            </button>
          {:else}
            <button class="icon-btn" disabled={isBusy} title="Start" onclick={() => startSvc(svc)}>
              <Icon name="Play" size={12} />
            </button>
          {/if}
        </div>
      </div>
    {/each}

    {#if filtered.length === 0 && !loading}
      <p class="empty">No services match your filter.</p>
    {/if}
  </div>
</div>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
  }
  .search { position: relative; flex: 1; max-width: 320px; }
  .search input { padding-left: 28px; width: 100%; font-size: 13px; }
  .search :global(.icon) {
    position: absolute; left: 8px; top: 50%; transform: translateY(-50%);
    color: var(--text-tertiary);
  }
  .seg {
    display: inline-flex;
    background: var(--surface-card);
    border: 1px solid var(--stroke-subtle);
    border-radius: var(--radius-sm);
    padding: 2px;
  }
  .seg button {
    padding: 4px 12px;
    font-size: 12px;
    color: var(--text-secondary);
    border-radius: 3px;
    text-transform: capitalize;
    transition: all var(--motion-fast) var(--ease-decel);
  }
  .seg button:hover { color: var(--text-primary); }
  .seg button.active {
    background: var(--surface-card-active);
    color: var(--text-primary);
    font-weight: 500;
  }
  .refresh {
    color: var(--text-secondary);
    padding: 7px 9px;
    border-radius: var(--radius-sm);
    background: var(--surface-card);
    border: 1px solid var(--stroke-subtle);
  }
  .refresh:hover { background: var(--surface-card-hover); color: var(--text-primary); }
  .refresh :global(.spin) { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .meta { margin: 0 0 12px; font-size: 11px; color: var(--text-tertiary); }

  .table {
    background: var(--surface-card);
    border: 1px solid var(--stroke-subtle);
    border-radius: var(--radius-md);
    overflow: hidden;
  }
  .thead, .row {
    display: grid;
    grid-template-columns: minmax(220px, 1fr) 110px 130px 60px;
    gap: 12px;
    align-items: center;
    padding: 10px 14px;
  }
  .thead {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    font-weight: 600;
    color: var(--text-tertiary);
    border-bottom: 1px solid var(--stroke-subtle);
    background: var(--surface-card-active);
  }
  .tbody { max-height: calc(100vh - 320px); overflow-y: auto; }
  .row {
    border-bottom: 1px solid var(--stroke-subtle);
    transition: background-color var(--motion-fast) var(--ease-decel);
    font-size: 13px;
  }
  .row:last-child { border-bottom: none; }
  .row:hover { background: var(--surface-card-hover); }
  .row.busy { opacity: 0.6; }
  .cell { min-width: 0; }
  .ta-r { text-align: right; }

  .name { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .display {
    font-weight: 500;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .id {
    font-family: var(--font-mono);
    font-size: 10.5px;
    color: var(--text-tertiary);
  }

  .status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--text-secondary);
  }
  .status .dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--text-tertiary);
  }
  .status.running { color: var(--success); }
  .status.running .dot { background: var(--success); box-shadow: 0 0 6px rgba(108,203,95,0.5); }

  select {
    width: 100%;
    padding: 5px 8px;
    background: var(--surface-card);
    color: var(--text-primary);
    border: 1px solid var(--stroke-default);
    border-radius: var(--radius-sm);
    font-family: inherit;
    font-size: 12px;
    cursor: pointer;
    transition: border-color var(--motion-fast) var(--ease-decel);
  }
  select:hover:not([disabled]) { border-color: var(--stroke-strong); }
  select:focus { outline: none; border-color: var(--accent-default); }
  select:disabled { opacity: 0.5; cursor: progress; }

  .actions { display: inline-flex; justify-content: flex-end; gap: 4px; }
  .icon-btn {
    color: var(--text-secondary);
    padding: 6px;
    border-radius: 4px;
    background: transparent;
    border: 1px solid var(--stroke-subtle);
    transition: all var(--motion-fast) var(--ease-decel);
  }
  .icon-btn:hover:not([disabled]) {
    background: var(--accent-fill); color: var(--text-on-accent); border-color: var(--accent-fill);
  }
  .icon-btn:disabled { opacity: 0.4; cursor: progress; }

  .empty { text-align: center; padding: 60px 0; color: var(--text-tertiary); font-size: 13px; }
</style>

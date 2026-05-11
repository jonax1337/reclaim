<script lang="ts">
  import Icon from './Icon.svelte';
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { store } from '../stores/tweaks.svelte';

  interface AppEntry {
    package: string;
    name: string;
    publisher: string;
    category: string;
    description: string;
    bloat: boolean;
    installed: boolean;
    version?: string | null;
    winget_id?: string | null;
  }

  let apps = $state<AppEntry[]>([]);
  let loading = $state(false);
  let busy = $state<Set<string>>(new Set());
  let query = $state('');
  let filter = $state<'all' | 'installed' | 'removed' | 'bloat'>('all');
  let selected = $state<Set<string>>(new Set());

  async function load() {
    loading = true;
    try {
      apps = await invoke<AppEntry[]>('list_apps_inventory');
    } catch (e) {
      store.toast({ kind: 'err', msg: `App inventory: ${e}` });
    } finally {
      loading = false;
    }
  }

  onMount(load);

  let filtered = $derived.by(() => {
    const q = query.toLowerCase();
    return apps.filter((a) => {
      if (filter === 'installed' && !a.installed) return false;
      if (filter === 'removed' && a.installed) return false;
      if (filter === 'bloat' && !a.bloat) return false;
      if (q && !a.name.toLowerCase().includes(q) && !a.package.toLowerCase().includes(q))
        return false;
      return true;
    });
  });

  let categories = $derived(
    Array.from(new Set(filtered.map((a) => a.category))).sort()
  );

  function setBusy(pkg: string, on: boolean) {
    const n = new Set(busy);
    if (on) n.add(pkg); else n.delete(pkg);
    busy = n;
  }

  function toggleSelected(pkg: string) {
    const n = new Set(selected);
    if (n.has(pkg)) n.delete(pkg); else n.add(pkg);
    selected = n;
  }

  async function toggleApp(app: AppEntry) {
    setBusy(app.package, true);
    try {
      if (app.installed) {
        await invoke('remove_app_package', { package: app.package });
        app.installed = false;
        apps = [...apps];
        store.toast({
          kind: 'ok',
          msg: `Removed ${app.name}`,
          action: { label: 'Undo', run: () => doInstall(app) }
        });
      } else {
        await doInstall(app);
      }
    } catch (e) {
      store.toast({ kind: 'err', msg: `${app.name}: ${e}` });
    } finally {
      setBusy(app.package, false);
    }
  }

  async function doInstall(app: AppEntry) {
    await invoke('install_known_app', { package: app.package, wingetId: app.winget_id });
    app.installed = true;
    apps = [...apps];
    store.toast({ kind: 'ok', msg: `Installed ${app.name}` });
  }

  async function batchRemove() {
    const list = filtered.filter((a) => selected.has(a.package) && a.installed);
    if (list.length === 0) return;
    store.toast({ kind: 'info', msg: `Removing ${list.length} app${list.length === 1 ? '' : 's'}…` });
    let ok = 0, fail = 0;
    for (const app of list) {
      try {
        await invoke('remove_app_package', { package: app.package });
        app.installed = false;
        ok++;
      } catch { fail++; }
    }
    apps = [...apps];
    selected = new Set();
    store.toast({ kind: fail === 0 ? 'ok' : 'err', msg: `${ok} removed${fail > 0 ? `, ${fail} failed` : ''}.` });
  }

  function selectAllVisible() {
    const n = new Set(selected);
    for (const a of filtered) if (a.installed) n.add(a.package);
    selected = n;
  }
</script>

<div class="toolbar">
  <div class="search">
    <Icon name="Search" size={14} />
    <input type="search" bind:value={query} placeholder="Search apps or package id…" />
  </div>
  <div class="seg" role="tablist">
    {#each [['all','All'],['installed','Installed'],['removed','Removed'],['bloat','Bloat only']] as [v, lbl]}
      <button
        role="tab"
        aria-selected={filter === v}
        class:active={filter === v}
        onclick={() => (filter = v as typeof filter)}
      >{lbl}</button>
    {/each}
  </div>
  <button class="iconbtn" onclick={load} title="Reload">
    <Icon name="RefreshCw" size={14} class={loading ? 'spin' : ''} />
  </button>
</div>

<div class="meta">
  <span>{filtered.length} of {apps.length} apps</span>
  {#if selected.size > 0}
    <span class="sel">
      <Icon name="CheckSquare" size={12} /> {selected.size} selected
      <button class="link" onclick={() => (selected = new Set())}>Clear</button>
      <button class="danger-btn" onclick={batchRemove}>
        <Icon name="Trash2" size={12} /> Remove selected
      </button>
    </span>
  {:else}
    <button class="link" onclick={selectAllVisible}>Select all visible installed</button>
  {/if}
</div>

{#each categories as cat}
  {@const list = filtered.filter((a) => a.category === cat)}
  {#if list.length > 0}
    <h3 class="cat">{cat}</h3>
    <div class="grid">
      {#each list as app (app.package)}
        {@const isBusy = busy.has(app.package)}
        {@const isSel = selected.has(app.package)}
        <article class="row" class:installed={app.installed} class:bloat={app.bloat} class:selected={isSel}>
          <button
            class="checkbox"
            type="button"
            role="checkbox"
            aria-checked={isSel}
            onclick={(e) => { e.stopPropagation(); toggleSelected(app.package); }}
          >
            {#if isSel}<svg viewBox="0 0 16 16" width="10" height="10" fill="none"><path d="M2 8l4 4 8-9" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>{/if}
          </button>
          <div class="info">
            <div class="head">
              <strong>{app.name}</strong>
              {#if app.bloat}<span class="tag bloat-tag">bloat</span>{/if}
              {#if !app.installed}<span class="tag removed">removed</span>{/if}
            </div>
            <div class="sub">
              <code>{app.package}</code>
              {#if app.version}<span>·</span><span>v{app.version}</span>{/if}
              {#if app.publisher}<span>·</span><span>{app.publisher}</span>{/if}
            </div>
            {#if app.description}<p class="desc">{app.description}</p>{/if}
          </div>
          <div class="actions">
            {#if app.installed}
              <button class="ibtn danger" disabled={isBusy} onclick={() => toggleApp(app)}>
                <Icon name="Trash2" size={12} /> Remove
              </button>
            {:else}
              <button
                class="ibtn primary"
                disabled={isBusy}
                title={app.winget_id ? `winget: ${app.winget_id}` : 'Tries Add-AppxPackage; falls back to MS Store'}
                onclick={() => toggleApp(app)}
              >
                <Icon name="Download" size={12} /> Install
              </button>
            {/if}
          </div>
        </article>
      {/each}
    </div>
  {/if}
{/each}

{#if filtered.length === 0 && !loading}
  <p class="empty"><Icon name="Filter" size={20} /><br/>No apps match this filter.</p>
{/if}

<style>
  .toolbar {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-bottom: 8px;
  }
  .search { position: relative; flex: 1; max-width: 380px; }
  .search input { padding-left: 28px; width: 100%; font-size: 13px; }
  .search :global(svg) {
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
    transition: all var(--motion-fast) var(--ease-decel);
  }
  .seg button:hover { color: var(--text-primary); }
  .seg button.active {
    background: var(--surface-card-active);
    color: var(--text-primary);
    font-weight: 500;
  }
  .iconbtn {
    color: var(--text-secondary);
    padding: 7px 9px;
    border-radius: var(--radius-sm);
    background: var(--surface-card);
    border: 1px solid var(--stroke-subtle);
  }
  .iconbtn:hover { background: var(--surface-card-hover); color: var(--text-primary); }
  .iconbtn :global(.spin) { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin: 4px 0 14px;
    font-size: 11.5px;
    color: var(--text-tertiary);
  }
  .sel {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--text-secondary);
  }
  .link {
    color: var(--accent-text);
    font-size: 11.5px;
    padding: 2px 8px;
    border-radius: 3px;
  }
  .link:hover { background: var(--surface-card-hover); }
  .danger-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    background: rgba(196,43,28,0.12);
    color: var(--severity-risky);
    border: 1px solid rgba(196,43,28,0.25);
    border-radius: var(--radius-sm);
    font-size: 11.5px;
    font-weight: 500;
  }
  .danger-btn:hover { background: rgba(196,43,28,0.22); }

  .cat {
    margin: 18px 0 8px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: var(--text-tertiary);
    font-weight: 600;
  }

  .grid { display: flex; flex-direction: column; gap: 6px; }
  .row {
    display: grid;
    grid-template-columns: 18px 1fr auto;
    gap: 12px;
    align-items: center;
    padding: 10px 14px;
    background: var(--surface-card);
    border: 1px solid var(--stroke-subtle);
    border-radius: var(--radius-md);
    transition: all var(--motion-fast) var(--ease-decel);
  }
  .row:hover { background: var(--surface-card-hover); }
  .row.selected {
    background: rgba(76,194,255,0.10);
    border-color: rgba(76,194,255,0.40);
  }
  .row:not(.installed) {
    opacity: 0.7;
  }

  .checkbox {
    width: 18px; height: 18px;
    border-radius: 4px;
    border: 1.5px solid var(--text-tertiary);
    background: transparent;
    color: #000;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all var(--motion-fast) var(--ease-decel);
    cursor: pointer;
    padding: 0;
  }
  .checkbox:hover { border-color: var(--text-secondary); background: var(--surface-card-hover); }
  .row.selected .checkbox {
    background: var(--accent-fill);
    border-color: var(--accent-fill);
  }

  .info { min-width: 0; }
  .head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 2px;
  }
  .head strong { font-size: 13px; font-weight: 600; }
  .tag {
    padding: 1px 6px;
    border-radius: 3px;
    font-size: 9.5px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .bloat-tag { background: rgba(252,225,0,0.10); color: var(--warning); border: 1px solid rgba(252,225,0,0.20); }
  .removed { background: var(--surface-card-active); color: var(--text-tertiary); }

  .sub {
    display: flex;
    gap: 6px;
    font-size: 11px;
    color: var(--text-tertiary);
    flex-wrap: wrap;
  }
  .sub code { font-family: var(--font-mono); }
  .desc { margin: 4px 0 0; font-size: 12px; color: var(--text-secondary); line-height: 1.4; }

  .actions { display: flex; gap: 6px; }
  .ibtn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    border-radius: var(--radius-sm);
    font-size: 12px;
    font-weight: 500;
    border: 1px solid var(--stroke-default);
    background: transparent;
    color: var(--text-primary);
    transition: all var(--motion-fast) var(--ease-decel);
  }
  .ibtn:hover:not([disabled]) { background: var(--surface-card-hover); }
  .ibtn:disabled { opacity: 0.5; cursor: progress; }
  .ibtn.primary:hover:not([disabled]) {
    background: var(--accent-fill); color: #000; border-color: var(--accent-fill);
  }
  .ibtn.danger:hover:not([disabled]) {
    background: rgba(196,43,28,0.12);
    color: var(--severity-risky);
    border-color: rgba(196,43,28,0.30);
  }

  .empty {
    text-align: center;
    color: var(--text-tertiary);
    padding: 60px 0;
    font-size: 13px;
  }
  .empty :global(svg) { color: var(--text-disabled); }
</style>

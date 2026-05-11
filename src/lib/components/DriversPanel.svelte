<script lang="ts">
  import Icon from './Icon.svelte';
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { store } from '../stores/tweaks.svelte';

  interface Gpu {
    name: string;
    driver_version: string;
    driver_date: string;
    vram_gb: number;
    vendor: string;
  }
  interface InstalledDriver {
    device: string; class: string; manufacturer: string;
    provider: string; version: string; date: string; status: string;
  }
  interface DriverUpdate {
    id: string; title: string; size_mb: number; driver_class: string;
    driver_date: string; driver_version: string; manufacturer: string;
    is_mandatory: boolean;
  }

  let tab = $state<'gpu' | 'all' | 'updates'>('gpu');

  // ----- GPU section (existing) -----
  let gpus = $state<Gpu[]>([]);
  let installing = $state<Set<string>>(new Set());
  let loadingGpu = $state(false);

  async function loadGpus() {
    loadingGpu = true;
    try {
      const info: any = await invoke('hardware_info');
      gpus = info.gpus ?? [];
    } catch (e) {
      store.toast({ kind: 'err', msg: `${e}` });
    } finally {
      loadingGpu = false;
    }
  }

  // ----- All Drivers (inventory) -----
  let drivers = $state<InstalledDriver[]>([]);
  let loadingAll = $state(false);
  let queryAll = $state('');
  let classFilter = $state('all');

  async function loadAll() {
    loadingAll = true;
    try {
      drivers = await invoke<InstalledDriver[]>('list_drivers');
    } catch (e) {
      store.toast({ kind: 'err', msg: `${e}` });
    } finally {
      loadingAll = false;
    }
  }

  let classes = $derived(['all', ...Array.from(new Set(drivers.map((d) => d.class).filter(Boolean))).sort()]);
  let driversFiltered = $derived.by(() => {
    const q = queryAll.toLowerCase();
    return drivers.filter((d) => {
      if (classFilter !== 'all' && d.class !== classFilter) return false;
      if (q && !d.device.toLowerCase().includes(q) && !d.provider.toLowerCase().includes(q)) return false;
      return true;
    });
  });

  // ----- WU driver updates -----
  let updates = $state<DriverUpdate[]>([]);
  let scanning = $state(false);
  let installingAll = $state(false);
  let selectedIds = $state<Set<string>>(new Set());
  let lastScan = $state<Date | null>(null);

  async function scan() {
    scanning = true;
    try {
      updates = await invoke<DriverUpdate[]>('scan_driver_updates');
      lastScan = new Date();
      store.toast({
        kind: updates.length > 0 ? 'info' : 'ok',
        msg: updates.length > 0
          ? `${updates.length} driver update${updates.length === 1 ? '' : 's'} available.`
          : 'No driver updates pending.'
      });
    } catch (e) {
      store.toast({ kind: 'err', msg: `Driver scan: ${e}` });
    } finally {
      scanning = false;
    }
  }

  function toggleSelected(id: string) {
    const n = new Set(selectedIds);
    if (n.has(id)) n.delete(id); else n.add(id);
    selectedIds = n;
  }

  function selectAll() {
    selectedIds = new Set(updates.map((u) => u.id));
  }

  async function installSelected() {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    installingAll = true;
    store.toast({ kind: 'info', msg: `Downloading & installing ${ids.length} driver${ids.length === 1 ? '' : 's'}… (this can take a while)` });
    try {
      const r: any = await invoke('install_driver_updates', { ids });
      store.toast({
        kind: r.failed === 0 ? 'ok' : 'err',
        msg: `${r.message}. Installed ${r.installed}, failed ${r.failed}.${r.reboot_required ? ' Reboot required.' : ''}`,
        ttl: 12000
      });
      selectedIds = new Set();
      await scan();
    } catch (e) {
      store.toast({ kind: 'err', msg: `Driver install: ${e}` });
    } finally {
      installingAll = false;
    }
  }

  // Vendor quick-install table (kept).
  const vendorTools: Record<string, { wingetId: string; label: string; download: string }> = {
    NVIDIA: { wingetId: 'Nvidia.GeForceExperience', label: 'GeForce Experience', download: 'https://www.nvidia.com/Download/index.aspx' },
    AMD:    { wingetId: 'AdvancedMicroDevices.AMDSoftwareAdrenalinEdition', label: 'AMD Adrenalin', download: 'https://www.amd.com/en/support' },
    Intel:  { wingetId: 'Intel.IntelDriverAndSupportAssistant', label: 'Intel Driver Assistant', download: 'https://www.intel.com/content/www/us/en/support/detect.html' }
  };

  function vendorColor(v: string) {
    if (v === 'NVIDIA') return '#76b900';
    if (v === 'AMD')    return '#ed1c24';
    if (v === 'Intel')  return '#0071c5';
    return 'var(--accent-default)';
  }

  function driverAgeDays(date: string): number | null {
    if (!date) return null;
    const t = Date.parse(date);
    if (Number.isNaN(t)) return null;
    return Math.floor((Date.now() - t) / 86400000);
  }

  async function installVendor(vendor: string) {
    const tool = vendorTools[vendor]; if (!tool) return;
    const next = new Set(installing); next.add(vendor); installing = next;
    try {
      store.toast({ kind: 'info', msg: `Installing ${tool.label}…` });
      await invoke('install_winget_app', { id: tool.wingetId });
      store.toast({ kind: 'ok', msg: `Installed ${tool.label}` });
    } catch (e) {
      store.toast({ kind: 'err', msg: `${tool.label}: ${e}` });
    } finally {
      const n = new Set(installing); n.delete(vendor); installing = n;
    }
  }

  onMount(() => {
    loadGpus();
    loadAll();
  });
</script>

<div class="tabs" role="tablist">
  <button role="tab" aria-selected={tab === 'gpu'}     class:active={tab === 'gpu'}     onclick={() => (tab = 'gpu')}><Icon name="Monitor" size={13} /> GPUs</button>
  <button role="tab" aria-selected={tab === 'updates'} class:active={tab === 'updates'} onclick={() => (tab = 'updates')}><Icon name="PackagePlus" size={13} /> Driver Updates {#if updates.length > 0}<span class="badge">{updates.length}</span>{/if}</button>
  <button role="tab" aria-selected={tab === 'all'}     class:active={tab === 'all'}     onclick={() => (tab = 'all')}><Icon name="Filter" size={13} /> All Drivers</button>
</div>

{#if tab === 'gpu'}
  <div class="hdr">
    <p class="lede">
      Driver versions detected via WMI. The vendor's own updater is the safest path —
      use the "Driver Updates" tab to pull updates from Windows Update without leaving the app.
    </p>
    <button class="refresh" onclick={loadGpus}><Icon name="RefreshCw" size={13} class={loadingGpu ? 'spin' : ''} /> Reload</button>
  </div>

  {#if gpus.length === 0 && !loadingGpu}
    <p class="loading">No GPUs reported.</p>
  {:else}
    <div class="grid">
      {#each gpus as gpu (gpu.name)}
        {@const age = driverAgeDays(gpu.driver_date)}
        {@const tool = vendorTools[gpu.vendor]}
        <article class="gpucard" style="--c: {vendorColor(gpu.vendor)}">
          <header>
            <Icon name="Monitor" size={16} />
            <h3>{gpu.name}</h3>
            <span class="vendor-pill">{gpu.vendor}</span>
          </header>
          <dl>
            {#if gpu.vram_gb > 0}<dt>VRAM</dt><dd>{gpu.vram_gb} GB</dd>{/if}
            <dt>Driver</dt><dd>{gpu.driver_version}</dd>
            <dt>Released</dt>
            <dd>
              {gpu.driver_date || '—'}
              {#if age !== null}<span class="age" class:stale={age > 180}>· {age}d ago</span>{/if}
            </dd>
          </dl>
          {#if age !== null && age > 180}
            <p class="warn">Driver is over 6 months old. Consider updating.</p>
          {/if}
          {#if tool}
            <footer>
              <button class="primary" disabled={installing.has(gpu.vendor)} onclick={() => installVendor(gpu.vendor)}>
                <Icon name="Download" size={13} /> {installing.has(gpu.vendor) ? 'Installing…' : `Install ${tool.label}`}
              </button>
              <a class="link" href={tool.download} target="_blank" rel="noreferrer noopener">
                <Icon name="ExternalLink" size={13} /> Manual download
              </a>
            </footer>
          {/if}
        </article>
      {/each}
    </div>
  {/if}

{:else if tab === 'updates'}
  <div class="hdr">
    <p class="lede">
      Pulls driver updates from Windows Update via the COM API. Microsoft signs &amp; hosts these on
      behalf of the vendors. <strong>Admin required.</strong>
      {#if lastScan}<span class="meta-inline">Last scan: {lastScan.toLocaleTimeString()}</span>{/if}
    </p>
    <div class="hdr-actions">
      <button class="primary scan" disabled={scanning || installingAll} onclick={scan}>
        <Icon name="SearchCheck" size={13} class={scanning ? 'spin' : ''} />
        {scanning ? 'Scanning…' : 'Scan for updates'}
      </button>
    </div>
  </div>

  {#if updates.length > 0}
    <div class="action-bar">
      <span>{selectedIds.size} of {updates.length} selected</span>
      <button class="link" onclick={selectAll}>Select all</button>
      <button class="link" onclick={() => (selectedIds = new Set())}>Clear</button>
      <button
        class="primary install-btn"
        disabled={selectedIds.size === 0 || installingAll}
        onclick={installSelected}
      >
        <Icon name="Download" size={13} class={installingAll ? 'spin' : ''} />
        {installingAll ? 'Installing…' : `Install ${selectedIds.size}`}
      </button>
    </div>

    <div class="upd-list">
      {#each updates as u (u.id)}
        {@const sel = selectedIds.has(u.id)}
        <article class="upd" class:selected={sel}>
          <button
            class="checkbox"
            role="checkbox"
            aria-checked={sel}
            onclick={() => toggleSelected(u.id)}
          >
            {#if sel}<svg viewBox="0 0 16 16" width="10" height="10" fill="none"><path d="M2 8l4 4 8-9" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>{/if}
          </button>
          <div class="upd-meta">
            <strong>{u.title}</strong>
            <div class="sub">
              {#if u.manufacturer}<span>{u.manufacturer}</span>{/if}
              {#if u.driver_class}<span>·</span><span class="tag">{u.driver_class}</span>{/if}
              {#if u.driver_version}<span>·</span><span>v{u.driver_version}</span>{/if}
              {#if u.driver_date}<span>·</span><span>{u.driver_date}</span>{/if}
              <span>·</span><span>{u.size_mb} MB</span>
              {#if u.is_mandatory}<span class="mandatory">Mandatory</span>{/if}
            </div>
          </div>
        </article>
      {/each}
    </div>
  {:else if !scanning && lastScan}
    <div class="empty">
      <Icon name="ShieldAlert" size={28} />
      <p>No driver updates pending.</p>
      <span>Run a scan again later if you've installed new hardware.</span>
    </div>
  {:else if !scanning}
    <div class="empty">
      <Icon name="PackagePlus" size={28} />
      <p>Scan for driver updates.</p>
      <span>This contacts Windows Update directly. No third-party tools.</span>
    </div>
  {/if}

{:else}
  <div class="hdr">
    <p class="lede">All currently installed signed drivers from <code>Win32_PnPSignedDriver</code>.</p>
    <button class="refresh" onclick={loadAll}><Icon name="RefreshCw" size={13} class={loadingAll ? 'spin' : ''} /> Reload</button>
  </div>

  <div class="filter-row">
    <div class="search">
      <Icon name="Search" size={14} />
      <input type="search" bind:value={queryAll} placeholder="Filter by device or provider…" />
    </div>
    <select bind:value={classFilter}>
      {#each classes as c}<option value={c}>{c === 'all' ? 'All classes' : c}</option>{/each}
    </select>
    <span class="count">{driversFiltered.length} of {drivers.length}</span>
  </div>

  <div class="table">
    <div class="thead">
      <span>Device</span>
      <span>Class</span>
      <span>Provider</span>
      <span>Version</span>
      <span>Date</span>
    </div>
    <div class="tbody">
      {#each driversFiltered as d (d.device + d.version)}
        {@const age = driverAgeDays(d.date)}
        <div class="trow">
          <span class="dev" title={d.device}>{d.device}</span>
          <span class="class">{d.class || '—'}</span>
          <span>{d.provider}</span>
          <span class="ver">{d.version}</span>
          <span class="date">{d.date || '—'}{#if age !== null}<span class="age" class:stale={age > 365}> ({age}d)</span>{/if}</span>
        </div>
      {/each}
      {#if driversFiltered.length === 0 && !loadingAll}
        <p class="empty-row">No drivers match this filter.</p>
      {/if}
    </div>
  </div>
{/if}

<style>
  .tabs {
    display: inline-flex;
    background: var(--surface-card);
    border: 1px solid var(--stroke-subtle);
    border-radius: var(--radius-sm);
    padding: 2px;
    margin-bottom: 16px;
  }
  .tabs button {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 6px 14px;
    font-size: 12px;
    color: var(--text-secondary);
    border-radius: 3px;
    transition: all var(--motion-fast) var(--ease-decel);
  }
  .tabs button:hover { color: var(--text-primary); }
  .tabs button.active { background: var(--surface-card-active); color: var(--text-primary); font-weight: 500; }
  .badge {
    padding: 1px 7px;
    border-radius: 999px;
    background: var(--accent-fill);
    color: #000;
    font-size: 10px;
    font-weight: 600;
  }

  .hdr {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 16px;
  }
  .lede { margin: 0; color: var(--text-secondary); font-size: 13px; max-width: 70ch; line-height: 1.55; }
  .meta-inline { margin-left: 12px; color: var(--text-tertiary); font-size: 12px; }
  .hdr-actions { display: inline-flex; gap: 8px; flex-shrink: 0; }

  .refresh {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 6px 12px;
    border-radius: var(--radius-sm);
    background: var(--surface-card);
    border: 1px solid var(--stroke-subtle);
    color: var(--text-secondary);
    font-size: 12px;
  }
  .refresh:hover { background: var(--surface-card-hover); color: var(--text-primary); }
  :global(.spin) { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .primary {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 14px;
    border-radius: var(--radius-sm);
    background: var(--accent-fill);
    color: #000;
    font-size: 12px;
    font-weight: 600;
    border: 1px solid var(--accent-fill);
    transition: background-color var(--motion-fast) var(--ease-decel);
  }
  .primary:hover:not([disabled]) { background: var(--accent-strong); }
  .primary[disabled] { opacity: 0.5; cursor: progress; }

  .loading { color: var(--text-tertiary); font-size: 13px; }

  /* ----- GPUs grid ----- */
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
    gap: 12px;
  }
  .gpucard {
    padding: 18px 20px;
    background: var(--surface-card);
    border: 1px solid var(--stroke-subtle);
    border-radius: var(--radius-md);
    border-top: 3px solid var(--c);
  }
  .gpucard header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .gpucard header :global(svg) { color: var(--c); }
  .gpucard header h3 { margin: 0; flex: 1; font-size: 14px; font-weight: 600; }
  .vendor-pill {
    padding: 2px 9px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 600;
    color: var(--c);
    background: color-mix(in srgb, var(--c) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--c) 25%, transparent);
    letter-spacing: 0.4px;
  }
  dl { display: grid; grid-template-columns: 90px 1fr; row-gap: 4px; margin: 0 0 12px; font-size: 12.5px; }
  dt { color: var(--text-tertiary); }
  dd { margin: 0; color: var(--text-primary); font-variant-numeric: tabular-nums; }
  .age { color: var(--text-tertiary); }
  .age.stale { color: var(--warning); }
  .warn {
    margin: 0 0 12px; padding: 8px 10px;
    background: rgba(252,225,0,0.06); border: 1px solid rgba(252,225,0,0.18); border-radius: var(--radius-sm);
    color: #ffe680; font-size: 12px;
  }
  .gpucard footer { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .gpucard .primary {
    background: var(--c); color: #fff; border-color: var(--c);
  }
  .gpucard .primary:hover:not([disabled]) { background: var(--c); filter: brightness(1.1); }
  .link {
    display: inline-flex; align-items: center; gap: 5px;
    color: var(--text-secondary); font-size: 12px; text-decoration: none;
    padding: 5px 8px; border-radius: var(--radius-sm);
  }
  .link:hover { background: var(--surface-card-hover); color: var(--text-primary); }

  /* ----- Updates ----- */
  .action-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
    padding: 8px 12px;
    background: var(--surface-card);
    border: 1px solid var(--stroke-subtle);
    border-radius: var(--radius-md);
    font-size: 12px;
    color: var(--text-secondary);
  }
  .action-bar .install-btn { margin-left: auto; }
  .upd-list { display: flex; flex-direction: column; gap: 6px; }
  .upd {
    display: grid;
    grid-template-columns: 18px 1fr;
    gap: 12px;
    align-items: flex-start;
    padding: 12px 14px;
    background: var(--surface-card);
    border: 1px solid var(--stroke-subtle);
    border-radius: var(--radius-md);
    transition: all var(--motion-fast) var(--ease-decel);
  }
  .upd:hover { background: var(--surface-card-hover); }
  .upd.selected {
    background: rgba(76,194,255,0.10);
    border-color: rgba(76,194,255,0.40);
  }
  .checkbox {
    width: 18px; height: 18px; margin-top: 1px;
    border-radius: 4px;
    border: 1.5px solid var(--text-tertiary);
    background: transparent; color: #000;
    display: inline-flex; align-items: center; justify-content: center;
    cursor: pointer; padding: 0;
    transition: all var(--motion-fast) var(--ease-decel);
  }
  .checkbox:hover { border-color: var(--text-secondary); background: var(--surface-card-hover); }
  .upd.selected .checkbox { background: var(--accent-fill); border-color: var(--accent-fill); }

  .upd-meta { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
  .upd-meta strong { font-size: 13px; font-weight: 500; line-height: 1.4; }
  .sub {
    display: flex; flex-wrap: wrap; gap: 6px;
    font-size: 11px; color: var(--text-tertiary);
    font-variant-numeric: tabular-nums;
  }
  .tag {
    padding: 1px 7px; border-radius: 3px;
    background: var(--surface-card-active);
    color: var(--text-secondary);
    font-size: 10px; font-weight: 500;
    text-transform: uppercase; letter-spacing: 0.4px;
  }
  .mandatory {
    padding: 1px 7px; border-radius: 3px;
    background: rgba(252,225,0,0.10);
    color: var(--warning);
    font-size: 10px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.4px;
    border: 1px solid rgba(252,225,0,0.20);
  }

  .empty {
    text-align: center; padding: 80px 0;
    color: var(--text-tertiary);
    display: flex; flex-direction: column; align-items: center; gap: 10px;
  }
  .empty :global(svg) { color: var(--text-disabled); }
  .empty p { margin: 0; font-size: 14px; color: var(--text-secondary); }
  .empty span { font-size: 12px; max-width: 40ch; }

  /* ----- All drivers ----- */
  .filter-row {
    display: flex; align-items: center; gap: 12px;
    margin-bottom: 12px;
  }
  .search { position: relative; flex: 1; max-width: 380px; }
  .search input { padding-left: 28px; width: 100%; font-size: 13px; }
  .search :global(svg) {
    position: absolute; left: 8px; top: 50%; transform: translateY(-50%);
    color: var(--text-tertiary);
  }
  select {
    padding: 6px 10px;
    background: var(--surface-card);
    border: 1px solid var(--stroke-default);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-family: inherit;
    font-size: 12px;
  }
  .count { font-size: 11px; color: var(--text-tertiary); }

  .table {
    background: var(--surface-card);
    border: 1px solid var(--stroke-subtle);
    border-radius: var(--radius-md);
    overflow: hidden;
  }
  .thead, .trow {
    display: grid;
    grid-template-columns: minmax(220px, 2fr) 140px 1fr 110px 110px;
    gap: 12px;
    align-items: center;
    padding: 8px 14px;
  }
  .thead {
    font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.6px;
    font-weight: 600; color: var(--text-tertiary);
    background: var(--surface-card-active);
    border-bottom: 1px solid var(--stroke-subtle);
  }
  .tbody { max-height: calc(100vh - 340px); overflow-y: auto; }
  .trow {
    font-size: 12.5px;
    border-bottom: 1px solid var(--stroke-subtle);
    transition: background-color var(--motion-fast) var(--ease-decel);
  }
  .trow:hover { background: var(--surface-card-hover); }
  .trow:last-child { border-bottom: none; }
  .dev, .class { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .dev { color: var(--text-primary); font-weight: 500; }
  .class { color: var(--text-tertiary); font-family: var(--font-mono); font-size: 11px; }
  .ver, .date { font-variant-numeric: tabular-nums; color: var(--text-secondary); }
  .empty-row { padding: 40px; text-align: center; color: var(--text-tertiary); font-size: 13px; }
</style>

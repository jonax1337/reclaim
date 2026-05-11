<script lang="ts">
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { Cpu, Monitor, MemoryStick, HardDrive, Server, RefreshCw } from 'lucide-svelte';
  import { store } from '../stores/tweaks.svelte';

  interface HardwareInfo {
    cpu: any;
    gpus: any[];
    memory: { total_gb: number; modules: any[] };
    motherboard: any;
    disks: any[];
    bios: any;
  }

  let info = $state<HardwareInfo | null>(null);
  let loading = $state(false);

  async function load() {
    loading = true;
    try {
      info = await invoke<HardwareInfo>('hardware_info');
    } catch (e) {
      store.toast({ kind: 'err', msg: `Hardware: ${e}` });
    } finally {
      loading = false;
    }
  }

  onMount(load);

  function vendorColor(v: string) {
    if (v === 'NVIDIA') return '#76b900';
    if (v === 'AMD')    return '#ed1c24';
    if (v === 'Intel')  return '#0071c5';
    return 'var(--accent-default)';
  }
</script>

<div class="hdr">
  <p class="lede">Live snapshot from WMI / Get-PhysicalDisk. No data leaves your machine.</p>
  <button class="refresh" onclick={load}>
    <RefreshCw size={13} class={loading ? 'spin' : ''} /> Reload
  </button>
</div>

{#if !info}
  <p class="loading">Reading hardware…</p>
{:else}
  <div class="grid">
    {#if info.cpu}
      <section class="card cpu">
        <header><Cpu size={14} /><h3>Processor</h3></header>
        <strong class="big">{info.cpu.name}</strong>
        <dl>
          <dt>Cores / Threads</dt><dd>{info.cpu.cores} / {info.cpu.threads}</dd>
          <dt>Max clock</dt><dd>{(info.cpu.max_clock_mhz / 1000).toFixed(2)} GHz</dd>
          <dt>Socket</dt><dd>{info.cpu.socket}</dd>
        </dl>
      </section>
    {/if}

    {#if info.memory}
      <section class="card">
        <header><MemoryStick size={14} /><h3>Memory</h3></header>
        <strong class="big">{info.memory.total_gb} GB total</strong>
        {#if info.memory.modules.length > 0}
          <ul class="modlist">
            {#each info.memory.modules as m}
              <li>
                <span class="bank">{m.bank}</span>
                <span class="cap">{m.capacity_gb} GB</span>
                {#if m.speed_mhz > 0}<span class="speed">{m.speed_mhz} MT/s</span>{/if}
                {#if m.manufacturer}<span class="mfr">{m.manufacturer}</span>{/if}
              </li>
            {/each}
          </ul>
        {/if}
      </section>
    {/if}

    {#each info.gpus as gpu (gpu.name)}
      <section class="card">
        <header>
          <Monitor size={14} />
          <h3>Graphics</h3>
          <span class="vendor-pill" style="--c: {vendorColor(gpu.vendor)}">{gpu.vendor}</span>
        </header>
        <strong class="big">{gpu.name}</strong>
        <dl>
          {#if gpu.vram_gb > 0}<dt>VRAM</dt><dd>{gpu.vram_gb} GB</dd>{/if}
          <dt>Driver</dt><dd>{gpu.driver_version}</dd>
          <dt>Driver date</dt><dd>{gpu.driver_date || '—'}</dd>
        </dl>
      </section>
    {/each}

    {#if info.motherboard}
      <section class="card">
        <header><Server size={14} /><h3>Motherboard</h3></header>
        <strong class="big">{info.motherboard.product}</strong>
        <dl>
          <dt>Manufacturer</dt><dd>{info.motherboard.manufacturer}</dd>
          {#if info.bios}
            <dt>BIOS vendor</dt><dd>{info.bios.vendor}</dd>
            <dt>BIOS version</dt><dd>{info.bios.version}</dd>
            <dt>BIOS date</dt><dd>{info.bios.release_date || '—'}</dd>
          {/if}
        </dl>
      </section>
    {/if}

    {#if info.disks.length > 0}
      <section class="card span2">
        <header><HardDrive size={14} /><h3>Storage</h3></header>
        <table>
          <thead>
            <tr><th>Model</th><th>Size</th><th>Type</th><th>Bus</th></tr>
          </thead>
          <tbody>
            {#each info.disks as d}
              <tr>
                <td>{d.model}</td>
                <td>{d.size_gb} GB</td>
                <td>{d.media_type}</td>
                <td>{d.interface}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </section>
    {/if}
  </div>
{/if}

<style>
  .hdr {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }
  .lede { margin: 0; color: var(--text-secondary); font-size: 13px; max-width: 60ch; }
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
  }
  .refresh:hover { background: var(--surface-card-hover); color: var(--text-primary); }
  .refresh :global(.spin) { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .loading { color: var(--text-tertiary); font-size: 13px; }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 12px;
  }
  .card {
    background: var(--surface-card);
    border: 1px solid var(--stroke-subtle);
    border-radius: var(--radius-md);
    padding: 16px 18px;
  }
  .card.span2 { grid-column: span 2; }

  .card header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  .card header h3 {
    margin: 0;
    flex: 1;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: var(--text-tertiary);
  }
  .card header :global(svg) { color: var(--accent-default); }

  .big {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 2px 0 10px;
    letter-spacing: -0.1px;
  }

  .vendor-pill {
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 600;
    color: var(--c);
    background: color-mix(in srgb, var(--c) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--c) 25%, transparent);
    letter-spacing: 0.4px;
  }

  dl {
    display: grid;
    grid-template-columns: 130px 1fr;
    row-gap: 4px;
    margin: 0;
    font-size: 12.5px;
  }
  dt { color: var(--text-tertiary); }
  dd { margin: 0; color: var(--text-primary); font-variant-numeric: tabular-nums; }

  .modlist { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px; }
  .modlist li {
    display: grid;
    grid-template-columns: 80px 60px 80px 1fr;
    gap: 8px;
    font-size: 11.5px;
    align-items: center;
  }
  .bank { color: var(--text-tertiary); font-family: var(--font-mono); }
  .cap, .speed { font-variant-numeric: tabular-nums; }
  .mfr { color: var(--text-tertiary); }

  table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  th, td { text-align: left; padding: 6px 10px; border-bottom: 1px solid var(--stroke-subtle); }
  th { font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-tertiary); }
  tbody tr:last-child td { border-bottom: none; }
  td { color: var(--text-primary); font-variant-numeric: tabular-nums; }
</style>

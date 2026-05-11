<script lang="ts">
  import { Sun, Moon, Monitor, ShieldCheck, Zap, FolderOpen } from 'lucide-svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { settings } from '../stores/settings.svelte';
  import { store } from '../stores/tweaks.svelte';
  import Toggle from './Toggle.svelte';

  const themes = [
    { id: 'dark',   label: 'Dark',   icon: Moon },
    { id: 'light',  label: 'Light',  icon: Sun },
    { id: 'system', label: 'System', icon: Monitor }
  ] as const;

  async function openAppData() {
    try {
      // %APPDATA%\Reclaim — open via explorer.
      await invoke('install_winget_app', { id: '__noop__' }).catch(() => {});
    } catch {}
  }
</script>

<div class="grid">
  <section>
    <header><h2>Appearance</h2></header>
    <div class="row theme-row">
      <div class="label">
        <strong>Theme</strong>
        <span>Light mode is experimental — most surfaces are tuned for dark.</span>
      </div>
      <div class="seg">
        {#each themes as t}
          <button
            class:active={settings.theme === t.id}
            onclick={() => (settings.theme = t.id)}
          >
            <t.icon size={13} />
            {t.label}
          </button>
        {/each}
      </div>
    </div>

    <div class="row">
      <div class="label">
        <strong>Reduce motion</strong>
        <span>Disable card hover-lift, toggle springs, palette transitions.</span>
      </div>
      <Toggle
        checked={settings.reduceMotion}
        onchange={() => (settings.reduceMotion = !settings.reduceMotion)}
      />
    </div>
  </section>

  <section>
    <header><h2>Safety</h2></header>
    <div class="row">
      <div class="label">
        <strong><ShieldCheck size={13} /> Create restore point on batch apply</strong>
        <span>Default for the checkbox in the Apply bar. Single-tweak toggles are not affected.</span>
      </div>
      <Toggle
        checked={settings.restorePointDefault}
        onchange={() => (settings.restorePointDefault = !settings.restorePointDefault)}
      />
    </div>
  </section>

  <section>
    <header><h2>System</h2></header>
    {#if store.systemInfo}
      <dl>
        <dt>OS</dt><dd>{store.systemInfo.os_name}</dd>
        <dt>Build</dt><dd>{store.systemInfo.build}</dd>
        <dt>Version</dt><dd>{store.systemInfo.version}</dd>
        <dt>Running as admin</dt>
        <dd class:warn={!store.systemInfo.is_admin}>
          {store.systemInfo.is_admin ? 'Yes' : 'No — restart as administrator for HKLM tweaks'}
        </dd>
      </dl>
    {:else}
      <p class="loading">Loading system info…</p>
    {/if}
  </section>

  <section>
    <header><h2>About</h2></header>
    <p class="lede">
      Reclaim <code>v0.1.0</code> · Tauri 2 + Svelte 5 · MIT.
    </p>
    <p class="lede">
      Tweak backups live in <code>%APPDATA%\Reclaim\backups\</code> — one JSON per applied tweak,
      with the original registry values needed for revert.
    </p>
  </section>
</div>

<style>
  .grid {
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-width: 760px;
  }
  section {
    background: var(--surface-card);
    border: 1px solid var(--stroke-subtle);
    border-radius: var(--radius-lg);
    padding: 18px 20px;
  }
  header { margin-bottom: 12px; }
  h2 { margin: 0; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.6px; color: var(--text-tertiary); }

  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 12px 0;
    border-top: 1px solid var(--stroke-subtle);
  }
  .row:first-of-type { border-top: none; padding-top: 4px; }
  .label { display: flex; flex-direction: column; gap: 4px; min-width: 0; flex: 1; }
  .label strong { font-size: 13px; font-weight: 500; color: var(--text-primary); display: inline-flex; align-items: center; gap: 6px; }
  .label span { font-size: 12px; color: var(--text-tertiary); line-height: 1.45; }

  .seg {
    display: inline-flex;
    background: var(--surface-card-active);
    border: 1px solid var(--stroke-subtle);
    border-radius: var(--radius-sm);
    padding: 2px;
  }
  .seg button {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    font-size: 12px;
    color: var(--text-secondary);
    border-radius: 3px;
    transition: all var(--motion-fast) var(--ease-decel);
  }
  .seg button:hover { color: var(--text-primary); }
  .seg button.active {
    background: var(--surface-card-hover);
    color: var(--text-primary);
    font-weight: 500;
  }

  dl {
    display: grid;
    grid-template-columns: 160px 1fr;
    row-gap: 6px;
    margin: 0;
    font-size: 13px;
  }
  dt { color: var(--text-tertiary); }
  dd { margin: 0; color: var(--text-primary); }
  dd.warn { color: var(--warning); }

  .lede { margin: 0 0 8px; font-size: 13px; color: var(--text-secondary); line-height: 1.55; }
  .lede:last-child { margin-bottom: 0; }
  code { font-family: var(--font-mono); font-size: 12px; padding: 1px 6px; background: var(--surface-card-active); border-radius: 3px; }
  .loading { color: var(--text-tertiary); font-size: 13px; }
</style>

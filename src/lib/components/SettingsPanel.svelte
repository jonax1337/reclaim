<script lang="ts">
  import Icon from './Icon.svelte';
  import type { FluentIconName } from '../icons';
  import { invoke } from '@tauri-apps/api/core';
  import { open as openDialog, save as saveDialog } from '@tauri-apps/plugin-dialog';
  import { settings } from '../stores/settings.svelte';
  import { store } from '../stores/tweaks.svelte';
  import Toggle from './Toggle.svelte';
  import type { ConfigExport } from '../types';

  const themes: { id: 'dark' | 'light' | 'system'; label: string; icon: FluentIconName }[] = [
    { id: 'dark',   label: 'Dark',   icon: 'Moon' },
    { id: 'light',  label: 'Light',  icon: 'Sun' },
    { id: 'system', label: 'System', icon: 'Monitor' }
  ];

  async function openAppData() {
    try {
      // %APPDATA%\Reclaim — open via explorer.
      await invoke('install_winget_app', { id: '__noop__' }).catch(() => {});
    } catch {}
  }

  let exporting = $state(false);
  let importing = $state(false);
  let creatingRP = $state(false);

  async function exportConfig() {
    exporting = true;
    try {
      const cfg = await invoke<ConfigExport>('export_config', { label: null });
      const path = await saveDialog({
        defaultPath: `reclaim-config-${new Date().toISOString().slice(0, 10)}.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }]
      });
      if (!path) return;
      await invoke('write_text_file', { path, content: JSON.stringify(cfg, null, 2) });
      store.toast({ kind: 'ok', msg: `Exported ${cfg.applied.length} applied tweak${cfg.applied.length === 1 ? '' : 's'}.` });
    } catch (e) {
      store.toast({ kind: 'err', msg: `Export failed: ${e}` });
    } finally {
      exporting = false;
    }
  }

  async function importConfig() {
    importing = true;
    try {
      const path = await openDialog({
        multiple: false,
        directory: false,
        filters: [{ name: 'JSON', extensions: ['json'] }]
      });
      if (!path || Array.isArray(path)) return;
      const text = await invoke<string>('read_text_file', { path });
      const cfg = JSON.parse(text) as ConfigExport;
      if (!cfg.version || !Array.isArray(cfg.applied)) {
        throw new Error('Not a Reclaim config file.');
      }
      store.confirm({
        title: 'Import configuration?',
        body: `This will apply ${cfg.applied.length} tweak${cfg.applied.length === 1 ? '' : 's'} from the imported file. Tweaks already applied are skipped.`,
        confirmLabel: 'Import & apply',
        onconfirm: async () => {
          const results = await invoke<[string, boolean, string | null][]>('import_config', { config: cfg });
          const ok = results.filter((r) => r[1]).length;
          const failed = results.length - ok;
          store.toast({
            kind: failed === 0 ? 'ok' : 'err',
            msg: `Imported: ${ok} applied${failed > 0 ? `, ${failed} failed` : ''}.`
          });
          await store.refreshStates();
        }
      });
    } catch (e) {
      store.toast({ kind: 'err', msg: `Import failed: ${e}` });
    } finally {
      importing = false;
    }
  }

  async function manualRestorePoint() {
    creatingRP = true;
    try {
      await invoke('create_restore_point', { label: 'Reclaim manual checkpoint' });
      store.toast({ kind: 'ok', msg: 'System Restore point created.' });
    } catch (e) {
      store.toast({ kind: 'err', msg: `Restore point failed: ${e}` });
    } finally {
      creatingRP = false;
    }
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
            <Icon name={t.icon} size={13} bold={settings.theme === t.id} />
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
        <strong><Icon name="ShieldCheck" size={13} /> Create restore point on batch apply</strong>
        <span>Default for the checkbox in the Apply bar. Single-tweak toggles are not affected.</span>
      </div>
      <Toggle
        checked={settings.restorePointDefault}
        onchange={() => (settings.restorePointDefault = !settings.restorePointDefault)}
      />
    </div>
  </section>

  <section>
    <header><h2>Backup & Restore</h2></header>
    <div class="row">
      <div class="label">
        <strong>Create System Restore Point now</strong>
        <span>Manual checkpoint independent of any tweak. Useful before a Windows Update or driver install.</span>
      </div>
      <button class="action-btn" onclick={manualRestorePoint} disabled={creatingRP}>
        {creatingRP ? 'Creating…' : 'Create restore point'}
      </button>
    </div>
    <div class="row">
      <div class="label">
        <strong>Export configuration</strong>
        <span>Save the IDs of every currently-applied tweak as JSON. Share between machines or back up before a reinstall.</span>
      </div>
      <button class="action-btn" onclick={exportConfig} disabled={exporting}>
        {exporting ? 'Exporting…' : 'Export…'}
      </button>
    </div>
    <div class="row">
      <div class="label">
        <strong>Import configuration</strong>
        <span>Apply every tweak listed in a previously-exported JSON file. Already-applied tweaks are skipped.</span>
      </div>
      <button class="action-btn" onclick={importConfig} disabled={importing}>
        {importing ? 'Importing…' : 'Import…'}
      </button>
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
  .action-btn {
    padding: 7px 14px;
    font-size: 12.5px;
    background: var(--surface-card-active);
    border: 1px solid var(--stroke-default);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    cursor: pointer;
    transition: all var(--motion-fast) var(--ease-decel);
  }
  .action-btn:hover:not(:disabled) { background: var(--surface-card-hover); }
  .action-btn:disabled { opacity: 0.6; cursor: progress; }
</style>

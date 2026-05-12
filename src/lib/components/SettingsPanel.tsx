import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open as openDialog, save as saveDialog } from '@tauri-apps/plugin-dialog';
import { Switch, Button } from '@fluentui/react-components';
import { Icon } from './Icon';
import type { FluentIconName } from '../icons';
import { useSettings, type Theme } from '../stores/settings';
import { useTweaks } from '../stores/tweaks';
import type { ConfigExport } from '../../types';
import './SettingsPanel.css';

const themes: { id: Theme; label: string; icon: FluentIconName }[] = [
  { id: 'dark', label: 'Dark', icon: 'Moon' },
  { id: 'light', label: 'Light', icon: 'Sun' },
  { id: 'system', label: 'System', icon: 'Monitor' }
];

export function SettingsPanel() {
  const theme = useSettings((s) => s.theme);
  const setTheme = useSettings((s) => s.setTheme);
  const reduceMotion = useSettings((s) => s.reduceMotion);
  const setReduceMotion = useSettings((s) => s.setReduceMotion);
  const restorePointDefault = useSettings((s) => s.restorePointDefault);
  const setRestorePointDefault = useSettings((s) => s.setRestorePointDefault);

  const systemInfo = useTweaks((s) => s.systemInfo);
  const toast = useTweaks((s) => s.toast);
  const confirm = useTweaks((s) => s.confirm);
  const refreshStates = useTweaks((s) => s.refreshStates);

  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [creatingRP, setCreatingRP] = useState(false);

  async function exportConfig() {
    setExporting(true);
    try {
      const cfg = await invoke<ConfigExport>('export_config', { label: null });
      const path = await saveDialog({
        defaultPath: `reclaim-config-${new Date().toISOString().slice(0, 10)}.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }]
      });
      if (!path) return;
      await invoke('write_text_file', { path, content: JSON.stringify(cfg, null, 2) });
      toast({
        kind: 'ok',
        msg: `Exported ${cfg.applied.length} applied tweak${cfg.applied.length === 1 ? '' : 's'}.`
      });
    } catch (e) {
      toast({ kind: 'err', msg: `Export failed: ${e}` });
    } finally {
      setExporting(false);
    }
  }

  async function importConfig() {
    setImporting(true);
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
      confirm({
        title: 'Import configuration?',
        body: `This will apply ${cfg.applied.length} tweak${cfg.applied.length === 1 ? '' : 's'} from the imported file. Tweaks already applied are skipped.`,
        confirmLabel: 'Import & apply',
        onconfirm: async () => {
          const results = await invoke<[string, boolean, string | null][]>('import_config', { config: cfg });
          const ok = results.filter((r) => r[1]).length;
          const failed = results.length - ok;
          toast({
            kind: failed === 0 ? 'ok' : 'err',
            msg: `Imported: ${ok} applied${failed > 0 ? `, ${failed} failed` : ''}.`
          });
          await refreshStates();
        }
      });
    } catch (e) {
      toast({ kind: 'err', msg: `Import failed: ${e}` });
    } finally {
      setImporting(false);
    }
  }

  async function manualRestorePoint() {
    setCreatingRP(true);
    try {
      await invoke('create_restore_point', { label: 'Reclaim manual checkpoint' });
      toast({ kind: 'ok', msg: 'System Restore point created.' });
    } catch (e) {
      toast({ kind: 'err', msg: `Restore point failed: ${e}` });
    } finally {
      setCreatingRP(false);
    }
  }

  return (
    <div className="settings-panel">
      <div className="grid">
        <section>
          <header>
            <h2>Appearance</h2>
          </header>
          <div className="row theme-row">
            <div className="label">
              <strong>Theme</strong>
              <span>Light mode is experimental — most surfaces are tuned for dark.</span>
            </div>
            <div className="seg">
              {themes.map((t) => (
                <button
                  key={t.id}
                  className={theme === t.id ? 'active' : ''}
                  onClick={() => setTheme(t.id)}
                >
                  <Icon name={t.icon} size={13} bold={theme === t.id} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="row">
            <div className="label">
              <strong>Reduce motion</strong>
              <span>Disable card hover-lift, toggle springs, palette transitions.</span>
            </div>
            <Switch
              checked={reduceMotion}
              onChange={(_, data) => setReduceMotion(!!data.checked)}
            />
          </div>
        </section>

        <section>
          <header>
            <h2>Safety</h2>
          </header>
          <div className="row">
            <div className="label">
              <strong>
                <Icon name="ShieldCheck" size={13} /> Create restore point on batch apply
              </strong>
              <span>Default for the checkbox in the Apply bar. Single-tweak toggles are not affected.</span>
            </div>
            <Switch
              checked={restorePointDefault}
              onChange={(_, data) => setRestorePointDefault(!!data.checked)}
            />
          </div>
        </section>

        <section>
          <header>
            <h2>Backup &amp; Restore</h2>
          </header>
          <div className="row">
            <div className="label">
              <strong>Create System Restore Point now</strong>
              <span>Manual checkpoint independent of any tweak. Useful before a Windows Update or driver install.</span>
            </div>
            <Button appearance="secondary" onClick={() => void manualRestorePoint()} disabled={creatingRP}>
              {creatingRP ? 'Creating…' : 'Create restore point'}
            </Button>
          </div>
          <div className="row">
            <div className="label">
              <strong>Export configuration</strong>
              <span>Save the IDs of every currently-applied tweak as JSON. Share between machines or back up before a reinstall.</span>
            </div>
            <Button appearance="secondary" onClick={() => void exportConfig()} disabled={exporting}>
              {exporting ? 'Exporting…' : 'Export…'}
            </Button>
          </div>
          <div className="row">
            <div className="label">
              <strong>Import configuration</strong>
              <span>Apply every tweak listed in a previously-exported JSON file. Already-applied tweaks are skipped.</span>
            </div>
            <Button appearance="secondary" onClick={() => void importConfig()} disabled={importing}>
              {importing ? 'Importing…' : 'Import…'}
            </Button>
          </div>
        </section>

        <section>
          <header>
            <h2>System</h2>
          </header>
          {systemInfo ? (
            <dl>
              <dt>OS</dt>
              <dd>{systemInfo.os_name}</dd>
              <dt>Build</dt>
              <dd>{systemInfo.build}</dd>
              <dt>Version</dt>
              <dd>{systemInfo.version}</dd>
              <dt>Running as admin</dt>
              <dd className={!systemInfo.is_admin ? 'warn' : ''}>
                {systemInfo.is_admin ? 'Yes' : 'No — restart as administrator for HKLM tweaks'}
              </dd>
            </dl>
          ) : (
            <p className="loading">Loading system info…</p>
          )}
        </section>

        <section>
          <header>
            <h2>About</h2>
          </header>
          <p className="lede">
            Reclaim <code>v0.1.0</code> · Tauri 2 + React 18 · MIT.
          </p>
          <p className="lede">
            Tweak backups live in <code>%APPDATA%\Reclaim\backups\</code> — one JSON per applied tweak,
            with the original registry values needed for revert.
          </p>
        </section>
      </div>
    </div>
  );
}

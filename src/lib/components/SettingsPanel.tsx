import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open as openDialog, save as saveDialog } from '@tauri-apps/plugin-dialog';
import {
  Card,
  Switch,
  Button,
  Title3,
  Body1,
  Caption1,
  Text,
  Divider,
  Spinner,
  makeStyles,
  mergeClasses,
  shorthands,
  tokens
} from '@fluentui/react-components';
import {
  WeatherMoon20Regular, WeatherMoon20Filled,
  WeatherSunny20Regular, WeatherSunny20Filled,
  Desktop20Regular, Desktop20Filled,
  ShieldCheckmark16Regular
} from '@fluentui/react-icons';
import type { FC } from 'react';
import { useSettings, type Theme } from '../stores/settings';
import { useTweaks } from '../stores/tweaks';
import type { ConfigExport } from '../../types';

type IconPair = { regular: FC; filled: FC };
const themes: { id: Theme; label: string; icon: IconPair }[] = [
  { id: 'dark', label: 'Dark', icon: { regular: WeatherMoon20Regular, filled: WeatherMoon20Filled } },
  { id: 'light', label: 'Light', icon: { regular: WeatherSunny20Regular, filled: WeatherSunny20Filled } },
  { id: 'system', label: 'System', icon: { regular: Desktop20Regular, filled: Desktop20Filled } }
];

const useStyles = makeStyles({
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
    gap: tokens.spacingHorizontalL
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    rowGap: tokens.spacingVerticalS,
    ...shorthands.padding(tokens.spacingVerticalL, tokens.spacingHorizontalL),
    backgroundColor: tokens.colorNeutralBackground2
  },
  sectionTitle: { margin: 0, marginBottom: tokens.spacingVerticalS },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: tokens.spacingHorizontalL,
    ...shorthands.padding(tokens.spacingVerticalS, 0)
  },
  rowStack: { flexDirection: 'column', alignItems: 'stretch', rowGap: tokens.spacingVerticalS },
  label: { display: 'flex', flexDirection: 'column', rowGap: '2px', minWidth: 0, flex: 1 },
  labelHead: {
    display: 'inline-flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalXS,
    color: tokens.colorNeutralForeground1
  },
  sub: { color: tokens.colorNeutralForeground3 },
  seg: {
    display: 'inline-flex',
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusMedium,
    ...shorthands.padding('2px'),
    columnGap: '2px'
  },
  segBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalXS,
    ...shorthands.padding(tokens.spacingVerticalXS, tokens.spacingHorizontalM),
    ...shorthands.border('1px', 'solid', 'transparent'),
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: 'transparent',
    color: tokens.colorNeutralForeground2,
    cursor: 'pointer',
    fontSize: tokens.fontSizeBase200,
    ':hover': { backgroundColor: tokens.colorNeutralBackground3Hover }
  },
  segActive: {
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1)
  },
  dl: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    columnGap: tokens.spacingHorizontalL,
    rowGap: tokens.spacingVerticalXS,
    margin: 0
  },
  dt: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  dd: { margin: 0, color: tokens.colorNeutralForeground1, fontSize: tokens.fontSizeBase200 },
  warn: { color: tokens.colorStatusWarningForeground1 },
  loading: { display: 'inline-flex', alignItems: 'center', columnGap: tokens.spacingHorizontalS, color: tokens.colorNeutralForeground3 },
  code: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
    ...shorthands.padding('1px', '5px'),
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusSmall
  }
});

export function SettingsPanel() {
  const s = useStyles();
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
    <div className={s.grid}>
      <Card className={s.section} appearance="filled-alternative">
        <Title3 as="h2" className={s.sectionTitle}>Appearance</Title3>
        <div className={s.row}>
          <div className={s.label}>
            <Text weight="semibold">Theme</Text>
            <Caption1 className={s.sub}>Light mode is experimental — most surfaces are tuned for dark.</Caption1>
          </div>
          <div className={s.seg} role="tablist">
            {themes.map((t) => {
              const active = theme === t.id;
              const I = active ? t.icon.filled : t.icon.regular;
              return (
                <button
                  key={t.id}
                  className={mergeClasses(s.segBtn, active && s.segActive)}
                  onClick={() => setTheme(t.id)}
                  role="tab"
                  aria-selected={active}
                >
                  <I />{t.label}
                </button>
              );
            })}
          </div>
        </div>

        <Divider />

        <div className={s.row}>
          <div className={s.label}>
            <Text weight="semibold">Reduce motion</Text>
            <Caption1 className={s.sub}>Disable card hover-lift, toggle springs, palette transitions.</Caption1>
          </div>
          <Switch checked={reduceMotion} onChange={(_, data) => setReduceMotion(!!data.checked)} />
        </div>
      </Card>

      <Card className={s.section} appearance="filled-alternative">
        <Title3 as="h2" className={s.sectionTitle}>Safety</Title3>
        <div className={s.row}>
          <div className={s.label}>
            <Text weight="semibold" className={s.labelHead}>
              <ShieldCheckmark16Regular /> Create restore point on batch apply
            </Text>
            <Caption1 className={s.sub}>Default for the checkbox in the Apply bar. Single-tweak toggles are not affected.</Caption1>
          </div>
          <Switch checked={restorePointDefault} onChange={(_, data) => setRestorePointDefault(!!data.checked)} />
        </div>
      </Card>

      <Card className={s.section} appearance="filled-alternative">
        <Title3 as="h2" className={s.sectionTitle}>Backup &amp; Restore</Title3>
        <div className={s.row}>
          <div className={s.label}>
            <Text weight="semibold">Create System Restore Point now</Text>
            <Caption1 className={s.sub}>Manual checkpoint independent of any tweak. Useful before a Windows Update or driver install.</Caption1>
          </div>
          <Button appearance="secondary" onClick={() => void manualRestorePoint()} disabled={creatingRP}>
            {creatingRP ? 'Creating…' : 'Create restore point'}
          </Button>
        </div>
        <Divider />
        <div className={s.row}>
          <div className={s.label}>
            <Text weight="semibold">Export configuration</Text>
            <Caption1 className={s.sub}>Save the IDs of every currently-applied tweak as JSON. Share between machines or back up before a reinstall.</Caption1>
          </div>
          <Button appearance="secondary" onClick={() => void exportConfig()} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export…'}
          </Button>
        </div>
        <Divider />
        <div className={s.row}>
          <div className={s.label}>
            <Text weight="semibold">Import configuration</Text>
            <Caption1 className={s.sub}>Apply every tweak listed in a previously-exported JSON file. Already-applied tweaks are skipped.</Caption1>
          </div>
          <Button appearance="secondary" onClick={() => void importConfig()} disabled={importing}>
            {importing ? 'Importing…' : 'Import…'}
          </Button>
        </div>
      </Card>

      <Card className={s.section} appearance="filled-alternative">
        <Title3 as="h2" className={s.sectionTitle}>System</Title3>
        {systemInfo ? (
          <dl className={s.dl}>
            <dt className={s.dt}>OS</dt>
            <dd className={s.dd}>{systemInfo.os_name}</dd>
            <dt className={s.dt}>Build</dt>
            <dd className={s.dd}>{systemInfo.build}</dd>
            <dt className={s.dt}>Version</dt>
            <dd className={s.dd}>{systemInfo.version}</dd>
            <dt className={s.dt}>Running as admin</dt>
            <dd className={mergeClasses(s.dd, !systemInfo.is_admin && s.warn)}>
              {systemInfo.is_admin ? 'Yes' : 'No — restart as administrator for HKLM tweaks'}
            </dd>
          </dl>
        ) : (
          <span className={s.loading}><Spinner size="tiny" /> Loading system info…</span>
        )}
      </Card>

      <Card className={s.section} appearance="filled-alternative">
        <Title3 as="h2" className={s.sectionTitle}>About</Title3>
        <Body1 className={s.sub}>
          Reclaim <code className={s.code}>v0.1.0</code> · Tauri 2 + React 18 · MIT.
        </Body1>
        <Body1 className={s.sub}>
          Tweak backups live in <code className={s.code}>%APPDATA%\Reclaim\backups\</code> — one JSON per applied tweak,
          with the original registry values needed for revert.
        </Body1>
      </Card>
    </div>
  );
}

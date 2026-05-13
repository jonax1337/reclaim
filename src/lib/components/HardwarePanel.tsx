import { useEffect, useState } from 'react';
import {
  Card,
  Button,
  Title3,
  Caption1,
  Badge,
  Spinner,
  makeStyles,
  mergeClasses,
  shorthands,
  tokens
} from '@fluentui/react-components';
import {
  DeveloperBoard20Regular,
  Ram20Regular,
  Desktop20Regular,
  Server20Regular,
  HardDrive20Regular,
  ArrowClockwise16Regular
} from '@fluentui/react-icons';
import { invoke } from '@tauri-apps/api/core';
import { useTweaks } from '../stores/tweaks';

interface HardwareInfo {
  cpu: any;
  gpus: any[];
  memory: { total_gb: number; modules: any[] };
  motherboard: any;
  disks: any[];
  bios: any;
}

function vendorColor(v: string) {
  if (v === 'NVIDIA') return 'success';
  if (v === 'AMD') return 'danger';
  if (v === 'Intel') return 'informative';
  return 'subtle';
}

const useStyles = makeStyles({
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    columnGap: tokens.spacingHorizontalS,
    marginBottom: tokens.spacingVerticalM,
    flexWrap: 'wrap',
    rowGap: tokens.spacingVerticalS
  },
  spin: {
    animationName: { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } },
    animationDuration: '900ms',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'linear'
  },
  loading: { display: 'inline-flex', alignItems: 'center', columnGap: tokens.spacingHorizontalS, color: tokens.colorNeutralForeground3 },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: tokens.spacingHorizontalL
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    rowGap: tokens.spacingVerticalS,
    ...shorthands.padding(tokens.spacingVerticalL, tokens.spacingHorizontalL),
    backgroundColor: tokens.colorNeutralBackground2
  },
  span2: { gridColumn: 'span 2' },
  cardHead: {
    display: 'flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalS,
    color: tokens.colorNeutralForeground3
  },
  cardTitle: { margin: 0 },
  big: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1
  },
  dl: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    columnGap: tokens.spacingHorizontalL,
    rowGap: tokens.spacingVerticalXS,
    margin: 0,
    marginTop: tokens.spacingVerticalXS
  },
  dt: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  dd: { margin: 0, color: tokens.colorNeutralForeground1, fontSize: tokens.fontSizeBase200 },
  modlist: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    rowGap: tokens.spacingVerticalXS
  },
  modItem: {
    display: 'grid',
    gridTemplateColumns: 'auto auto 1fr auto',
    columnGap: tokens.spacingHorizontalM,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
    ...shorthands.padding(tokens.spacingVerticalXS, 0)
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: tokens.fontSizeBase200,
    '& th': {
      textAlign: 'left',
      ...shorthands.padding(tokens.spacingVerticalSNudge, tokens.spacingHorizontalM),
      fontWeight: tokens.fontWeightMedium,
      color: tokens.colorNeutralForeground3,
      borderBottomWidth: '1px',
      borderBottomStyle: 'solid',
      borderBottomColor: tokens.colorNeutralStroke2
    },
    '& td': {
      ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
      borderBottomWidth: '1px',
      borderBottomStyle: 'solid',
      borderBottomColor: tokens.colorNeutralStroke2,
      color: tokens.colorNeutralForeground1
    }
  }
});

export function HardwarePanel() {
  const s = useStyles();
  const toast = useTweaks((s) => s.toast);
  const [info, setInfo] = useState<HardwareInfo | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await invoke<HardwareInfo>('hardware_info');
      setInfo(res);
    } catch (e) {
      toast({ kind: 'err', msg: `Hardware: ${e}` });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className={s.toolbar}>
        <Button
          appearance="outline"
          icon={<ArrowClockwise16Regular className={loading ? s.spin : undefined} />}
          onClick={() => void load()}
        >
          Reload
        </Button>
      </div>

      {!info ? (
        <span className={s.loading}><Spinner size="tiny" /> Reading hardware…</span>
      ) : (
        <div className={s.grid}>
          {info.cpu && (
            <Card className={s.card} appearance="filled-alternative">
              <div className={s.cardHead}>
                <DeveloperBoard20Regular />
                <Title3 as="h3" className={s.cardTitle}>Processor</Title3>
              </div>
              <span className={s.big}>{info.cpu.name}</span>
              <dl className={s.dl}>
                <dt className={s.dt}>Cores / Threads</dt>
                <dd className={s.dd}>{info.cpu.cores} / {info.cpu.threads}</dd>
                <dt className={s.dt}>Max clock</dt>
                <dd className={s.dd}>{(info.cpu.max_clock_mhz / 1000).toFixed(2)} GHz</dd>
                <dt className={s.dt}>Socket</dt>
                <dd className={s.dd}>{info.cpu.socket}</dd>
              </dl>
            </Card>
          )}

          {info.memory && (
            <Card className={s.card} appearance="filled-alternative">
              <div className={s.cardHead}>
                <Ram20Regular />
                <Title3 as="h3" className={s.cardTitle}>Memory</Title3>
              </div>
              <span className={s.big}>{info.memory.total_gb} GB total</span>
              {info.memory.modules.length > 0 && (
                <ul className={s.modlist}>
                  {info.memory.modules.map((m: any, i: number) => (
                    <li key={`${m.bank}-${i}`} className={s.modItem}>
                      <span>{m.bank}</span>
                      <span>{m.capacity_gb} GB</span>
                      <span>{m.speed_mhz > 0 ? `${m.speed_mhz} MT/s` : ''}</span>
                      <span>{m.manufacturer || ''}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {info.gpus.map((gpu: any) => (
            <Card key={gpu.name} className={s.card} appearance="filled-alternative">
              <div className={s.cardHead}>
                <Desktop20Regular />
                <Title3 as="h3" className={s.cardTitle}>Graphics</Title3>
                <Badge appearance="tint" color={vendorColor(gpu.vendor) as 'success'}>{gpu.vendor}</Badge>
              </div>
              <span className={s.big}>{gpu.name}</span>
              <dl className={s.dl}>
                {gpu.vram_gb > 0 && (
                  <>
                    <dt className={s.dt}>VRAM</dt>
                    <dd className={s.dd}>{gpu.vram_gb} GB</dd>
                  </>
                )}
                <dt className={s.dt}>Driver</dt>
                <dd className={s.dd}>{gpu.driver_version}</dd>
                <dt className={s.dt}>Driver date</dt>
                <dd className={s.dd}>{gpu.driver_date || '—'}</dd>
              </dl>
            </Card>
          ))}

          {info.motherboard && (
            <Card className={s.card} appearance="filled-alternative">
              <div className={s.cardHead}>
                <Server20Regular />
                <Title3 as="h3" className={s.cardTitle}>Motherboard</Title3>
              </div>
              <span className={s.big}>{info.motherboard.product}</span>
              <dl className={s.dl}>
                <dt className={s.dt}>Manufacturer</dt>
                <dd className={s.dd}>{info.motherboard.manufacturer}</dd>
                {info.bios && (
                  <>
                    <dt className={s.dt}>BIOS vendor</dt>
                    <dd className={s.dd}>{info.bios.vendor}</dd>
                    <dt className={s.dt}>BIOS version</dt>
                    <dd className={s.dd}>{info.bios.version}</dd>
                    <dt className={s.dt}>BIOS date</dt>
                    <dd className={s.dd}>{info.bios.release_date || '—'}</dd>
                  </>
                )}
              </dl>
            </Card>
          )}

          {info.disks.length > 0 && (
            <Card className={mergeClasses(s.card, s.span2)} appearance="filled-alternative">
              <div className={s.cardHead}>
                <HardDrive20Regular />
                <Title3 as="h3" className={s.cardTitle}>Storage</Title3>
              </div>
              <table className={s.table}>
                <thead>
                  <tr><th>Model</th><th>Size</th><th>Type</th><th>Bus</th></tr>
                </thead>
                <tbody>
                  {info.disks.map((d: any, i: number) => (
                    <tr key={`${d.model}-${i}`}>
                      <td>{d.model}</td>
                      <td>{d.size_gb} GB</td>
                      <td>{d.media_type}</td>
                      <td>{d.interface}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Caption1>{info.disks.length} disk{info.disks.length === 1 ? '' : 's'} attached</Caption1>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

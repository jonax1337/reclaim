import { useEffect, useState, type CSSProperties } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Icon } from './Icon';
import { useTweaks } from '../stores/tweaks';
import './HardwarePanel.css';

interface HardwareInfo {
  cpu: any;
  gpus: any[];
  memory: { total_gb: number; modules: any[] };
  motherboard: any;
  disks: any[];
  bios: any;
}

function vendorColor(v: string) {
  if (v === 'NVIDIA') return '#76b900';
  if (v === 'AMD') return '#ed1c24';
  if (v === 'Intel') return '#0071c5';
  return 'var(--accent-default)';
}

export function HardwarePanel() {
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
    <div className="hardware-panel">
      <div className="hdr">
        <p className="lede">Live snapshot from WMI / Get-PhysicalDisk. No data leaves your machine.</p>
        <button className="refresh" onClick={() => void load()}>
          <Icon name="RefreshCw" size={13} className={loading ? 'spin' : ''} /> Reload
        </button>
      </div>

      {!info ? (
        <p className="loading">Reading hardware…</p>
      ) : (
        <div className="grid">
          {info.cpu && (
            <section className="card cpu">
              <header>
                <Icon name="Cpu" size={14} />
                <h3>Processor</h3>
              </header>
              <strong className="big">{info.cpu.name}</strong>
              <dl>
                <dt>Cores / Threads</dt>
                <dd>{info.cpu.cores} / {info.cpu.threads}</dd>
                <dt>Max clock</dt>
                <dd>{(info.cpu.max_clock_mhz / 1000).toFixed(2)} GHz</dd>
                <dt>Socket</dt>
                <dd>{info.cpu.socket}</dd>
              </dl>
            </section>
          )}

          {info.memory && (
            <section className="card">
              <header>
                <Icon name="MemoryStick" size={14} />
                <h3>Memory</h3>
              </header>
              <strong className="big">{info.memory.total_gb} GB total</strong>
              {info.memory.modules.length > 0 && (
                <ul className="modlist">
                  {info.memory.modules.map((m: any, i: number) => (
                    <li key={`${m.bank}-${i}`}>
                      <span className="bank">{m.bank}</span>
                      <span className="cap">{m.capacity_gb} GB</span>
                      {m.speed_mhz > 0 ? <span className="speed">{m.speed_mhz} MT/s</span> : <span />}
                      {m.manufacturer ? <span className="mfr">{m.manufacturer}</span> : <span />}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {info.gpus.map((gpu: any) => (
            <section
              className="card"
              key={gpu.name}
              style={{ ['--c' as any]: vendorColor(gpu.vendor) } as CSSProperties}
            >
              <header>
                <Icon name="Monitor" size={14} />
                <h3>Graphics</h3>
                <span className="vendor-pill" style={{ ['--c' as any]: vendorColor(gpu.vendor) } as CSSProperties}>
                  {gpu.vendor}
                </span>
              </header>
              <strong className="big">{gpu.name}</strong>
              <dl>
                {gpu.vram_gb > 0 && (
                  <>
                    <dt>VRAM</dt>
                    <dd>{gpu.vram_gb} GB</dd>
                  </>
                )}
                <dt>Driver</dt>
                <dd>{gpu.driver_version}</dd>
                <dt>Driver date</dt>
                <dd>{gpu.driver_date || '—'}</dd>
              </dl>
            </section>
          ))}

          {info.motherboard && (
            <section className="card">
              <header>
                <Icon name="Server" size={14} />
                <h3>Motherboard</h3>
              </header>
              <strong className="big">{info.motherboard.product}</strong>
              <dl>
                <dt>Manufacturer</dt>
                <dd>{info.motherboard.manufacturer}</dd>
                {info.bios && (
                  <>
                    <dt>BIOS vendor</dt>
                    <dd>{info.bios.vendor}</dd>
                    <dt>BIOS version</dt>
                    <dd>{info.bios.version}</dd>
                    <dt>BIOS date</dt>
                    <dd>{info.bios.release_date || '—'}</dd>
                  </>
                )}
              </dl>
            </section>
          )}

          {info.disks.length > 0 && (
            <section className="card span2">
              <header>
                <Icon name="HardDrive" size={14} />
                <h3>Storage</h3>
              </header>
              <table>
                <thead>
                  <tr>
                    <th>Model</th>
                    <th>Size</th>
                    <th>Type</th>
                    <th>Bus</th>
                  </tr>
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
            </section>
          )}
        </div>
      )}
    </div>
  );
}

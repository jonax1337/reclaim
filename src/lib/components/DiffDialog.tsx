import './DiffDialog.css';
import { useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Dialog, DialogSurface, Button } from '@fluentui/react-components';
import { Icon } from './Icon';
import { useTweaks } from '../stores/tweaks';
import type { DiffOp } from '../../types';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ids: string[];
};

function fmt(v: unknown): string {
  if (v === null || v === undefined) return '∅';
  if (typeof v === 'string') return v === '' ? '""' : v;
  return JSON.stringify(v);
}

export function DiffDialog({ open, onOpenChange, ids }: Props) {
  const toast = useTweaks((s) => s.toast);
  const [ops, setOps] = useState<DiffOp[]>([]);
  const [loading, setLoading] = useState(false);
  const [onlyChanges, setOnlyChanges] = useState(true);

  useEffect(() => {
    if (open && ids.length > 0) {
      let cancelled = false;
      setLoading(true);
      (async () => {
        try {
          const result = await invoke<DiffOp[]>('diff_tweaks', { ids });
          if (!cancelled) setOps(result);
        } catch (e) {
          if (!cancelled) {
            toast({ kind: 'err', msg: `Diff failed: ${e}` });
            setOps([]);
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => { cancelled = true; };
    } else if (!open) {
      setOps([]);
    }
  }, [open, ids, toast]);

  const visible = useMemo(
    () => onlyChanges ? ops.filter((o) => o.kind === 'powershell' || (o as { will_change?: boolean }).will_change) : ops,
    [ops, onlyChanges]
  );
  const changeCount = useMemo(
    () => ops.filter((o) => o.kind === 'powershell' || (o as { will_change?: boolean }).will_change).length,
    [ops]
  );
  const noopCount = ops.length - changeCount;

  function close() { onOpenChange(false); }

  return (
    <Dialog open={open} onOpenChange={(_, data) => onOpenChange(data.open)} modalType="modal">
      <DialogSurface className="diff-dialog-surface">
        <div className="diff-dialog-header">
          <div>
            <h2>Preview changes</h2>
            <p className="sub">
              {loading
                ? 'Inspecting system…'
                : `${changeCount} change${changeCount === 1 ? '' : 's'} · ${noopCount} already in place`}
            </p>
          </div>
          <button className="x" onClick={close} aria-label="Close"><Icon name="X" size={14} /></button>
        </div>

        <div className="diff-toolbar">
          <label>
            <input
              type="checkbox"
              checked={onlyChanges}
              onChange={(e) => setOnlyChanges(e.target.checked)}
            />
            {' '}Only show changes
          </label>
        </div>

        <div className="diff-body">
          {loading ? (
            <p className="diff-status">Loading…</p>
          ) : visible.length === 0 ? (
            <p className="diff-status">Nothing will change — every operation in this batch is already at the desired state.</p>
          ) : (
            <table className="diff-table">
              <thead>
                <tr>
                  <th>Tweak</th>
                  <th>Type</th>
                  <th>Target</th>
                  <th>Current</th>
                  <th></th>
                  <th>Desired</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((op, i) => {
                  const willChange = op.kind === 'powershell' || (op as { will_change?: boolean }).will_change;
                  return (
                    <tr key={i} className={!willChange ? 'noop' : ''}>
                      <td className="name">{op.tweak_name}</td>
                      <td className="kind">
                        {op.kind === 'registry' ? <><Icon name="Settings" size={11} /> reg</>
                          : op.kind === 'service' ? <><Icon name="Server" size={11} /> svc</>
                          : op.kind === 'appx' ? <><Icon name="Package" size={11} /> appx</>
                          : <><Icon name="Code2" size={11} /> ps</>}
                      </td>
                      {op.kind === 'registry' ? (
                        <>
                          <td className="target"><code>{op.path}\{op.name}</code></td>
                          <td className="cur"><code>{fmt(op.current)}</code></td>
                          <td className="arrow"><Icon name="ArrowRight" size={11} /></td>
                          <td className="new"><code>{fmt(op.desired)}</code></td>
                        </>
                      ) : op.kind === 'service' ? (
                        <>
                          <td className="target"><code>{op.service}</code></td>
                          <td className="cur"><code>{op.current ?? 'not found'}</code></td>
                          <td className="arrow"><Icon name="ArrowRight" size={11} /></td>
                          <td className="new"><code>{op.desired}</code></td>
                        </>
                      ) : op.kind === 'appx' ? (
                        <>
                          <td className="target"><code>{op.package}</code></td>
                          <td className="cur"><code>{op.currently_installed ? 'installed' : 'absent'}</code></td>
                          <td className="arrow"><Icon name="ArrowRight" size={11} /></td>
                          <td className="new"><code>removed</code></td>
                        </>
                      ) : (
                        <td className="target" colSpan={4}>
                          <code className="snippet">
                            {op.snippet.slice(0, 200)}{op.snippet.length > 200 ? '…' : ''}
                          </code>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="diff-footer">
          <Button appearance="secondary" onClick={close}>Close</Button>
        </div>
      </DialogSurface>
    </Dialog>
  );
}

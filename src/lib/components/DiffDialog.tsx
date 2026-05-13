import { useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Checkbox,
  Text,
  makeStyles,
  shorthands,
  tokens
} from '@fluentui/react-components';
import {
  Settings16Regular,
  Server16Regular,
  Box16Regular,
  Code16Regular,
  ArrowRight16Regular
} from '@fluentui/react-icons';
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

const useStyles = makeStyles({
  surface: {
    width: 'min(960px, 92vw)',
    maxWidth: 'min(960px, 92vw)',
    maxHeight: '85vh'
  },
  sub: {
    color: tokens.colorNeutralForeground3,
    fontVariantNumeric: 'tabular-nums'
  },
  toolbar: {
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: tokens.colorNeutralStroke2,
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: tokens.colorNeutralStroke2,
    display: 'flex',
    columnGap: tokens.spacingHorizontalM,
    alignItems: 'center'
  },
  body: {
    overflow: 'auto',
    minHeight: 0,
    maxHeight: '60vh',
    padding: 0
  },
  status: {
    ...shorthands.padding(tokens.spacingVerticalXXL),
    color: tokens.colorNeutralForeground3,
    textAlign: 'center'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: tokens.fontSizeBase200,
    '& thead': {
      position: 'sticky',
      top: 0,
      backgroundColor: tokens.colorNeutralBackground1,
      zIndex: 1
    },
    '& th': {
      textAlign: 'left',
      ...shorthands.padding(tokens.spacingVerticalSNudge, tokens.spacingHorizontalM),
      fontWeight: tokens.fontWeightMedium,
      textTransform: 'uppercase',
      fontSize: '10.5px',
      letterSpacing: '0.5px',
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
      verticalAlign: 'top'
    },
    '& tr.noop': { opacity: 0.55 }
  },
  name: {
    color: tokens.colorNeutralForeground1,
    fontWeight: tokens.fontWeightMedium,
    maxWidth: '180px'
  },
  kind: {
    color: tokens.colorNeutralForeground3,
    whiteSpace: 'nowrap',
    fontVariant: 'small-caps',
    display: 'inline-flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalXS
  },
  code: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: '11px',
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.padding('1px', '5px'),
    borderRadius: tokens.borderRadiusSmall,
    wordBreak: 'break-all'
  },
  desired: {
    color: tokens.colorBrandForeground1,
    ...shorthands.border('1px', 'solid', tokens.colorBrandStroke2Contrast)
  },
  arrow: { color: tokens.colorNeutralForeground3, width: '20px' },
  snippet: {
    display: 'block',
    whiteSpace: 'pre-wrap',
    maxHeight: '6em',
    overflow: 'hidden'
  }
});

export function DiffDialog({ open, onOpenChange, ids }: Props) {
  const s = useStyles();
  const toast = useTweaks((st) => st.toast);
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

  return (
    <Dialog open={open} onOpenChange={(_, data) => onOpenChange(data.open)} modalType="modal">
      <DialogSurface className={s.surface}>
        <DialogBody>
          <DialogTitle>
            Preview changes
            <br />
            <Text size={200} className={s.sub}>
              {loading
                ? 'Inspecting system…'
                : `${changeCount} change${changeCount === 1 ? '' : 's'} · ${noopCount} already in place`}
            </Text>
          </DialogTitle>
          <DialogContent>
            <div className={s.toolbar}>
              <Checkbox
                checked={onlyChanges}
                onChange={(_, d) => setOnlyChanges(!!d.checked)}
                label="Only show changes"
              />
            </div>
            <div className={s.body}>
              {loading ? (
                <p className={s.status}>Loading…</p>
              ) : visible.length === 0 ? (
                <p className={s.status}>Nothing will change — every operation in this batch is already at the desired state.</p>
              ) : (
                <table className={s.table}>
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
                          <td className={s.name}>{op.tweak_name}</td>
                          <td>
                            <span className={s.kind}>
                              {op.kind === 'registry' ? <><Settings16Regular /> reg</>
                                : op.kind === 'service' ? <><Server16Regular /> svc</>
                                : op.kind === 'appx' ? <><Box16Regular /> appx</>
                                : <><Code16Regular /> ps</>}
                            </span>
                          </td>
                          {op.kind === 'registry' ? (
                            <>
                              <td><code className={s.code}>{op.path}\{op.name}</code></td>
                              <td><code className={s.code}>{fmt(op.current)}</code></td>
                              <td className={s.arrow}><ArrowRight16Regular /></td>
                              <td><code className={`${s.code} ${s.desired}`}>{fmt(op.desired)}</code></td>
                            </>
                          ) : op.kind === 'service' ? (
                            <>
                              <td><code className={s.code}>{op.service}</code></td>
                              <td><code className={s.code}>{op.current ?? 'not found'}</code></td>
                              <td className={s.arrow}><ArrowRight16Regular /></td>
                              <td><code className={`${s.code} ${s.desired}`}>{op.desired}</code></td>
                            </>
                          ) : op.kind === 'appx' ? (
                            <>
                              <td><code className={s.code}>{op.package}</code></td>
                              <td><code className={s.code}>{op.currently_installed ? 'installed' : 'absent'}</code></td>
                              <td className={s.arrow}><ArrowRight16Regular /></td>
                              <td><code className={`${s.code} ${s.desired}`}>removed</code></td>
                            </>
                          ) : (
                            <td colSpan={4}>
                              <code className={`${s.code} ${s.snippet}`}>
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
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={() => onOpenChange(false)}>Close</Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

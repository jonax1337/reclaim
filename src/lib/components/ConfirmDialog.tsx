import {
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@fluentui/react-components';
import { Icon } from './Icon';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body: string;
  danger?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  danger = false,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm
}: Props) {
  function handleConfirm() {
    onConfirm();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(_, data) => onOpenChange(data.open)} modalType="alert">
      <DialogSurface>
        <DialogBody>
          <DialogTitle>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              {danger && (
                <span style={{ color: 'var(--warning)', display: 'inline-flex' }}>
                  <Icon name="AlertTriangle" size={18} />
                </span>
              )}
              {title}
            </span>
          </DialogTitle>
          {body && <DialogContent>{body}</DialogContent>}
          <DialogActions>
            <Button appearance="secondary" onClick={() => onOpenChange(false)}>
              {cancelLabel}
            </Button>
            <Button
              appearance="primary"
              autoFocus
              onClick={handleConfirm}
              style={danger ? { background: 'var(--danger)', borderColor: 'var(--danger)' } : undefined}
            >
              {confirmLabel}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

import {
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  makeStyles,
  tokens
} from '@fluentui/react-components';
import { Warning20Filled } from '@fluentui/react-icons';

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

const useStyles = makeStyles({
  titleRow: {
    display: 'inline-flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalS
  },
  warnIcon: { color: tokens.colorPaletteYellowForeground1, display: 'inline-flex' },
  danger: {
    backgroundColor: tokens.colorPaletteRedBackground3,
    color: tokens.colorNeutralForegroundOnBrand,
    ':hover': {
      backgroundColor: tokens.colorPaletteRedForeground1
    },
    ':active': {
      backgroundColor: tokens.colorPaletteRedForeground2
    }
  }
});

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
  const s = useStyles();

  function handleConfirm() {
    onConfirm();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(_, data) => onOpenChange(data.open)} modalType="alert">
      <DialogSurface>
        <DialogBody>
          <DialogTitle>
            <span className={s.titleRow}>
              {danger && <span className={s.warnIcon}><Warning20Filled /></span>}
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
              className={danger ? s.danger : undefined}
            >
              {confirmLabel}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

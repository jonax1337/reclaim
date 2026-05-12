import './Toasts.css';
import { Icon } from './Icon';
import { useTweaks } from '../stores/tweaks';

export function Toasts() {
  const toasts = useTweaks((s) => s.toasts);
  const dismissToast = useTweaks((s) => s.dismissToast);

  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`}>
          <span className="toast-icon">
            {t.kind === 'ok' ? <Icon name="CheckCircle2" size={16} />
              : t.kind === 'err' ? <Icon name="XCircle" size={16} />
              : <Icon name="Info" size={16} />}
          </span>
          <span className="toast-msg">{t.msg}</span>
          {t.action && (
            <button
              className="toast-action"
              onClick={async () => {
                await t.action!.run();
                dismissToast(t.id);
              }}
            >
              {t.action.label}
            </button>
          )}
          <button className="toast-dismiss" aria-label="Dismiss" onClick={() => dismissToast(t.id)}>
            <Icon name="X" size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}

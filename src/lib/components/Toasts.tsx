import { useEffect, useRef } from 'react';
import {
  Toaster,
  Toast,
  ToastTitle,
  ToastBody,
  useToastController,
  Link
} from '@fluentui/react-components';
import { useTweaks } from '../stores/tweaks';

const TOASTER_ID = 'reclaim-toaster';

function ToastDispatcher() {
  const { dispatchToast, dismissToast } = useToastController(TOASTER_ID);
  const toasts = useTweaks((s) => s.toasts);
  const seen = useRef<Set<number>>(new Set());

  useEffect(() => {
    const currentIds = new Set(toasts.map((t) => t.id));
    // Dispatch any new toasts
    for (const t of toasts) {
      if (seen.current.has(t.id)) continue;
      seen.current.add(t.id);
      const intent =
        t.kind === 'ok'  ? 'success' :
        t.kind === 'err' ? 'error'   :
        'info';
      dispatchToast(
        <Toast>
          <ToastTitle
            action={
              t.action ? (
                <Link onClick={() => { void t.action!.run(); }}>
                  {t.action.label}
                </Link>
              ) : undefined
            }
          >
            {t.msg}
          </ToastTitle>
        </Toast>,
        { intent, toastId: String(t.id), timeout: t.action ? -1 : 4000 }
      );
    }
    // Dismiss toasts no longer in the store
    for (const id of seen.current) {
      if (!currentIds.has(id)) {
        dismissToast(String(id));
        seen.current.delete(id);
      }
    }
  }, [toasts, dispatchToast, dismissToast]);

  return null;
}

export function Toasts() {
  return (
    <>
      <ToastDispatcher />
      <Toaster toasterId={TOASTER_ID} position="bottom-end" />
    </>
  );
}

// ToastBody re-export to keep tree-shake friendly imports for callers if any later
export { ToastBody };

import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { dismissToast, useToasts } from '../lib/toast';
import { cn } from '../lib/utils';

export function Toasts() {
  const toasts = useToasts();
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(9.5rem+env(safe-area-inset-bottom))] z-[100] flex flex-col items-center gap-2 px-4 md:bottom-28"
      role="status"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((t) => {
        const Icon = t.kind === 'success' ? CheckCircle2 : t.kind === 'error' ? XCircle : Info;
        return (
          <div
            key={t.id}
            className="pointer-events-auto flex w-full max-w-md animate-toastIn items-center gap-3 rounded-2xl border border-line/10 bg-elevated px-4 py-3 text-sm shadow-2xl"
          >
            <Icon className={cn('h-5 w-5 shrink-0', t.kind === 'success' && 'text-emerald-400', t.kind === 'error' && 'text-red-400', t.kind === 'info' && 'text-accent')} aria-hidden="true" />
            <span className="min-w-0 flex-1 break-words">{t.message}</span>
            {t.action && (
              <button
                className="shrink-0 font-semibold text-brand hover:underline"
                onClick={() => {
                  t.action?.onClick();
                  dismissToast(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
            <button className="shrink-0 text-muted hover:text-ink" onClick={() => dismissToast(t.id)} aria-label="Dismiss notification">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

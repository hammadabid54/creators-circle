'use client';

import { createContext, useCallback, useContext, useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastTone = 'success' | 'warning' | 'danger' | 'info';

type Toast = {
  id: number;
  tone: ToastTone;
  message: string;
  /** ms before auto-dismiss. 0 disables auto-dismiss. */
  duration: number;
};

type ToastInput = {
  tone?: ToastTone;
  message: string;
  duration?: number;
};

type ToastContextValue = {
  toast: (input: ToastInput) => void;
  success: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  danger: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastTone, typeof CheckCircle2> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertCircle,
  info: Info,
};

const ICON_COLOR: Record<ToastTone, string> = {
  success: 'text-[var(--color-anjuman-green)]',
  warning: 'text-[var(--color-anjuman-amber)]',
  danger: 'text-[var(--color-anjuman-red)]',
  info: 'text-[var(--color-anjuman-cyan)]',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    ({ tone = 'info', message, duration = 3000 }: ToastInput) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((prev) => [...prev, { id, tone, message, duration }]);
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss],
  );

  const value: ToastContextValue = {
    toast: push,
    success: (message, duration) => push({ tone: 'success', message, duration }),
    warning: (message, duration) => push({ tone: 'warning', message, duration }),
    danger: (message, duration) => push({ tone: 'danger', message, duration }),
    info: (message, duration) => push({ tone: 'info', message, duration }),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="cc-toast-stack"
        role="status"
        aria-live="polite"
        data-testid="toast-stack"
      >
        {toasts.map((t) => {
          const Icon = ICONS[t.tone];
          return (
            <div
              key={t.id}
              className={`cc-toast cc-toast-${t.tone}`}
              data-testid="toast"
              data-tone={t.tone}
            >
              <Icon size={16} className={ICON_COLOR[t.tone] + ' shrink-0'} />
              <span className="flex-1">{t.message}</span>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="text-white/60 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // No provider mounted — return a no-op so callers don't have to gate.
    return {
      toast: () => undefined,
      success: () => undefined,
      warning: () => undefined,
      danger: () => undefined,
      info: () => undefined,
    };
  }
  return ctx;
}

/** Hook for pages that need to clean up toasts on unmount (rare). */
export function useToastDisposer() {
  const { toast } = useToast();
  useEffect(() => {
    return () => {
      // Best-effort cleanup of any active timeouts is implicit (React
      // unmount); nothing additional required here. Kept as a hook for
      // future extensions.
    };
  }, [toast]);
}

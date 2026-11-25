'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  message: string;
  variant?: ToastVariant;
  actions?: ToastAction[];
  durationMs?: number;
}

interface ToastItem extends Required<Pick<ToastOptions, 'message' | 'variant' | 'durationMs'>> {
  id: string;
  actions: ToastAction[];
}

interface ToastContextValue {
  show: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

const DEFAULT_DURATION_MS = 4000;
const MAX_TOASTS = 3;

function SingleToast({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const [paused, setPaused] = useState(false);
  const remainingRef = useRef(toast.durationMs);
  const startedAtRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (paused) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      remainingRef.current = Math.max(
        0,
        remainingRef.current - (Date.now() - startedAtRef.current)
      );
      return;
    }

    startedAtRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      onDismiss(toast.id);
    }, remainingRef.current);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [paused, toast.id, onDismiss]);

  const variantClasses =
    toast.variant === 'success'
      ? 'bg-[#DAF1DE] text-[#235347] border-[#235347]'
      : toast.variant === 'error'
        ? 'bg-[#FFE4D8] text-[#800021] border-[#800021]'
        : 'bg-[#FFFFFF] text-[#0B0B0B] border-[#6B6B6B]';

  const IconComponent =
    toast.variant === 'success'
      ? CheckCircle2
      : toast.variant === 'error'
        ? AlertCircle
        : Info;

  return (
    <div
      role="status"
      tabIndex={0}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onDismiss(toast.id);
        }
      }}
      className={`pointer-events-auto w-full sm:w-auto sm:min-w-[320px] sm:max-w-md rounded-xl border p-3.5 shadow-md flex flex-col gap-2 transition-opacity duration-150 motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-[#800021] ${variantClasses}`}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-start gap-2.5 pt-1 min-w-0">
          <IconComponent className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-xs font-semibold leading-snug break-words">{toast.message}</p>
        </div>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          aria-label="Dismiss notification"
          className="min-w-[44px] min-h-[44px] -mr-1.5 -mt-1.5 inline-flex items-center justify-center rounded-lg hover:bg-[#FFFFFF]/60 focus:outline-none focus:ring-2 focus:ring-[#800021] shrink-0"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {toast.actions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pl-6">
          {toast.actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => {
                action.onClick();
                onDismiss(toast.id);
              }}
              className="min-h-[44px] px-3 py-1.5 rounded-lg border border-current bg-[#FFFFFF] text-[#0B0B0B] text-xs font-bold hover:bg-[#F1F7F7] focus:outline-none focus:ring-2 focus:ring-[#800021] transition-colors motion-reduce:transition-none"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((options: ToastOptions) => {
    counterRef.current += 1;
    const id = `toast-${Date.now()}-${counterRef.current}`;
    const item: ToastItem = {
      id,
      message: options.message,
      variant: options.variant ?? 'success',
      actions: options.actions ?? [],
      durationMs: options.durationMs ?? DEFAULT_DURATION_MS,
    };
    setToasts((prev) => [...prev, item].slice(-MAX_TOASTS));
    return id;
  }, []);

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed z-50 bottom-4 left-1/2 -translate-x-1/2 w-[calc(100vw-2rem)] max-w-sm sm:bottom-6 sm:left-6 sm:translate-x-0 sm:w-auto sm:max-w-md flex flex-col gap-2.5 items-center sm:items-start"
      >
        {toasts.map((toast) => (
          <SingleToast key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

import React, { createContext, useContext, useState, useCallback } from 'react';

/* ─── Types ────────────────────────────────────────────────────────────────
   type: 'success' | 'error' | 'info' | 'warning'
   message: string
   duration: ms (default 4000)
──────────────────────────────────────────────────────────────────────────── */

const ToastContext = createContext(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
};

let _uid = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ type = 'info', message, duration = 4000 }) => {
    const id = ++_uid;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
};

/* ─── Icons ─────────────────────────────────────────────────────────────── */
const icons = {
  success: (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
    </svg>
  ),
};

const styles = {
  success: { bar: 'bg-emerald-500', icon: 'text-emerald-500', border: 'border-l-emerald-500' },
  error:   { bar: 'bg-red-500',     icon: 'text-red-500',     border: 'border-l-red-500'     },
  warning: { bar: 'bg-amber-500',   icon: 'text-amber-500',   border: 'border-l-amber-500'   },
  info:    { bar: 'bg-primary',     icon: 'text-primary',     border: 'border-l-primary'      },
};

/* ─── Container ─────────────────────────────────────────────────────────── */
const ToastContainer = ({ toasts, dismiss }) => (
  <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
    {toasts.map(toast => (
      <Toast key={toast.id} {...toast} onDismiss={() => dismiss(toast.id)} />
    ))}
  </div>
);

/* ─── Single Toast ───────────────────────────────────────────────────────── */
const Toast = ({ type, message, onDismiss }) => {
  const s = styles[type] || styles.info;

  return (
    <div
      className={`
        pointer-events-auto w-full bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)]
        border border-primary/10 border-l-4 ${s.border}
        flex items-start gap-4 p-4
        animate-in slide-in-from-right-8 fade-in duration-300
      `}
    >
      {/* Colored icon */}
      <span className={`mt-0.5 ${s.icon}`}>
        {icons[type] || icons.info}
      </span>

      {/* Message */}
      <p className="flex-1 text-sm font-sans text-primary leading-relaxed">
        {message}
      </p>

      {/* Dismiss */}
      <button
        onClick={onDismiss}
        className="mt-0.5 text-muted/40 hover:text-primary transition-colors flex-shrink-0"
        aria-label="Dismiss"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

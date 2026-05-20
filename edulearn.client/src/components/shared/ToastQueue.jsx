// ToastQueue.jsx
// Global toast notification system.
// Wrap the app in <ToastProvider>. Call useToast() to push notifications.
//
// Usage:
//   const toast = useToast();
//   toast.success('Invoice generated!');
//   toast.error('Failed to save changes.');
//   toast.info('3 new notifications.');

import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

let _nextId = 1;

const VARIANT_ICONS = {
  success: 'bi-check-circle-fill',
  error:   'bi-exclamation-triangle-fill',
  info:    'bi-info-circle-fill',
  warning: 'bi-exclamation-circle-fill',
};

const VARIANT_BG = {
  success: 'var(--color-success)',
  error:   'var(--color-danger)',
  info:    'var(--primary)',
  warning: 'var(--color-warning)',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((variant, message, duration = 4000) => {
    const id = _nextId++;
    setToasts(prev => [...prev, { id, variant, message }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const api = {
    success: (msg, dur) => push('success', msg, dur),
    error:   (msg, dur) => push('error',   msg, dur),
    info:    (msg, dur) => push('info',    msg, dur),
    warning: (msg, dur) => push('warning', msg, dur),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}

      {/* Toast container — bottom-right */}
      <div
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          maxWidth: '360px',
          width: '100%',
        }}
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map(t => (
          <div
            key={t.id}
            className="d-flex align-items-start gap-2 rounded p-3 shadow-lg text-white"
            style={{
              background: VARIANT_BG[t.variant] || VARIANT_BG.info,
              animation: 'slideInRight 0.2s ease',
            }}
            role="alert"
          >
            <i className={`bi ${VARIANT_ICONS[t.variant]} flex-shrink-0 mt-1`}></i>
            <span className="flex-grow-1 small">{t.message}</span>
            <button
              className="btn-close btn-close-white btn-sm flex-shrink-0"
              style={{ fontSize: '0.65rem' }}
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
            ></button>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

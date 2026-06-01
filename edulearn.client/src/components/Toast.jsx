import { useEffect } from 'react';

// Toast — a polished, top-right floating notification that auto-dismisses.
// Used for transient action results (success / error) on pages that previously
// showed a raw inline alert. It NEVER renders raw backend text directly: callers
// pass an already-friendly string (built via getFriendlySimpleMessage), so routes
// and status codes can never leak here.
//
// Props:
//   show      — boolean, whether the toast is visible
//   type      — 'success' | 'error' (defaults to 'success')
//   message   — the friendly, pre-sanitized text to display
//   onClose   — called when the toast dismisses (timer or close button)
//   duration  — auto-dismiss delay in ms (default 7000)
export default function Toast({ show, type = 'success', message, onClose, duration = 7000 }) {
    useEffect(() => {
        if (!show) return;
        const timer = setTimeout(() => onClose?.(), duration);
        return () => clearTimeout(timer);
    }, [show, message, duration, onClose]);

    if (!show || !message) return null;

    const isError = type === 'error';
    const accent = isError ? '#dc3545' : '#198754';
    const bgTint = isError ? '#fdf2f2' : '#f1f9f4';
    const icon = isError ? 'bi-exclamation-triangle-fill' : 'bi-check-circle-fill';
    const heading = isError ? 'Something needs your attention' : 'Success';

    return (
        <div
            role="status"
            aria-live="polite"
            style={{
                position: 'fixed',
                top: 20,
                right: 20,
                zIndex: 1080,
                minWidth: 320,
                maxWidth: 420,
                background: bgTint,
                borderLeft: `4px solid ${accent}`,
                borderRadius: 10,
                boxShadow: '0 8px 28px rgba(15, 30, 60, 0.18)',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                animation: 'toast-slide-in 0.3s ease both',
            }}
        >
            <i className={`bi ${icon}`} style={{ color: accent, fontSize: '1.2rem', marginTop: 1, flexShrink: 0 }}></i>
            <div style={{ flexGrow: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1a3c6e', marginBottom: 2 }}>
                    {heading}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#374151', lineHeight: 1.4 }}>
                    {message}
                </div>
            </div>
            <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={() => onClose?.()}
                style={{ flexShrink: 0, fontSize: '0.7rem' }}
            />
            <style>{`
                @keyframes toast-slide-in {
                    from { opacity: 0; transform: translateX(24px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
            `}</style>
        </div>
    );
}

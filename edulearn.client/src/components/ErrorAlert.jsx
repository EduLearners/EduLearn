import { getFriendlyError } from '../utils/errorMessage';

export default function ErrorAlert({ error, onDismiss }) {
    if (!error) return null;

    const { title, message, guidance } = getFriendlyError(error);

    // Dev-only raw detail from the backend (it is dev-gated server-side). Never
    // feeds the user-facing message above; shown subordinate for debugging only.
    const detail = (import.meta.env.DEV && typeof error !== 'string')
        ? error.response?.data?.detail : null;
    const exceptionType = (import.meta.env.DEV && typeof error !== 'string')
        ? error.response?.data?.exceptionType : null;

    return (
        <div className="alert alert-danger d-flex align-items-start" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2 mt-1 flex-shrink-0"></i>
            <div className="flex-grow-1">
                <div className="fw-semibold">{title}</div>
                <div className="small">{message}</div>
                {guidance && <div className="small text-muted mt-1">{guidance}</div>}

                {detail && (
                    <div className="mt-2 p-2 rounded" style={{
                        background: 'rgba(0,0,0,0.06)', fontSize: '12px',
                        fontFamily: 'monospace', wordBreak: 'break-word'
                    }}>
                        {exceptionType && (
                            <div style={{ color: '#842029', fontWeight: 600, marginBottom: 2 }}>
                                {exceptionType}
                            </div>
                        )}
                        <div>{detail}</div>
                    </div>
                )}
            </div>
            {onDismiss && (
                <button type="button" className="btn-close ms-2 flex-shrink-0" onClick={onDismiss} />
            )}
        </div>
    );
}

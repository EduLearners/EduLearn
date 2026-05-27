export default function ErrorAlert({ error, onDismiss }) {
    if (!error) return null;

    const message = typeof error === 'string'
        ? error
        : error.response?.data?.error || error.message || 'An error occurred';

    // Only show raw exception detail in development — never in production
    const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;
    const detail = isDev && typeof error !== 'string' ? error.response?.data?.detail : null;
    const exceptionType = isDev && typeof error !== 'string' ? error.response?.data?.exceptionType : null;

    return (
        <div className="alert alert-danger" role="alert">
            <div className="d-flex align-items-start">
                <i className="bi bi-exclamation-triangle-fill me-2 mt-1 flex-shrink-0"></i>
                <div className="flex-grow-1">
                    <div>{message}</div>

                    {/* Dev-mode detail: real exception message from the API */}
                    {detail && (
                        <div className="mt-2 p-2 rounded" style={{
                            background: 'rgba(0,0,0,0.06)',
                            fontSize: '12px',
                            fontFamily: 'monospace',
                            wordBreak: 'break-word'
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
        </div>
    );
}

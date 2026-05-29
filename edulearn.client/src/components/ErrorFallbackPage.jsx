export default function ErrorFallbackPage({ error, onReload, onReset }) {
    return (
        <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
            <div className="card shadow-sm border-0" style={{ maxWidth: 480 }}>
                <div className="card-body p-4 text-center">
                    <i className="bi bi-exclamation-octagon-fill text-danger" style={{ fontSize: '2.5rem' }}></i>
                    <h1 className="h4 mt-3 mb-2">Something went wrong</h1>
                    <p className="text-muted mb-1">The page ran into an unexpected problem.</p>
                    <p className="text-muted small">
                        Please reload. If it keeps happening, contact your department admin.
                    </p>

                    <div className="mt-4 d-flex justify-content-center gap-2">
                        <button className="btn btn-primary-edulearn" onClick={onReload}>
                            <i className="bi bi-arrow-clockwise me-1"></i>Reload page
                        </button>
                        <button className="btn btn-outline-secondary" onClick={onReset}>Try again</button>
                    </div>

                    {import.meta.env.DEV && (
                        <details className="mt-4 text-start">
                            <summary className="small text-muted">Technical details (dev only)</summary>
                            <pre className="bg-light p-2 small mt-2 mb-0">{error?.message || 'Unknown error'}</pre>
                        </details>
                    )}
                </div>
            </div>
        </div>
    );
}

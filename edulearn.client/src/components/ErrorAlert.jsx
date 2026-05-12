export default function ErrorAlert({ error, onDismiss }) {
    if (!error) return null;
    const message = typeof error === 'string'
        ? error
        : error.response?.data?.error || error.message || 'An error occurred';

    return (
        <div className="alert alert-danger d-flex align-items-center" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            <div className="flex-grow-1">{message}</div>
            {onDismiss && (
                <button type="button" className="btn-close" onClick={onDismiss} />
            )}
        </div>
    );
}
export default function Loading({ message = 'Loading...' }) {
    return (
        <div className="d-flex justify-content-center align-items-center p-5">
            <div className="spinner-border text-primary-edulearn me-3" role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
            <span className="text-muted">{message}</span>
        </div>
    );
}
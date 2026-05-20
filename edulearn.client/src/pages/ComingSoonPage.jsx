import { useLocation } from 'react-router-dom';

// Generic placeholder for pages that haven't been built yet.
// Auto-derives a title from the URL path.
export default function ComingSoonPage() {
    const location = useLocation();

    // Convert "/students" → "Students", "/mfa/setup" → "Mfa Setup"
    const title = location.pathname
        .split('/')
        .filter(Boolean)
        .map(s => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ');

    return (
        <div>
            <h2 className="text-primary-edulearn mb-4">
                <i className="bi bi-tools me-2"></i>{title || 'Page'}
            </h2>

            <div className="card shadow-sm">
                <div className="card-body text-center py-5">
                    <i className="bi bi-cone-striped text-warning" style={{ fontSize: '4rem' }}></i>
                    <h4 className="mt-3">Coming Soon</h4>
                    <p className="text-muted mb-0">
                        This page is under construction.
                    </p>
                    <p className="text-muted small">
                        Path: <code>{location.pathname}</code>
                    </p>
                </div>
            </div>
        </div>
    );
}

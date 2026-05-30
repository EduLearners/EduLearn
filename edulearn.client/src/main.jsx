import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './index.css';
import './styles/pages.css';

import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

// SECURITY (auth/session integrity): defeat the browser back/forward cache (bfcache).
// When a page is restored from bfcache (e.g. user presses Back after logging out, or
// after a different user has logged in), React does NOT re-run, so the route guards
// never re-evaluate the current session — the previously-rendered page (and its data)
// would be shown to the wrong/again-anonymous user. Forcing a fresh load makes the
// current session's guards apply. `persisted` is only true for bfcache restores, so a
// normal load never triggers this and there is no reload loop.
window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        window.location.reload();
    }
});

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    </StrictMode>
);
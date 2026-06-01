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

// UX fix: prevent the mouse wheel from changing <input type="number"> values.
// On number inputs that carry a fractional `step` (e.g. step="0.01" on money/score
// fields), scrolling the wheel while the field is focused snaps the value to the
// nearest valid step from `min`, and floating-point arithmetic turns a clean 20
// into 19.99. Blurring the wheel removes the accidental rounding without changing
// keyboard entry, the spinner arrows, or validation. Capture phase + blur so the
// event never reaches the input's default wheel handler.
document.addEventListener('wheel', (event) => {
    const el = document.activeElement;
    if (el && el.tagName === 'INPUT' && el.type === 'number' && el === event.target) {
        el.blur();
    }
}, { passive: true });

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    </StrictMode>
);
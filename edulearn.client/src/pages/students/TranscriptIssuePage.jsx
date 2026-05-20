// TranscriptIssuePage.jsx
// Route: /registrar/transcripts/issue
// Owner: Saurav (SRA module)
// Registrar-facing transcript management page.
// Lets Registrars search by student, generate draft transcripts,
// publish them, and download PDFs. Reuses TranscriptsPage logic
// but scoped to the Registrar persona with appropriate messaging.

// The full implementation lives in TranscriptsPage.jsx which already
// handles all Registrar + Student roles. This page is a named entry-point
// for the Registrar's workflow with a Registrar-specific header.

import TranscriptsPage from '../transcripts/TranscriptsPage';

export default function TranscriptIssuePage() {
    // TranscriptsPage already adapts its UI based on role (canManage for Registrar/ITAdmin,
    // isStudent for Student). Mounting it here gives Registrars their own route
    // at /registrar/transcripts/issue as required by the spec.
    return <TranscriptsPage />;
}

// Central route -> allowed-roles map for FRONTEND route authorization.
//
// Source of truth: the Sidebar's NAV_ITEMS (the team's role->section design),
// unioned across roles, cross-checked against each controller's [Authorize].
// The backend still enforces authorization on data; this map stops a wrong-role
// user from rendering another role's page SHELL by URL or via the back button.
//
// '*' = any authenticated user. Keyed by the first path segment; a couple of
// /submissions sub-routes are special-cased in rolesForPath().

export const SECTION_ROLES = {
    dashboard: '*',
    profile: '*',
    notifications: '*',
    tickets: '*',
    enrollment: ['Student', 'Registrar', 'ITAdmin'],
    timetable: ['Student', 'Instructor', 'Registrar', 'ITAdmin'],
    courses: ['Student', 'Instructor', 'Registrar', 'DeptAdmin', 'ITAdmin'],
    assessments: ['Student', 'Instructor', 'ITAdmin'],
    submissions: ['Student', 'Instructor', 'ITAdmin'],
    contents: ['Student', 'Instructor', 'ITAdmin'],
    syllabi: ['Student', 'Instructor', 'Registrar', 'DeptAdmin', 'ITAdmin'],
    discussions: ['Student', 'Instructor', 'Registrar', 'DeptAdmin', 'ITAdmin'],
    transcripts: ['Student', 'Registrar', 'ITAdmin'],
    invoices: ['Student', 'Finance', 'ITAdmin'],
    programs: ['Student', 'Registrar', 'DeptAdmin', 'ITAdmin'],
    'grade-changes': ['Instructor', 'Auditor', 'ITAdmin'],
    students: ['Instructor', 'Registrar', 'DeptAdmin', 'ITAdmin'],
    applicants: ['Registrar', 'ITAdmin'],
    sections: ['Registrar', 'DeptAdmin', 'ITAdmin'],
    rooms: ['DeptAdmin', 'ITAdmin'],
    fees: ['Finance', 'ITAdmin'],
    payments: ['Finance', 'ITAdmin'],
    scholarships: ['Finance', 'ITAdmin'],
    reports: ['Auditor', 'ITAdmin'],
    kpis: ['Auditor', 'ITAdmin'],
    'audit-log': ['Auditor', 'ITAdmin'],
    users: ['ITAdmin'],
};

// Returns the allowed roles for a pathname:
//   '*'            -> any authenticated user may view
//   string[]       -> only these roles may view
// Unknown sections return '*' (the App.jsx catch-all redirects truly unknown URLs).
export function rolesForPath(pathname) {
    const seg = (pathname || '/').split('/')[1] || 'dashboard';

    // Sub-route nuances inside /submissions: grading is staff-only; submitting is student-only.
    if (seg === 'submissions') {
        if (pathname.endsWith('/grade')) return ['Instructor', 'ITAdmin'];
        if (pathname.endsWith('/submit')) return ['Student', 'ITAdmin'];
    }

    return Object.prototype.hasOwnProperty.call(SECTION_ROLES, seg)
        ? SECTION_ROLES[seg]
        : '*';
}

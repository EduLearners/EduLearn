export default function StatusBadge({ status }) {
    if (!status) return null;

    const map = {
        // Course
        Active:         'success',
        Deprecated:     'warning',
        Archived:       'secondary',

        // Assessment
        Draft:          'secondary',
        Published:      'success',
        Closed:         'danger',

        // Submission
        Submitted:      'primary',
        Graded:         'success',
        Returned:       'info',
        Late:           'warning',
        Plagiarised:    'danger',

        // Content
        Active:         'success',

        // Program / Section / Room
        Suspended:      'warning',
        Discontinued:   'danger',
        Open:           'success',
        Cancelled:      'danger',
        Available:      'success',
        Occupied:       'warning',
        Maintenance:    'secondary',

        // User
        Locked:         'danger',

        // Applicant
        Pending:        'secondary',
        UnderReview:    'info',
        Accepted:       'success',
        Rejected:       'danger',
        Waitlisted:     'warning',
    };

    const variant = map[status] || 'secondary';

    return (
        <span className={`badge bg-${variant}`}>
            {status}
        </span>
    );
}
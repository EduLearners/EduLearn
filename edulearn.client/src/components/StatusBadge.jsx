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

        // Program / Section / Room
        Suspended:      'warning',
        Discontinued:   'danger',
        Open:           'success',
        Cancelled:      'danger',
        Available:      'success',
        Occupied:       'warning',
        Maintenance:    'secondary',

        // User
        Inactive:       'secondary',
        Locked:         'danger',
        Withdrawn:      'dark',

        // Applicant
        Pending:        'secondary',
        UnderReview:    'info',
        Accepted:       'success',
        Rejected:       'danger',
        Waitlisted:     'warning',

        // Enrollment
        Enrolled:       'success',
        Dropped:        'danger',
        Completed:      'info',

        // Transcript
        Issued:         'success',

        // Fee Schedule
        Superseded:     'secondary',

        // Invoice / Payment
        Unpaid:         'danger',
        Partial:        'warning',
        Paid:           'success',
        Overdue:        'danger',
        Refunded:       'info',
    };

    const variant = map[status] || 'secondary';

    return (
        <span className={`badge bg-${variant}`}>
            {status}
        </span>
    );
}

const STATUS_COLORS = {
    // Generic
    Active: 'success', Inactive: 'secondary',
    // Applicants
    Submitted: 'warning', UnderReview: 'info', Accepted: 'success',
    Rejected: 'danger', Waitlisted: 'warning',
    // Enrollment
    Enrolled: 'success', Dropped: 'secondary',
    // Transcript
    Draft: 'secondary', Issued: 'success', Revoked: 'danger',
    // Plagiarism
    Pending: 'warning', Confirmed: 'danger', Dismissed: 'secondary',
    // Section
    Open: 'success', Closed: 'secondary', Cancelled: 'danger',
};

export default function StatusBadge({ status }) {
    const color = STATUS_COLORS[status] || 'secondary';
    return <span className={`badge bg-${color}`}>{status}</span>;
}
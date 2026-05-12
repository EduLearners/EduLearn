export const ApplicationStatus = {
    SUBMITTED: 'Submitted',
    UNDER_REVIEW: 'UnderReview',
    ACCEPTED: 'Accepted',
    REJECTED: 'Rejected',
    WAITLISTED: 'Waitlisted',
};

export function emptyApplicant() {
    return {
        name: '',
        dob: '',
        nationalID: '',
        contactInfoJSON: '',
        programApplied: '',
        documentsURIJSON: '',
    };
}
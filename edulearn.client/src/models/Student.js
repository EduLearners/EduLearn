export const EnrollmentStatus = {
    ACTIVE: 'Active',
    GRADUATED: 'Graduated',
    WITHDRAWN: 'Withdrawn',
    SUSPENDED: 'Suspended',
};

export function emptyStudent() {
    return {
        userID: 0,
        name: '',
        dob: '',
        gender: '',
        contactInfoJSON: '',
        programID: 0,
        entryTerm: '',
        expectedGraduationTerm: '',
    };
}
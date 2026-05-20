export const SectionStatus = {
    OPEN: 'Open',
    CLOSED: 'Closed',
    CANCELLED: 'Cancelled',
};

export function emptySection() {
    return {
        courseID: 0,
        term: '',
        instructorID: 0,
        roomID: 0,
        capacity: 30,
        scheduleJSON: '',
    };
}
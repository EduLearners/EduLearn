import axiosClient from '../api/axiosClient';

export const timetableService = {
    getStudentTimetable: async (studentId, term) => {
        const { data } = await axiosClient.get(`/timetable/student/${studentId}/${term}`);
        return data;
    },
    validateSection: async (studentId, sectionId) => {
        const { data } = await axiosClient.post(
            `/timetable/validate-section?studentId=${studentId}&sectionId=${sectionId}`
        );
        return data;
    },
};
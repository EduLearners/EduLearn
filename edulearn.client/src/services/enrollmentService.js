import axiosClient from '../api/axiosClient';

export const enrollmentService = {
    enroll: async (studentID, sectionID) => {
        const { data } = await axiosClient.post('/enrollment/enroll', { studentID, sectionID });
        return data;
    },
    drop: async (enrollID) => {
        await axiosClient.delete(`/enrollment/${enrollID}/drop`);
    },
    getByStudent: async (studentId) => {
        const { data } = await axiosClient.get(`/enrollment/student/${studentId}`);
        return data;
    },
    getBySection: async (sectionId) => {
        const { data } = await axiosClient.get(`/enrollment/section/${sectionId}`);
        return data;
    },
};
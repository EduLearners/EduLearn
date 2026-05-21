import axiosClient from '../api/axiosClient';

export const sectionService = {
    getById: async (id) => {
        const { data } = await axiosClient.get(`/sections/${id}`);
        return data;
    },
    getByCourseAndTerm: async (courseId, term) => {
        const { data } = await axiosClient.get(`/sections/course/${courseId}/term/${term}`);
        return data;
    },
    getByInstructor: async (instructorId) => {
        const { data } = await axiosClient.get(`/sections/instructor/${instructorId}`);
        return data;
    },
    create: async (section) => {
        const { data } = await axiosClient.post('/sections', section);
        return data;
    },
    update: async (id, section) => {
        const { data } = await axiosClient.put(`/sections/${id}`, section);
        return data;
    },
};
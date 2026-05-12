import axiosClient from '../api/axiosClient';

export const courseService = {
    getAll: async () => {
        const { data } = await axiosClient.get('/courses');
        return data;
    },
    getById: async (id) => {
        const { data } = await axiosClient.get(`/courses/${id}`);
        return data;
    },
};

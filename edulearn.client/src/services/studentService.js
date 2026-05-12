import axiosClient from '../api/axiosClient';

export const studentService = {
    getAll: async () => {
        const { data } = await axiosClient.get('/students');
        return data;
    },
    getById: async (id) => {
        const { data } = await axiosClient.get(`/students/${id}`);
        return data;
    },
    create: async (student) => {
        const { data } = await axiosClient.post('/students', student);
        return data;
    },
    update: async (id, student) => {
        const { data } = await axiosClient.put(`/students/${id}`, student);
        return data;
    },
};
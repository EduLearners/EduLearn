import axiosClient from '../api/axiosClient';

export const roomService = {
    getAll: async () => {
        const { data } = await axiosClient.get('/rooms');
        return data;
    },
    getById: async (id) => {
        const { data } = await axiosClient.get(`/rooms/${id}`);
        return data;
    },
    create: async (room) => {
        const { data } = await axiosClient.post('/rooms', room);
        return data;
    },
};

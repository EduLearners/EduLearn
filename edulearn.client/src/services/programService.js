import axiosClient from '../api/axiosClient';

export const programService = {

    // GET /api/programs
    getAll: async () => {
        const { data } = await axiosClient.get('/programs');
        return data;
    },

    // GET /api/programs/mine  (Student only — returns own enrolled programs)
    getMine: async () => {
        const { data } = await axiosClient.get('/programs/mine');
        return data;
    },

    // GET /api/programs/:id
    getById: async (id) => {
        const { data } = await axiosClient.get(`/programs/${id}`);
        return data;
    },

    // POST /api/programs
    create: async (programData) => {
        const { data } = await axiosClient.post('/programs', programData);
        return data;
    },

    // PUT /api/programs/:id
    update: async (id, programData) => {
        const { data } = await axiosClient.put(`/programs/${id}`, programData);
        return data;
    },

    // DELETE /api/programs/:id
    remove: async (id) => {
        const { data } = await axiosClient.delete(`/programs/${id}`);
        return data;
    },
};
import axiosClient from '../api/axiosClient';

export const ticketService = {

    // GET /api/tickets — ITAdmin sees all, others see own
    getAll: async () => {
        const { data } = await axiosClient.get('/tickets');
        return data;
    },

    // GET /api/tickets/:id
    getById: async (id) => {
        const { data } = await axiosClient.get(`/tickets/${id}`);
        return data;
    },

    // POST /api/tickets — All authenticated
    create: async (ticketData) => {
        const { data } = await axiosClient.post('/tickets', ticketData);
        return data;
    },

    // PUT /api/tickets/:id/assign — ITAdmin only
    assign: async (id, assignData) => {
        const { data } = await axiosClient.put(`/tickets/${id}/assign`, assignData);
        return data;
    },

    // PUT /api/tickets/:id/resolve — ITAdmin only
    resolve: async (id, resolveData) => {
        const { data } = await axiosClient.put(`/tickets/${id}/resolve`, resolveData);
        return data;
    },
};
import axiosClient from '../api/axiosClient';

export const userService = {
    // GET /api/users — Registrar / ITAdmin
    getAll: async () => {
        const { data } = await axiosClient.get('/users');
        return data;
    },

    // Convenience helper: filter to a specific role on the client side
    getByRole: async (role) => {
        const { data } = await axiosClient.get('/users');
        return (data || []).filter(u => u.role === role && u.status === 'Active');
    },

    getById: async (id) => {
        const { data } = await axiosClient.get(`/users/${id}`);
        return data;
    },
};

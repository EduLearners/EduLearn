import axiosClient from '../api/axiosClient';

export const userService = {
    // GET /api/users — ITAdmin, Registrar
    getAll: async () => {
        const { data } = await axiosClient.get('/users');
        return data;
    },

    // Convenience helper: filter to a specific role on the client side
    getByRole: async (role) => {
        const { data } = await axiosClient.get('/users');
        return (data || []).filter(u => u.role === role && u.status === 'Active');
    },

    // GET /api/users/:id — Any authenticated (own only for non-admin)
    getById: async (id) => {
        const { data } = await axiosClient.get(`/users/${id}`);
        return data;
    },

    // POST /api/users — ITAdmin only
    create: async (userData) => {
        const { data } = await axiosClient.post('/users', userData);
        return data;
    },

    // PUT /api/users/:id — Any authenticated (own only for non-admin)
    update: async (id, userData) => {
        const { data } = await axiosClient.put(`/users/${id}`, userData);
        return data;
    },

    // PUT /api/users/:id/status — ITAdmin only
    updateStatus: async (id, status) => {
        const { data } = await axiosClient.put(`/users/${id}/status`, { status });
        return data;
    },

    // POST /api/users/:id/mfa/reset — ITAdmin only
    resetMfa: async (id) => {
        await axiosClient.post(`/users/${id}/mfa/reset`);
    },

    // POST /api/users/:id/invite — ITAdmin only — sends welcome email to existing user
    inviteUser: async (id) => {
        const { data } = await axiosClient.post(`/users/${id}/invite`);
        return data;
    },

    // PUT /api/users/:id/password — Any authenticated user (own only)
    // Requires current password verification on the backend
        changePassword: async (id, currentPassword, newPassword, confirmPassword) => {
            const { data } = await axiosClient.put(`/users/${id}/password`, {
                currentPassword,
                newPassword,
                confirmPassword,
            });
            return data;
        },
};

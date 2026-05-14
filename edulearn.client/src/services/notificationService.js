import axiosClient from '../api/axiosClient';

export const notificationService = {

    // GET /api/notifications?page=&pageSize=&unreadOnly=
    getAll: async (params = {}) => {
        const { data } = await axiosClient.get('/notifications', { params });
        return data;
    },

    // GET /api/notifications/unread-count
    getUnreadCount: async () => {
        const { data } = await axiosClient.get('/notifications/unread-count');
        return data;
    },

    // PUT /api/notifications/:id/read
    markRead: async (id) => {
        await axiosClient.put(`/notifications/${id}/read`);
    },

    // PUT /api/notifications/read-all
    markAllRead: async () => {
        await axiosClient.put('/notifications/read-all');
    },

    // POST /api/notifications/test — ITAdmin only
    createTest: async (notificationData) => {
        const { data } = await axiosClient.post('/notifications/test', notificationData);
        return data;
    },
};
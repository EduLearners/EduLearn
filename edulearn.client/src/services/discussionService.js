import axiosClient from '../api/axiosClient';

export const discussionService = {

    // GET /api/discussions/course/:courseId — All authenticated
    getByCourse: async (courseId) => {
        const { data } = await axiosClient.get(`/discussions/course/${courseId}`);
        return data;
    },

    // POST /api/discussions — All authenticated
    create: async (discussionData) => {
        const { data } = await axiosClient.post('/discussions', discussionData);
        return data;
    },

    // POST /api/discussions/:id/reply — All authenticated
    addReply: async (id, replyData) => {
        const { data } = await axiosClient.post(`/discussions/${id}/reply`, replyData);
        return data;
    },

    // PUT /api/discussions/:id/status — Instructor, ITAdmin only
    updateStatus: async (id, statusData) => {
        const { data } = await axiosClient.put(`/discussions/${id}/status`, statusData);
        return data;
    },
};
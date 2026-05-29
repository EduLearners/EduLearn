import axiosClient from '../api/axiosClient';

export const courseService = {

    // GET /api/courses
    getAll: async () => {
        const { data } = await axiosClient.get('/courses');
        return data;
    },

    // GET /api/courses/:id
    getById: async (id) => {
        const { data } = await axiosClient.get(`/courses/${id}`);
        return data;
    },

    // POST /api/courses
    create: async (courseData) => {
        const { data } = await axiosClient.post('/courses', courseData);
        return data;
    },

    // PUT /api/courses/:id
    update: async (id, courseData) => {
        const { data } = await axiosClient.put(`/courses/${id}`, courseData);
        return data;
    },

    // DELETE /api/courses/:id
    remove: async (id) => {
        const { data } = await axiosClient.delete(`/courses/${id}`);
        return data;
    },
};
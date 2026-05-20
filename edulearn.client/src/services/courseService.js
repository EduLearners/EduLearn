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

    // GET /api/courses/:id/syllabus
    getSyllabus: async (id) => {
        const { data } = await axiosClient.get(`/courses/${id}/syllabus`);
        return data;
    },

    // PUT /api/courses/:id/syllabus
    updateSyllabus: async (id, syllabusData) => {
        const { data } = await axiosClient.put(`/courses/${id}/syllabus`, syllabusData);
        return data;
    },

    // GET /api/courses/:id/prerequisites
    getPrerequisites: async (id) => {
        const { data } = await axiosClient.get(`/courses/${id}/prerequisites`);
        return data;
    },

    // POST /api/courses/:id/prerequisites
    addPrerequisite: async (id, prerequisiteData) => {
        const { data } = await axiosClient.post(`/courses/${id}/prerequisites`, prerequisiteData);
        return data;
    },

    // DELETE /api/courses/:id/prerequisites/:prereqId
    removePrerequisite: async (id, prereqId) => {
        const { data } = await axiosClient.delete(`/courses/${id}/prerequisites/${prereqId}`);
        return data;
    },
};
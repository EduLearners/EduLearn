import axiosClient from '../api/axiosClient';

export const syllabusService = {

    // GET /api/syllabi/course/:courseId — All authenticated
    getByCourse: async (courseId) => {
        const { data } = await axiosClient.get(`/syllabi/course/${courseId}`);
        return data;
    },

    // GET /api/syllabi/:id — All authenticated
    getById: async (id) => {
        const { data } = await axiosClient.get(`/syllabi/${id}`);
        return data;
    },

    // POST /api/syllabi — Instructor, ITAdmin only
    create: async (syllabusData) => {
        const { data } = await axiosClient.post('/syllabi', syllabusData);
        return data;
    },

    // PUT /api/syllabi/:id — Instructor, ITAdmin only
    update: async (id, syllabusData) => {
        const { data } = await axiosClient.put(`/syllabi/${id}`, syllabusData);
        return data;
    },
};
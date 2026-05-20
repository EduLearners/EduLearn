import axiosClient from '../api/axiosClient';

export const submissionService = {

    // GET /api/submissions/student/:studentId
    getByStudent: async (studentId) => {
        const { data } = await axiosClient.get(`/submissions/student/${studentId}`);
        return data;
    },

    // GET /api/submissions/assessment/:assessmentId
    getByAssessment: async (assessmentId) => {
        const { data } = await axiosClient.get(`/submissions/assessment/${assessmentId}`);
        return data;
    },

    // GET /api/submissions/:id — used by GradePage
    getById: async (id) => {
        const { data } = await axiosClient.get(`/submissions/${id}`);
        return data;
    },

    // POST /api/submissions
    create: async (submissionData) => {
        const { data } = await axiosClient.post('/submissions', submissionData);
        return data;
    },

    // POST /api/submissions/:id/grade — backend uses POST not PUT
    grade: async (id, gradeData) => {
        const { data } = await axiosClient.post(`/submissions/${id}/grade`, gradeData);
        return data;
    },
};
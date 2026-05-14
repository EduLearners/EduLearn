import axiosClient from '../api/axiosClient';

export const scholarshipService = {

    // GET /api/scholarships/student/:studentId — Finance, ITAdmin
    getByStudent: async (studentId) => {
        const { data } = await axiosClient.get(`/scholarships/student/${studentId}`);
        return data;
    },

    // POST /api/scholarships — Finance, ITAdmin
    create: async (scholarshipData) => {
        const { data } = await axiosClient.post('/scholarships', scholarshipData);
        return data;
    },

    // PUT /api/scholarships/:id — Finance, ITAdmin
    update: async (id, scholarshipData) => {
        const { data } = await axiosClient.put(`/scholarships/${id}`, scholarshipData);
        return data;
    },
};
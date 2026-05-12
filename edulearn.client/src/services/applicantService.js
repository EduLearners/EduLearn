import axiosClient from '../api/axiosClient';

export const applicantService = {
    getAll: async () => {
        const { data } = await axiosClient.get('/applicants');
        return data;
    },
    getById: async (id) => {
        const { data } = await axiosClient.get(`/applicants/${id}`);
        return data;
    },
    create: async (applicant) => {
        const { data } = await axiosClient.post('/applicants', applicant);
        return data;
    },
    updateStatus: async (id, status) => {
        const { data } = await axiosClient.put(`/applicants/${id}/status`, { status });
        return data;
    },
};
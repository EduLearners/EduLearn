import axiosClient from '../api/axiosClient';

export const reportService = {

    // GET /api/reports — Auditor, ITAdmin only
    getAll: async () => {
        const { data } = await axiosClient.get('/reports');
        return data;
    },

    // POST /api/reports/generate — Auditor, ITAdmin only
    generate: async (reportData) => {
        const { data } = await axiosClient.post('/reports/generate', reportData);
        return data;
    },

    // GET /api/reports/:id/download?format=json
    downloadJson: async (id) => {
        const { data } = await axiosClient.get(`/reports/${id}/download?format=json`);
        return data;
    },

    // GET /api/reports/:id/download (PDF blob)
    downloadPdf: async (id) => {
        const response = await axiosClient.get(`/reports/${id}/download`, {
            responseType: 'blob',
        });
        return response.data;
    },
};
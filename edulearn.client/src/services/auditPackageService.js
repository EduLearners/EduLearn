import axiosClient from '../api/axiosClient';

export const auditPackageService = {
    generate: async (periodStart, periodEnd) => {
        const { data } = await axiosClient.post('/audit-packages/generate', {
            periodStart,
            periodEnd,
        });
        return data;
    },
    downloadPdf: async (id) => {
        const response = await axiosClient.get(`/audit-packages/${id}/download`, {
            responseType: 'blob',
        });
        return response.data;
    },
    downloadJson: async (id) => {
        const { data } = await axiosClient.get(`/audit-packages/${id}/download?format=json`);
        return data;
    },
};

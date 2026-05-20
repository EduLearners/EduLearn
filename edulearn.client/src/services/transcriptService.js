import axiosClient from '../api/axiosClient';

export const transcriptService = {
    generate: async (studentId) => {
        const { data } = await axiosClient.post(`/transcripts/generate/${studentId}`);
        return data;
    },
    getById: async (id) => {
        const { data } = await axiosClient.get(`/transcripts/${id}`);
        return data;
    },
    getByStudent: async (studentId) => {
        const { data } = await axiosClient.get(`/transcripts/student/${studentId}`);
        return data;
    },
    publish: async (id) => {
        const { data } = await axiosClient.put(`/transcripts/${id}/publish`);
        return data;
    },
    // Download PDF — triggers browser download
    downloadPdf: async (id, studentName = 'transcript') => {
        const response = await axiosClient.get(`/transcripts/${id}/pdf`, {
            responseType: 'blob',
        });
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Transcript_${studentName}_${Date.now()}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
    },
};
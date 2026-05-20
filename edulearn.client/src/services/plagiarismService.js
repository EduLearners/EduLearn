import axiosClient from '../api/axiosClient';

export const plagiarismService = {
    report: async (submissionID, similarityScore, details) => {
        const { data } = await axiosClient.post('/plagiarism/report', {
            submissionID, similarityScore, details
        });
        return data;
    },
    getById: async (id) => {
        const { data } = await axiosClient.get(`/plagiarism/${id}`);
        return data;
    },
    getBySubmission: async (submissionId) => {
        const { data } = await axiosClient.get(`/plagiarism/submission/${submissionId}`);
        return data;
    },
    getStudentIntegrity: async (studentId) => {
        const { data } = await axiosClient.get(`/plagiarism/student/${studentId}/integrity`);
        return data;
    },
    updateStatus: async (id, status) => {
        const { data } = await axiosClient.put(`/plagiarism/${id}/status`, { status });
        return data;
    },
};
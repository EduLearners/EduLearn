import axiosClient from '../api/axiosClient';

export const gradeChangeService = {

    // GET /api/grade-changes/submission/:submissionId
    // Instructor, Auditor, ITAdmin only
    getBySubmission: async (submissionId) => {
        const { data } = await axiosClient.get(`/grade-changes/submission/${submissionId}`);
        return data;
    },

    // POST /api/grade-changes
    // Instructor, ITAdmin only
    create: async (gradeChangeData) => {
        const { data } = await axiosClient.post('/grade-changes', gradeChangeData);
        return data;
    },
};
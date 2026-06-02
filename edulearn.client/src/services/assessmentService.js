import axiosClient from '../api/axiosClient';

export const assessmentService = {

    // GET /api/assessments/course/:courseId
    getByCourse: async (courseId) => {
        const { data } = await axiosClient.get(`/assessments/course/${courseId}`);
        return data;
    },

    // Fetch assessments across all courses — used by AssessmentsPage list view
    getAll: async () => {
        const { data: courses } = await axiosClient.get('/courses');
        const results = await Promise.allSettled(
            courses.map(c =>
                axiosClient.get(`/assessments/course/${c.courseID}`)
                    .then(r => r.data)
                    .catch(() => [])
            )
        );
        return results
            .filter(r => r.status === 'fulfilled')
            .flatMap(r => r.value);
    },

    // GET /api/assessments/:id
    getById: async (id) => {
        const { data } = await axiosClient.get(`/assessments/${id}`);
        return data;
    },

    // GET /api/assessments/section/:sectionId
    getBySection: async (sectionId) => {
        const { data } = await axiosClient.get(`/assessments/section/${sectionId}`);
        return data;
    },

    // POST /api/assessments
    create: async (assessmentData) => {
        const { data } = await axiosClient.post('/assessments', assessmentData);
        return data;
    },

    // PUT /api/assessments/:id  (Draft only — fields)
    update: async (id, assessmentData) => {
        const { data } = await axiosClient.put(`/assessments/${id}`, assessmentData);
        return data;
    },

    // PUT /api/assessments/:id/publish  (status lifecycle: Draft→Published→Closed→Archived)
    updateStatus: async (id, status) => {
        const { data } = await axiosClient.put(`/assessments/${id}/publish`, { status });
        return data;
    },

    // DELETE /api/assessments/:id
    remove: async (id) => {
        const { data } = await axiosClient.delete(`/assessments/${id}`);
        return data;
    },

    // GET /api/submissions/assessment/:assessmentId
    getSubmissions: async (id) => {
        const { data } = await axiosClient.get(`/submissions/assessment/${id}`);
        return data;
    },

    // POST /api/assessments/:id/submissions
    submit: async (id, submissionData) => {
        const { data } = await axiosClient.post(`/assessments/${id}/submissions`, submissionData);
        return data;
    },

    // PUT /api/assessments/:id/submissions/:submissionId/grade
    grade: async (id, submissionId, gradeData) => {
        const { data } = await axiosClient.put(
            `/assessments/${id}/submissions/${submissionId}/grade`,
            gradeData
        );
        return data;
    },
};
import axiosClient from '../api/axiosClient';

export const contentService = {

    // Fetch contents across all courses — used by ContentsPage list view
    getAll: async () => {
        const { data: courses } = await axiosClient.get('/courses');
        const results = await Promise.allSettled(
            courses.map(c =>
                axiosClient.get(`/content/course/${c.courseID}`)
                    .then(r => r.data)
                    .catch(() => [])
            )
        );
        return results
            .filter(r => r.status === 'fulfilled')
            .flatMap(r => r.value);
    },

    // GET /api/content/course/:courseId
    getByCourse: async (courseId) => {
        const { data } = await axiosClient.get(`/content/course/${courseId}`);
        return data;
    },

    // GET /api/content/:id
    getById: async (id) => {
        const { data } = await axiosClient.get(`/content/${id}`);
        return data;
    },

    // POST /api/content/upload
    create: async (contentData) => {
        const { data } = await axiosClient.post('/content/upload', contentData);
        return data;
    },

    // PUT /api/content/:id/version — only sends uri + metadataJSON (UpdateContentVersionDto)
    update: async (id, contentData) => {
        const { data } = await axiosClient.put(`/content/${id}/version`, {
            uri: contentData.uri,
            metadataJSON: contentData.metadataJSON || null,
        });
        return data;
    },
};
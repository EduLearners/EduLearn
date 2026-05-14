import axiosClient from '../api/axiosClient';

export const auditLogService = {

    // GET /api/audit-log — Auditor, ITAdmin only
    // All params optional: userId, action, resourceType, resourceId, from, to, limit
    getAll: async (params = {}) => {
        const { data } = await axiosClient.get('/audit-log', { params });
        return data;
    },
};
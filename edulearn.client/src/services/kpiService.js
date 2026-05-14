import axiosClient from '../api/axiosClient';

export const kpiService = {

    // GET /api/kpis — Auditor, ITAdmin only
    getAll: async () => {
        const { data } = await axiosClient.get('/kpis');
        return data;
    },

    // POST /api/kpis/recalculate — ITAdmin only
    recalculate: async () => {
        const { data } = await axiosClient.post('/kpis/recalculate');
        return data;
    },

    // POST /api/kpis/seed — ITAdmin only
    seed: async () => {
        const { data } = await axiosClient.post('/kpis/seed');
        return data;
    },
};
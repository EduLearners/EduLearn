import axiosClient from '../api/axiosClient';

export const invoiceService = {

    // GET /api/invoices — Finance, ITAdmin only
    getAll: async () => {
        const { data } = await axiosClient.get('/invoices');
        return data;
    },

    // GET /api/invoices/student/:studentId — All authenticated
    getByStudent: async (studentId) => {
        const { data } = await axiosClient.get(`/invoices/student/${studentId}`);
        return data;
    },

    // GET /api/invoices/:id — All authenticated
    getById: async (id) => {
        const { data } = await axiosClient.get(`/invoices/${id}`);
        return data;
    },

    // POST /api/invoices/generate — Finance, ITAdmin
    generate: async (invoiceData) => {
        const { data } = await axiosClient.post('/invoices/generate', invoiceData);
        return data;
    },

    // POST /api/invoices/generate-bulk — Finance, ITAdmin
    generateBulk: async (bulkData) => {
        const { data } = await axiosClient.post('/invoices/generate-bulk', bulkData);
        return data;
    },
};
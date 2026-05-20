import axiosClient from '../api/axiosClient';

export const invoiceService = {

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
};
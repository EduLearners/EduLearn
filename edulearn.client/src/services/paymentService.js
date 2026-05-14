import axiosClient from '../api/axiosClient';

export const paymentService = {

    // GET /api/payments/invoice/:invoiceId — All authenticated
    getByInvoice: async (invoiceId) => {
        const { data } = await axiosClient.get(`/payments/invoice/${invoiceId}`);
        return data;
    },

    // POST /api/payments — Finance, ITAdmin
    create: async (paymentData) => {
        const { data } = await axiosClient.post('/payments', paymentData);
        return data;
    },
};
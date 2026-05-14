import axiosClient from '../api/axiosClient';

export const feeService = {

    // GET /api/fees/program/:programId/term/:term — Finance, ITAdmin
    getByProgramAndTerm: async (programId, term) => {
        const { data } = await axiosClient.get(`/fees/program/${programId}/term/${term}`);
        return data;
    },

    // POST /api/fees — Finance, ITAdmin
    create: async (feeData) => {
        const { data } = await axiosClient.post('/fees', feeData);
        return data;
    },

    // PUT /api/fees/:id — Finance, ITAdmin
    update: async (id, feeData) => {
        const { data } = await axiosClient.put(`/fees/${id}`, feeData);
        return data;
    },
};
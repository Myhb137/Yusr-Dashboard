import api from './api';

const ADMIN_STATS_ENDPOINT = import.meta.env.VITE_API_ANALYTICS_ENDPOINT || '/api/v1/admin/stats';
const ADMIN_USERS_ENDPOINT = '/api/v1/admin/users';

export const adminService = {
  getStats: async () => {
    const response = await api.get(ADMIN_STATS_ENDPOINT);
    return response.data;
  },

  getAllUsers: async () => {
    const response = await api.get(ADMIN_USERS_ENDPOINT);
    return response.data;
  },

  getUserDetails: async (id: string) => {
    const response = await api.get(`${ADMIN_USERS_ENDPOINT}/${id}`);
    return response.data;
  },

  updateUserRole: async (id: string, role: string) => {
    const response = await api.patch(`${ADMIN_USERS_ENDPOINT}/${id}/role`, { role });
    return response.data;
  },

  updateUserStatus: async (id: string, status: string) => {
    const response = await api.patch(`${ADMIN_USERS_ENDPOINT}/${id}/status`, { status });
    return response.data;
  },

  deleteUser: async (id: string) => {
    const response = await api.delete(`${ADMIN_USERS_ENDPOINT}/${id}`);
    return response.data;
  },
};

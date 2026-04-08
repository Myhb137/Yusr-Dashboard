import api from './api';

const AUTH_ENDPOINT = import.meta.env.VITE_API_AUTH_ENDPOINT || '/api/v1/auth';

export const authService = {
  login: async (credentials: any) => {
    const response = await api.post(`${AUTH_ENDPOINT}/login`, credentials);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    if (response.data.user) {
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  getStoredUser: () => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  getCurrentUser: async () => {
    const response = await api.get(`${AUTH_ENDPOINT}/user`);
    return response.data;
  },

  updateProfile: async (userData: any) => {
    const response = await api.put(`${AUTH_ENDPOINT}/user`, userData);
    return response.data;
  },

  changePassword: async (passwordData: any) => {
    const response = await api.put(`${AUTH_ENDPOINT}/user/password`, passwordData);
    return response.data;
  },

  logout: async () => {
    try { await api.post(`${AUTH_ENDPOINT}/logout`); } catch { /* ignore */ }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  forgotPassword: async (email: string) => {
    const response = await api.post(`${AUTH_ENDPOINT}/forgot-password`, { email });
    return response.data;
  },
};

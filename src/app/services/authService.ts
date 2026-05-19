import api from './api';
import {
  AuthResponse,
  ForgotPasswordRequest,
  LoginRequest,
  ResetPasswordRequest,
  SignupRequest,
  VerifyAdmin2FARequest,
  VerifyAdminOtpRequest,
} from '../types/api';

const AUTH_ENDPOINT = import.meta.env.VITE_API_AUTH_ENDPOINT || '/api/v1/auth';

export const authService = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>(`${AUTH_ENDPOINT}/login`, credentials);
    const data = response.data;

    // Save token
    if (data.token) {
      localStorage.setItem('token', data.token);
    }

    // Save user (merge top-level role into user object if needed)
    const user = data.user || {};
    localStorage.setItem('user', JSON.stringify(user));

    return data;
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

  updateProfile: async (userData: { firstName?: string; lastName?: string; phone?: string }) => {
    const response = await api.put(`${AUTH_ENDPOINT}/user`, userData);
    return response.data;
  },

  changePassword: async (passwordData: { currentPassword: string; newPassword: string }) => {
    const response = await api.put(`${AUTH_ENDPOINT}/user/password`, passwordData);
    return response.data;
  },

  logout: async () => {
    try { await api.post(`${AUTH_ENDPOINT}/logout`); } catch { /* ignore */ }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  forgotPassword: async (payload: ForgotPasswordRequest) => {
    const response = await api.post(`${AUTH_ENDPOINT}/forgot-password`, payload);
    return response.data;
  },

  resetPassword: async (resetData: ResetPasswordRequest) => {
    const response = await api.post(`${AUTH_ENDPOINT}/reset-password`, resetData);
    return response.data;
  },

  signup: async (userData: SignupRequest) => {
    const response = await api.post(`${AUTH_ENDPOINT}/signup`, userData);
    return response.data;
  },

  verifyAdmin2FA: async (payload: VerifyAdmin2FARequest) => {
    const response = await api.post<AuthResponse>(`${AUTH_ENDPOINT}/login/verify-admin-2fa`, payload);
    const data = response.data;

    if (data.token) {
      localStorage.setItem('token', data.token);
    }
    const user = data.user || {};
    localStorage.setItem('user', JSON.stringify(user));

    return data;
  },

  verifyAdminOtp: async (payload: VerifyAdminOtpRequest) => {
    const response = await api.post<AuthResponse>(`${AUTH_ENDPOINT}/login/verify-admin-otp`, payload);
    const data = response.data;

    if (data.token) {
      localStorage.setItem('token', data.token);
    }
    const user = data.user || {};
    localStorage.setItem('user', JSON.stringify(user));

    return data;
  },
};

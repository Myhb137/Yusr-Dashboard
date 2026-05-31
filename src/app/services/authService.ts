import api from './api';
import {
  AuthResponse,
  ForgotPasswordRequest,
  LoginRequest,
  ResetPasswordRequest,
  SignupRequest,
  VerifyAdminOtpRequest,
} from '../types/api';

const AUTH_ENDPOINT = import.meta.env.VITE_API_AUTH_ENDPOINT || '/api/v1/auth';
const VERIFY_ADMIN_OTP_PATH =
  import.meta.env.VITE_API_AUTH_VERIFY_ADMIN_OTP || '/api/v1/auth/login/verify-admin-otp';

function persistAuthSession(data: AuthResponse) {
  if (data.token) {
    localStorage.setItem('token', data.token);
  }
  const user = data.user || {};
  const email =
    typeof user.email === 'string' ? user.email.trim().toLowerCase() : undefined;
  localStorage.setItem(
    'user',
    JSON.stringify({
      ...user,
      ...(email ? { email, _identityEmails: [email] } : {}),
    })
  );
}

export const authService = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>(`${AUTH_ENDPOINT}/login`, credentials);
    const data = response.data;

    if (data.token) {
      persistAuthSession(data);
    }

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
    try {
      await api.post(`${AUTH_ENDPOINT}/logout`);
    } catch {
      /* ignore */
    }
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

  /** POST /api/v1/auth/login/verify-admin-otp — agency admin email OTP */
  verifyAdminOtp: async (payload: VerifyAdminOtpRequest): Promise<AuthResponse> => {
    const otp = String(payload.otp ?? payload.code ?? '').trim();
    if (!payload.twoFactorToken?.trim()) {
      throw new Error('Missing twoFactorToken from login.');
    }
    if (!/^\d{6}$/.test(otp)) {
      throw new Error('OTP must be a 6-digit code.');
    }

    const body = {
      twoFactorToken: payload.twoFactorToken.trim(),
      otp,
    };

    const response = await api.post<AuthResponse>(VERIFY_ADMIN_OTP_PATH, body);
    const data = response.data;
    persistAuthSession(data);
    return data;
  },
};

import api from './api';
import { User } from '../types/api';

const ADMIN_STATS_ENDPOINT = import.meta.env.VITE_API_ANALYTICS_ENDPOINT || '/api/v1/admin/stats';
const ADMIN_USERS_ENDPOINT = import.meta.env.VITE_API_ADMIN_USERS || '/api/v1/admin/users';
const ADMIN_ADMINS_ENDPOINT = import.meta.env.VITE_API_ADMIN_ADMINS || '/api/v1/admin/admins';

export const adminService = {
  getStats: async () => {
    const response = await api.get(ADMIN_STATS_ENDPOINT);
    return response.data;
  },

  // General User Management
  getAllUsers: async (params?: { search?: string; role?: 'user' | 'admin' | 'superAdmin'; limit?: number; offset?: number }): Promise<User[]> => {
    const response = await api.get(ADMIN_USERS_ENDPOINT, { params });
    const data = response.data;
    return Array.isArray(data) ? data : (data?.users || data?.data || []);
  },

  getUserDetails: async (id: string): Promise<User> => {
    const response = await api.get(`${ADMIN_USERS_ENDPOINT}/${id}`);
    return response.data;
  },

  updateUserRole: async (id: string, role: 'user' | 'admin' | 'superAdmin') => {
    const response = await api.patch(`${ADMIN_USERS_ENDPOINT}/${id}/role`, { role });
    return response.data;
  },

  // Dedicated Agency Admin Management
  getAllAdmins: async (params?: { search?: string; limit?: number; offset?: number }): Promise<User[]> => {
    const response = await api.get(ADMIN_ADMINS_ENDPOINT, { params });
    const data = response.data;
    return Array.isArray(data) ? data : (data?.admins || data?.users || data?.data || []);
  },

  getAdminDetails: async (id: string) => {
    const response = await api.get(`${ADMIN_ADMINS_ENDPOINT}/${id}`);
    return response.data;
  },

  createAdmin: async (adminData: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    password: string;
    agency_name?: string | null;
    agency_logo_url?: string | null;
    doc_agrement_url?: string | null;
    doc_registre_commerce_url?: string | null;
  }) => {
    const response = await api.post(ADMIN_ADMINS_ENDPOINT, adminData);
    return response.data;
  },

  updateAdmin: async (id: string, adminData: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    password?: string;
    agency_name?: string | null;
    agency_logo_url?: string | null;
    doc_agrement_url?: string | null;
    doc_registre_commerce_url?: string | null;
    agency_verification_status?: 'pending' | 'approved' | 'rejected';
  }) => {
    const response = await api.patch(`${ADMIN_ADMINS_ENDPOINT}/${id}`, adminData);
    return response.data;
  },

  deleteAdmin: async (id: string) => {
    const response = await api.delete(`${ADMIN_ADMINS_ENDPOINT}/${id}`);
    return response.data;
  },

  broadcastNotification: async (notificationData: any) => {
    const endpoint = import.meta.env.VITE_API_ADMIN_NOTIFICATIONS_BROADCAST || '/api/v1/admin/notifications/broadcast';
    const response = await api.post(endpoint, notificationData);
    return response.data;
  },
};

import api from './api';

const AUTH_NOTIFICATIONS_ENDPOINT = '/api/v1/auth';
const NOTIFICATIONS_ENDPOINT = '/api/v1/notifications';

export const notificationService = {
  /** Register FCM token for push notifications */
  registerFcmToken: async (fcmTokenData: { fcm_token: string; platform?: 'ios' | 'android' | 'web' | 'unknown' }) => {
    const response = await api.post(`${AUTH_NOTIFICATIONS_ENDPOINT}/fcm-token`, fcmTokenData);
    return response.data;
  },

  /** Get current user's notification history */
  getNotifications: async (params?: { limit?: number; offset?: number }) => {
    const response = await api.get(NOTIFICATIONS_ENDPOINT, { params });
    return response.data;
  },
};

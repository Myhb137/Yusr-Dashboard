import api from './api';

const BOOKINGS_ENDPOINT = import.meta.env.VITE_API_BOOKINGS_ENDPOINT || '/api/v1/bookings';
const USERS_ENDPOINT = '/api/v1/admin/users';

export const bookingService = {
  getAllBookings: async () => {
    const response = await api.get(BOOKINGS_ENDPOINT);
    return response.data;
  },

  createBooking: async (bookingData: any) => {
    const response = await api.post(BOOKINGS_ENDPOINT, bookingData);
    return response.data;
  },

  getUserBookings: async (userId: string) => {
    const response = await api.get(`${BOOKINGS_ENDPOINT}/user/${userId}`);
    return response.data;
  },

  updateBookingStatus: async (id: string, status: string) => {
    const response = await api.put(`${BOOKINGS_ENDPOINT}/${id}/status`, { status });
    return response.data;
  },

  getUserById: async (userId: string) => {
    const response = await api.get(`${USERS_ENDPOINT}/${userId}`);
    return response.data;
  },
};

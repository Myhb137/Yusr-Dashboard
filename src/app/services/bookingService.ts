import api from './api';
import {
  Booking,
  BookingCreateRequest,
  BookingStatus,
  BookingStatusUpdateRequest,
  PaymentStatus,
} from '../types/api';

const BOOKINGS_ENDPOINT = import.meta.env.VITE_API_BOOKINGS_ENDPOINT || '/api/v1/bookings';

export const bookingService = {
  getAllBookings: async (): Promise<Booking[]> => {
    const response = await api.get(BOOKINGS_ENDPOINT);
    const data = response.data;
    return Array.isArray(data) ? data : (data?.bookings || data?.data || []);
  },

  createBooking: async (bookingData: BookingCreateRequest): Promise<Booking> => {
    const response = await api.post(BOOKINGS_ENDPOINT, bookingData);
    return response.data;
  },

  getUserBookings: async (userId: string) => {
    const response = await api.get(`${BOOKINGS_ENDPOINT}/user/${userId}`);
    return response.data;
  },

  /**
   * PUT /api/v1/bookings/{id}/status
   * Unified endpoint: always sends status, payment_status, and deposit_amount together.
   * - When a user books: status=pending, payment_status=pending, deposit_amount=0
   * - When admin validates fee payment: status=confirmed, payment_status=paid, deposit_amount=<amount>
   */
  updateBookingStatus: async (
    id: string,
    status: BookingStatus,
    paymentStatus: PaymentStatus = 'pending',
    depositAmount: number = 0
  ) => {
    const payload: BookingStatusUpdateRequest = {
      status,
      payment_status: paymentStatus,
      deposit_amount: depositAmount,
    };
    const response = await api.put(`${BOOKINGS_ENDPOINT}/${id}/status`, payload);
    return response.data;
  },
};

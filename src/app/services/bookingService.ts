import api from './api';
import { Booking, BookingCreateRequest, BookingStatusUpdateRequest } from '../types/api';
import type { BookingStatusUpdatePayload } from '../utils/bookingStatus';

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

  /** PUT /api/v1/bookings/{id}/status (OpenAPI — not PATCH) */
  updateBookingStatus: async (id: string, payload: BookingStatusUpdatePayload) => {
    if (!payload.status) {
      throw new Error('status is required for PUT /api/v1/bookings/{id}/status');
    }

    const body: BookingStatusUpdateRequest = {
      status: payload.status as BookingStatusUpdateRequest['status'],
    };
    if (payload.payment_status !== undefined) {
      body.payment_status = payload.payment_status;
    }
    if (payload.deposit_amount !== undefined) {
      body.deposit_amount = payload.deposit_amount;
    }
    if (payload.receipt_url !== undefined) {
      body.receipt_url = payload.receipt_url;
    }

    const response = await api.put(`${BOOKINGS_ENDPOINT}/${id}/status`, body);
    return response.data;
  },
};

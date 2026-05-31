import api from './api';
import { Booking, BookingCreateRequest } from '../types/api';
import { isSuperAdmin } from '../utils/authRole';
import {
  buildBookingsQueryParams,
  type GetBookingsParams,
} from '../utils/bookingQuery';
import type { BookingStatusUpdateRequest } from '../types/api';
import {
  filterBookingsForRole,
  normalizeBookingsList,
  normalizeOffersList,
  resolveAdminTenant,
  type AdminTenantContext,
} from '../utils/tenantScope';

const BOOKINGS_ENDPOINT = import.meta.env.VITE_API_BOOKINGS_ENDPOINT || '/api/v1/bookings';
const OFFERS_ENDPOINT = import.meta.env.VITE_API_OFFERS_ENDPOINT || '/api/v1/offers';

export type { GetBookingsParams } from '../utils/bookingQuery';

export const bookingService = {
  /** GET /api/v1/bookings — Swagger query params only (status, payment_status, limit, offset). */
  getAllBookings: async (params?: GetBookingsParams): Promise<Booking[]> => {
    const response = await api.get(BOOKINGS_ENDPOINT, {
      params: buildBookingsQueryParams(params),
    });
    const data = response.data;
    return Array.isArray(data) ? data : (data?.bookings || data?.data || []);
  },

  /**
   * GET /api/v1/bookings scoped to this agency's offers only (same rules as My Offers).
   * Super admin receives all bookings.
   */
  getDashboardBookings: async (
    tenant?: AdminTenantContext,
    params?: GetBookingsParams
  ): Promise<Booking[]> => {
    const scope = tenant ?? (await resolveAdminTenant());

    const queryParams = buildBookingsQueryParams(params);

    const [bookingsRes, offersRes] = await Promise.all([
      api.get(BOOKINGS_ENDPOINT, { params: queryParams }),
      isSuperAdmin(scope.role)
        ? Promise.resolve({ data: [] })
        : api.get(OFFERS_ENDPOINT),
    ]);

    const bookings = normalizeBookingsList(bookingsRes.data);

    if (isSuperAdmin(scope.role)) {
      return bookings as Booking[];
    }

    const offers = normalizeOffersList(offersRes.data);

    // Agency admin: filter bookings based on filtered offers
    return filterBookingsForRole(bookings, offers, scope.role, scope) as Booking[];
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
   * POST /api/v1/bookings/{id}/deposit-receipt
   * Upload payment proof only — does not send lifecycle status.
   */
  uploadDepositReceipt: async (bookingId: string, file: File): Promise<unknown> => {
    const formData = new FormData();
    formData.append('receipt', file);

    const response = await api.post(
      `${BOOKINGS_ENDPOINT}/${bookingId}/deposit-receipt`,
      formData
    );
    return response.data;
  },

  /** PUT /api/v1/bookings/{id}/status — Swagger BookingStatusUpdate body. */
  updateBooking: async (id: string, body: BookingStatusUpdateRequest) => {
    const response = await api.put(`${BOOKINGS_ENDPOINT}/${id}/status`, body);
    return response.data;
  },
};

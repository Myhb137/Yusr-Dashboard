import {
  BOOKING_STATUS_QUERY_ENUM,
  PAYMENT_STATUS_QUERY_ENUM,
  isBookingStatusQuery,
  isPaymentStatusQuery,
  type BookingStatusQueryValue,
  type PaymentStatusQueryValue,
} from '../constants/bookingApiEnums';

export type { BookingStatusQueryValue, PaymentStatusQueryValue };

/** @deprecated use BOOKING_STATUS_QUERY_ENUM */
export const BOOKING_STATUS_QUERY_VALUES = BOOKING_STATUS_QUERY_ENUM;

/** GET /bookings payment_status filter — production-safe (no under_review) */
export const PAYMENT_STATUS_QUERY_VALUES = PAYMENT_STATUS_QUERY_ENUM;

export interface GetBookingsParams {
  status?: BookingStatusQueryValue;
  /** Never `under_review` — rejected by production DB on GET filter */
  payment_status?: PaymentStatusQueryValue;
  limit?: number;
  offset?: number;
}

export const DEFAULT_BOOKINGS_LIMIT = 50;
export const MAX_BOOKINGS_LIMIT = 100;

export function isValidBookingStatusQuery(value: string): value is BookingStatusQueryValue {
  return isBookingStatusQuery(value);
}

export function isValidPaymentStatusQuery(value: string): value is PaymentStatusQueryValue {
  return isPaymentStatusQuery(value);
}

/** Build GET /bookings query — invalid enum values are omitted (never sent). */
export function buildBookingsQueryParams(params?: GetBookingsParams): Record<string, string | number> {
  const query: Record<string, string | number> = {};

  if (params?.status && isValidBookingStatusQuery(params.status)) {
    query.status = params.status;
  }

  if (params?.payment_status && isValidPaymentStatusQuery(params.payment_status)) {
    query.payment_status = params.payment_status;
  }

  const limit = params?.limit ?? DEFAULT_BOOKINGS_LIMIT;
  query.limit = Math.min(MAX_BOOKINGS_LIMIT, Math.max(1, limit));
  query.offset = Math.max(0, params?.offset ?? 0);

  return query;
}

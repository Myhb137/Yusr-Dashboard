/**
 * Booking API enums — OpenAPI 3.0.3 (Travel App API).
 * Single source of truth for values sent to / received from the backend.
 *
 * IMPORTANT:
 * - Do NOT transform casing — Swagger values are lowercase snake_case.
 * - GET /bookings query `payment_status` must NOT include values the DB enum rejects.
 *   Production returns: invalid input value for enum payment_status: "under_review"
 *   when filtering by under_review, so it is excluded from GET query filters only.
 */

/** GET /bookings?status= — query filter */
export const BOOKING_STATUS_QUERY_ENUM = [
  'pending',
  'confirmed',
  'validated',
  'ready_for_agency',
  'completed',
  'cancelled',
] as const;

/**
 * GET /bookings?payment_status= — query filter (production-safe subset).
 * `under_review` may appear on booking rows but is NOT accepted as a filter value.
 */
export const PAYMENT_STATUS_QUERY_ENUM = [
  'pending',
  'paid',
  'failed',
  'refunded',
] as const;

/** Booking.status — PUT /bookings/{id}/status + response */
export const BOOKING_STATUS_ENUM = BOOKING_STATUS_QUERY_ENUM;

/** payment_status on booking rows + PUT body (includes values set by backend) */
export const PAYMENT_STATUS_ENUM = [
  'pending',
  'under_review',
  'paid',
  'failed',
  'refunded',
] as const;

/** PUT /bookings/{id}/status — lifecycle forward chain (DB bookings_status_check) */
export const BOOKING_STATUS_NEXT: Partial<
  Record<(typeof BOOKING_STATUS_ENUM)[number], (typeof BOOKING_STATUS_ENUM)[number]>
> = {
  pending: 'confirmed',
  confirmed: 'validated',
  validated: 'ready_for_agency',
  ready_for_agency: 'completed',
};

export const BOOKING_LIFECYCLE_STEPS = [
  'pending',
  'confirmed',
  'validated',
  'ready_for_agency',
  'completed',
] as const satisfies readonly (typeof BOOKING_STATUS_ENUM)[number][];

export const LIFECYCLE_FLOW_LABEL =
  'pending → confirmed → validated → ready_for_agency → completed';

export const PAYMENT_FLOW_LABEL =
  'POST /deposit-receipt → payment review → PUT payment_status paid|failed';

export type BookingStatusValue = (typeof BOOKING_STATUS_ENUM)[number];
export type PaymentStatusValue = (typeof PAYMENT_STATUS_ENUM)[number];
export type PaymentStatusQueryValue = (typeof PAYMENT_STATUS_QUERY_ENUM)[number];
export type BookingStatusQueryValue = (typeof BOOKING_STATUS_QUERY_ENUM)[number];

export const SWAGGER_DEPOSIT_DZD = 1000;

export function trimApiEnum(value: unknown): string {
  return String(value ?? '').trim();
}

export function isBookingStatus(value: string): value is BookingStatusValue {
  return (BOOKING_STATUS_ENUM as readonly string[]).includes(value);
}

export function isPaymentStatus(value: string): value is PaymentStatusValue {
  return (PAYMENT_STATUS_ENUM as readonly string[]).includes(value);
}

export function isPaymentStatusQuery(value: string): value is PaymentStatusQueryValue {
  return (PAYMENT_STATUS_QUERY_ENUM as readonly string[]).includes(value);
}

export function isBookingStatusQuery(value: string): value is BookingStatusQueryValue {
  return (BOOKING_STATUS_QUERY_ENUM as readonly string[]).includes(value);
}

/** True when super admin can approve/reject payment (receipt uploaded, awaiting review). */
export function isPaymentAwaitingReview(
  paymentStatus: string | null,
  hasReceipt: boolean
): boolean {
  if (!hasReceipt) return false;
  const p = trimApiEnum(paymentStatus);
  return p === 'under_review';
}

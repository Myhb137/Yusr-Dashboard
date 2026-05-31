/**
 * Strict booking status state machine — PUT /api/v1/bookings/{id}/status
 * UI flow: pending → confirmed → validated → ready_for_agency → completed
 */

import type { NormalizedRole } from './authRole';
import { isSuperAdmin, isAdmin } from './authRole';

export enum BookingStatus {
  Pending = 'pending',
  Confirmed = 'confirmed',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

export enum BookingPaymentStatus {
  Pending = 'pending',
  UnderReview = 'under_review',
  Paid = 'paid',
  Failed = 'failed',
  Refunded = 'refunded',
}

export const STATUS_FLOW_ORDER: BookingStatus[] = [
  BookingStatus.Pending,
  BookingStatus.Confirmed,
  BookingStatus.Completed,
];

export const STATUS_NOT_ALLOWED_ERROR =
  'That status transition is not allowed. Lifecycle flow: pending → confirmed → ready_for_agency → completed. Do not send payment_status to /status.';

export const STATUS_FLOW_LABEL = 'pending → confirmed → validated → ready_for_agency → completed';

const NEXT_STATUS: Partial<Record<BookingStatus, BookingStatus>> = {
  [BookingStatus.Pending]: BookingStatus.Confirmed,
  [BookingStatus.Confirmed]: BookingStatus.Completed,
};

export const DEFAULT_DEPOSIT_PERCENT = Number(
  import.meta.env.VITE_BOOKING_DEPOSIT_PERCENT ?? 10
);

export const DB_BOOKING_STATUSES = [
  'pending',
  'confirmed',
  'completed',
  'cancelled',
] as const;

export type DbBookingStatus = (typeof DB_BOOKING_STATUSES)[number];

export function parseTotalPrice(value: string | number | undefined): number {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  const n = parseFloat(String(value || '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function calculateDepositAmount(
  totalPrice: number,
  options?: { fixedAmount?: number; percent?: number }
): number {
  if (options?.fixedAmount != null && options.fixedAmount > 0) {
    return Math.round(options.fixedAmount);
  }
  const pct = options?.percent ?? DEFAULT_DEPOSIT_PERCENT;
  return Math.max(0, Math.round((totalPrice * pct) / 100));
}

export function toBookingStatus(status: string): BookingStatus {
  const s = String(status || '').trim().toLowerCase();
  if (Object.values(BookingStatus).includes(s as BookingStatus)) {
    return s as BookingStatus;
  }
  return BookingStatus.Pending;
}

/** UI canonical → default API value */
export function toApiStatus(status: BookingStatus | string): DbBookingStatus {
  const s = String(status).trim().toLowerCase();
  if (DB_BOOKING_STATUSES.includes(s as DbBookingStatus)) {
    return s as DbBookingStatus;
  }
  return 'pending';
}

export function fromApiStatus(status: string): BookingStatus {
  return toBookingStatus(status);
}

/** Pick API status for a forward transition based on actual DB status */
export function resolveNextApiStatus(
  rawCurrentStatus: string,
  targetCanonical: BookingStatus
): DbBookingStatus {
  return toApiStatus(targetCanonical);
}

/** Alternate API status when bookings_status_check fails.
 * The confirmed↔validated swap is intentionally removed — it violated the strict
 * sequential workflow and caused wrong status attempts on the DB.
 */
export function getAlternateApiStatus(status: DbBookingStatus): DbBookingStatus | null {
  return null;
}

export function getNextStatus(current: string): BookingStatus | null {
  return NEXT_STATUS[toBookingStatus(current)] ?? null;
}

export function validateTransition(from: string, to: string): void {
  const fromStatus = toBookingStatus(from);
  const toStatus = toBookingStatus(to);
  const expected = NEXT_STATUS[fromStatus];

  if (!expected || toStatus !== expected) {
    throw new Error(STATUS_NOT_ALLOWED_ERROR);
  }
}

export type StatusAction =
  | { type: 'confirm' }
  | { type: 'set_deposit' }
  | { type: 'validate_receipt' }
  | { type: 'release_to_agency' }
  | { type: 'complete' };

export function getAllowedActions(
  role: NormalizedRole,
  booking: {
    status: string;
  }
): StatusAction[] {
  if (!isAdmin(role)) return [];

  const status = toBookingStatus(booking.status);
  const actions: StatusAction[] = [];

  if (isSuperAdmin(role)) {
    if (status === BookingStatus.Confirmed) {
      actions.push({ type: 'complete' });
    }
  } else if (role === 'admin') {
    // Agency Admin
    if (status === BookingStatus.Pending) {
      actions.push({ type: 'confirm' });
    }
  }

  return actions;
}

// Removed payload building and frontend validations as per API-driven requirement

/** Current DB status for PUT /api/v1/bookings/{id}/status (required field) */
export function currentApiStatusValue(apiStatus: string): DbBookingStatus {
  return toApiStatus(apiStatus);
}



export type CanonicalBookingStatus = BookingStatus;

export function toCanonicalStatus(status: string): BookingStatus {
  return toBookingStatus(status);
}

export function getNextStatuses(current: string): BookingStatus[] {
  const next = getNextStatus(current);
  return next ? [next] : [];
}

export function getStatusLabelKey(status: BookingStatus | string): string {
  return toBookingStatus(String(status));
}

export function formatTransitionHint(current: string): string {
  const next = getNextStatus(current);
  return next ? getStatusLabelKey(next) : '';
}

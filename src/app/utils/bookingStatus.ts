/**
 * Strict booking status state machine — PUT /api/v1/bookings/{id}/status
 * UI flow: pending → confirmed → ready_for_agency → completed
 * DB may store step 2 as `confirmed` or `validated` — resolved per booking via resolveNextApiStatus()
 */

import type { NormalizedRole } from './authRole';
import { isSuperAdmin, isAdmin } from './authRole';

export enum BookingStatus {
  Pending = 'pending',
  Confirmed = 'confirmed',
  ReadyForAgency = 'ready_for_agency',
  Completed = 'completed',
}

export enum BookingPaymentStatus {
  Pending = 'pending',
  Paid = 'paid',
  Failed = 'failed',
}

export const STATUS_FLOW_ORDER: BookingStatus[] = [
  BookingStatus.Pending,
  BookingStatus.Confirmed,
  BookingStatus.ReadyForAgency,
  BookingStatus.Completed,
];

export const STATUS_NOT_ALLOWED_ERROR =
  'That status is not allowed. Use the next step only: Pending → Confirmed → Ready for agency → Completed.';

export const STATUS_FLOW_LABEL = 'Pending → Confirmed → Ready for agency → Completed';

const NEXT_STATUS: Partial<Record<BookingStatus, BookingStatus>> = {
  [BookingStatus.Pending]: BookingStatus.Confirmed,
  [BookingStatus.Confirmed]: BookingStatus.ReadyForAgency,
  [BookingStatus.ReadyForAgency]: BookingStatus.Completed,
};

export const DEFAULT_DEPOSIT_PERCENT = Number(
  import.meta.env.VITE_BOOKING_DEPOSIT_PERCENT ?? 10
);

/** Prefer `confirmed` or `validated` for pending → step 2 (env override) */
const CONFIRM_API_STATUS = String(
  import.meta.env.VITE_BOOKING_CONFIRM_API_STATUS ?? 'confirmed'
).toLowerCase();

export const DB_BOOKING_STATUSES = [
  'pending',
  'confirmed',
  'validated',
  'ready_for_agency',
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
  if (s === 'validated' || s === 'confirmed') return BookingStatus.Confirmed;
  if (Object.values(BookingStatus).includes(s as BookingStatus)) {
    return s as BookingStatus;
  }
  return BookingStatus.Pending;
}

/** UI canonical → default API value */
export function toApiStatus(status: BookingStatus | string): DbBookingStatus {
  const canonical = toBookingStatus(String(status));
  if (canonical === BookingStatus.Confirmed) {
    return CONFIRM_API_STATUS === 'validated' ? 'validated' : 'confirmed';
  }
  if (canonical === BookingStatus.Pending) return 'pending';
  if (canonical === BookingStatus.ReadyForAgency) return 'ready_for_agency';
  if (canonical === BookingStatus.Completed) return 'completed';
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
  const raw = String(rawCurrentStatus || '').trim().toLowerCase();
  const target = toBookingStatus(targetCanonical);

  if (target === BookingStatus.Confirmed && raw === 'pending') {
    return CONFIRM_API_STATUS === 'validated' ? 'validated' : 'confirmed';
  }

  if (target === BookingStatus.ReadyForAgency) {
    if (raw === 'confirmed' || raw === 'validated') return 'ready_for_agency';
    return 'ready_for_agency';
  }

  if (target === BookingStatus.Completed) {
    return 'completed';
  }

  return toApiStatus(target);
}

/** Alternate API status when bookings_status_check fails (confirmed ↔ validated) */
export function getAlternateApiStatus(status: DbBookingStatus): DbBookingStatus | null {
  if (status === 'confirmed') return 'validated';
  if (status === 'validated') return 'confirmed';
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
    apiStatus: string;
    paymentStatus: string;
    depositAmount: number;
    receiptUrl?: string | null;
    receiptValidated: boolean;
  }
): StatusAction[] {
  if (!isAdmin(role)) return [];

  const paymentLocked = isPaymentConfirmed(booking.paymentStatus);
  if (paymentLocked && !isSuperAdmin(role)) return [];

  const status = toBookingStatus(booking.status);
  const actions: StatusAction[] = [];

  if (status === BookingStatus.Pending && (role === 'admin' || role === 'superadmin')) {
    actions.push({ type: 'confirm' });
  }

  if (status === BookingStatus.Confirmed && isSuperAdmin(role)) {
    actions.push({ type: 'set_deposit' });
    if (booking.receiptUrl?.trim()) {
      actions.push({ type: 'validate_receipt' });
    }
    if (
      booking.depositAmount > 0 &&
      Boolean(booking.receiptUrl?.trim()) &&
      booking.receiptValidated
    ) {
      actions.push({ type: 'release_to_agency' });
    }
  }

  if (status === BookingStatus.ReadyForAgency) {
    if (isSuperAdmin(role) || !paymentLocked) {
      actions.push({ type: 'complete' });
    }
  }

  return actions;
}

export function assertRoleCanTransition(
  role: NormalizedRole,
  from: string,
  to: string,
  booking: {
    paymentStatus: string;
    depositAmount: number;
    receiptUrl?: string | null;
    receiptValidated: boolean;
  }
): void {
  if (!isAdmin(role)) {
    throw new Error('Users cannot change booking status.');
  }

  assertCanModifyWhenPaymentPaid(role, booking.paymentStatus);
  validateTransition(from, to);

  const fromStatus = toBookingStatus(from);
  const toStatus = toBookingStatus(to);

  if (fromStatus === BookingStatus.Pending && toStatus === BookingStatus.Confirmed) {
    return;
  }

  if (fromStatus === BookingStatus.Confirmed && toStatus === BookingStatus.ReadyForAgency) {
    if (!isSuperAdmin(role)) {
      throw new Error('Only super admin can release bookings to the agency.');
    }
    if (booking.depositAmount <= 0) {
      throw new Error('Deposit amount must be set before moving to ready for agency.');
    }
    if (!booking.receiptUrl?.trim()) {
      throw new Error('Payment receipt is required before moving to ready for agency.');
    }
    if (!booking.receiptValidated) {
      throw new Error('Super admin must validate the payment receipt before proceeding.');
    }
    return;
  }

  if (fromStatus === BookingStatus.ReadyForAgency && toStatus === BookingStatus.Completed) {
    if (!isSuperAdmin(role) && isPaymentConfirmed(booking.paymentStatus)) {
      throw new Error(PAYMENT_LOCKED_ERROR);
    }
    return;
  }

  throw new Error(STATUS_NOT_ALLOWED_ERROR);
}

export interface BookingStatusUpdatePayload {
  /** Omit when only updating deposit/payment (same workflow step in DB) */
  status?: DbBookingStatus;
  payment_status?: BookingPaymentStatus | 'under_review';
  deposit_amount?: number;
  receipt_url?: string;
}

export function mapPaymentStatusForApi(
  status: string
): BookingPaymentStatus | 'under_review' | undefined {
  const s = String(status || '').toLowerCase();
  if (s === 'paid') return BookingPaymentStatus.Paid;
  if (s === 'failed') return BookingPaymentStatus.Failed;
  if (s === 'under_review') return 'under_review';
  if (s === 'pending' || s === 'refunded') return BookingPaymentStatus.Pending;
  return undefined;
}

export function isReceiptValidated(booking: {
  paymentStatus: string;
  receiptValidated?: boolean;
}): boolean {
  if (booking.receiptValidated === true) return true;
  return String(booking.paymentStatus).toLowerCase() === 'paid';
}

export function isPaymentConfirmed(paymentStatus: string): boolean {
  return String(paymentStatus || '').toLowerCase() === 'paid';
}

export const PAYMENT_LOCKED_ERROR =
  'Payment is confirmed. Only super admin can change booking status or payment status.';

export function assertCanModifyWhenPaymentPaid(
  role: NormalizedRole,
  paymentStatus: string
): void {
  if (isPaymentConfirmed(paymentStatus) && !isSuperAdmin(role)) {
    throw new Error(PAYMENT_LOCKED_ERROR);
  }
}

export function buildStatusUpdatePayload(
  booking: {
    status: string;
    apiStatus: string;
    paymentStatus: string;
    depositAmount: number;
    totalPrice: number;
    receiptUrl?: string | null;
    receiptValidated: boolean;
  },
  nextStatus: string,
  role: NormalizedRole,
  options?: {
    depositAmount?: number;
    validateReceipt?: boolean;
  }
): BookingStatusUpdatePayload {
  assertRoleCanTransition(role, booking.status, nextStatus, {
    paymentStatus: booking.paymentStatus,
    depositAmount: options?.depositAmount ?? booking.depositAmount,
    receiptUrl: booking.receiptUrl,
    receiptValidated:
      options?.validateReceipt === true
        ? true
        : isReceiptValidated({
            paymentStatus: booking.paymentStatus,
            receiptValidated: booking.receiptValidated,
          }),
  });

  const to = toBookingStatus(nextStatus);
  const from = toBookingStatus(booking.status);
  const payload: BookingStatusUpdatePayload = {
    status: resolveNextApiStatus(booking.apiStatus, to),
  };

  if (from === BookingStatus.Pending && to === BookingStatus.Confirmed) {
    payload.payment_status = booking.receiptUrl?.trim()
      ? 'under_review'
      : BookingPaymentStatus.Pending;
    const deposit =
      options?.depositAmount ??
      (booking.depositAmount > 0
        ? booking.depositAmount
        : calculateDepositAmount(booking.totalPrice));
    if (deposit > 0) {
      payload.deposit_amount = deposit;
    }
  }

  if (from === BookingStatus.Confirmed && to === BookingStatus.ReadyForAgency) {
    payload.deposit_amount = options?.depositAmount ?? booking.depositAmount;
    payload.payment_status = BookingPaymentStatus.Paid;
    if (booking.receiptUrl?.trim()) {
      payload.receipt_url = booking.receiptUrl.trim();
    }
  }

  if (from === BookingStatus.ReadyForAgency && to === BookingStatus.Completed) {
    payload.payment_status =
      mapPaymentStatusForApi(booking.paymentStatus) ?? BookingPaymentStatus.Paid;
  }

  return payload;
}

/** Current DB status for PUT /api/v1/bookings/{id}/status (required field) */
export function currentApiStatusValue(apiStatus: string): DbBookingStatus {
  const raw = String(apiStatus || '').trim().toLowerCase();
  if (DB_BOOKING_STATUSES.includes(raw as DbBookingStatus)) {
    return raw as DbBookingStatus;
  }
  return toApiStatus(BookingStatus.Confirmed);
}

/** Save deposit via PUT /api/v1/bookings/{id}/status */
export function buildDepositSavePayload(
  booking: {
    apiStatus: string;
    status: string;
    paymentStatus: string;
    receiptUrl?: string | null;
  },
  role: NormalizedRole,
  depositAmount: number
): BookingStatusUpdatePayload {
  if (!isSuperAdmin(role)) {
    throw new Error('Only super admin can set the deposit amount.');
  }
  assertCanModifyWhenPaymentPaid(role, booking.paymentStatus);
  if (depositAmount <= 0) {
    throw new Error('Deposit amount must be greater than zero.');
  }

  const raw = booking.apiStatus.trim().toLowerCase();

  if (raw === 'pending') {
    return {
      status: resolveNextApiStatus('pending', BookingStatus.Confirmed),
      deposit_amount: depositAmount,
      payment_status: BookingPaymentStatus.Pending,
    };
  }

  return {
    status: currentApiStatusValue(booking.apiStatus),
    deposit_amount: depositAmount,
    payment_status: booking.receiptUrl?.trim() ? 'under_review' : BookingPaymentStatus.Pending,
  };
}

/** Validate receipt — PUT with required status + payment_status paid */
export function buildReceiptValidationPayload(
  booking: {
    apiStatus: string;
    paymentStatus: string;
    depositAmount: number;
    totalPrice: number;
    receiptUrl?: string | null;
  },
  role: NormalizedRole,
  depositAmount?: number
): BookingStatusUpdatePayload {
  if (!isSuperAdmin(role)) {
    throw new Error('Only super admin can validate payment receipts.');
  }
  assertCanModifyWhenPaymentPaid(role, booking.paymentStatus);
  if (!booking.receiptUrl?.trim()) {
    throw new Error('No payment receipt uploaded for this booking.');
  }

  const deposit =
    depositAmount ??
    (booking.depositAmount > 0
      ? booking.depositAmount
      : calculateDepositAmount(booking.totalPrice));

  if (deposit <= 0) {
    throw new Error('Deposit amount must be set before validating the receipt.');
  }

  return {
    status: currentApiStatusValue(booking.apiStatus),
    payment_status: BookingPaymentStatus.Paid,
    deposit_amount: deposit,
    receipt_url: booking.receiptUrl.trim(),
  };
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
  const s = toBookingStatus(String(status));
  if (s === BookingStatus.Confirmed) return 'confirmed';
  if (s === BookingStatus.ReadyForAgency) return 'ready_for_agency';
  return s;
}

export function formatTransitionHint(current: string): string {
  const next = getNextStatus(current);
  return next ? getStatusLabelKey(next) : '';
}

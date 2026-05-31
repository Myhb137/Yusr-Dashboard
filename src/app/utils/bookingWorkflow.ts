/**
 * Booking workflow — PUT /bookings/{id}/status + display logic.
 * Enum values from constants/bookingApiEnums.ts only.
 */

import type { NormalizedRole } from './authRole';
import { isSuperAdmin, isAdmin } from './authRole';
import {
  BOOKING_STATUS_ENUM,
  BOOKING_STATUS_NEXT,
  BOOKING_LIFECYCLE_STEPS,
  PAYMENT_STATUS_ENUM,
  SWAGGER_DEPOSIT_DZD,
  LIFECYCLE_FLOW_LABEL,
  PAYMENT_FLOW_LABEL,
  isBookingStatus,
  isPaymentStatus,
  isPaymentAwaitingReview,
  trimApiEnum,
  type BookingStatusValue,
  type PaymentStatusValue,
} from '../constants/bookingApiEnums';

export {
  BOOKING_LIFECYCLE_STEPS as WORKFLOW_STEPS,
  LIFECYCLE_FLOW_LABEL,
  PAYMENT_FLOW_LABEL,
  SWAGGER_DEPOSIT_DZD,
};

export type BookingLifecycleStatus = BookingStatusValue;
export type BookingPaymentStatus = PaymentStatusValue;

export const BOOKING_LIFECYCLE_STATUSES = BOOKING_STATUS_ENUM;
export const PAYMENT_STATUSES = PAYMENT_STATUS_ENUM;
export const LIFECYCLE_NEXT = BOOKING_STATUS_NEXT;

export interface BookingWorkflowState {
  status: string;
  paymentStatus: string | null;
  depositReceiptUrl: string | null;
}

export function mapApiBookingToWorkflowState(raw: Record<string, unknown>): BookingWorkflowState {
  const receipt =
    raw.deposit_receipt_url ??
    raw.depositReceiptUrl ??
    raw.receipt_url ??
    raw.receiptUrl ??
    null;
  const paymentRaw = trimApiEnum(raw.payment_status ?? raw.paymentStatus);
  return {
    status: trimApiEnum(raw.status),
    paymentStatus: paymentRaw || null,
    depositReceiptUrl: receipt ? trimApiEnum(receipt) : null,
  };
}

export interface BookingStatusUpdatePayload {
  status: BookingStatusValue;
  /** Always required — backend validates full row state */
  payment_status: PaymentStatusValue;
  deposit_amount?: number;
}

function resolvePaymentStatus(value: string | null | undefined): PaymentStatusValue {
  const ps = trimApiEnum(value ?? 'pending');
  if (!isPaymentStatus(ps)) {
    throw new Error(`Invalid payment_status "${value}". Allowed: ${PAYMENT_STATUS_ENUM.join(', ')}`);
  }
  return ps;
}

export function buildStatusUpdatePayload(params: {
  currentStatus: string;
  currentPaymentStatus: string | null;
  nextStatus?: string;
  nextPaymentStatus?: string;
  depositAmount?: number;
}): BookingStatusUpdatePayload {
  const current = trimApiEnum(params.currentStatus);
  const status = trimApiEnum(params.nextStatus ?? params.currentStatus);

  if (!isBookingStatus(status)) {
    throw new Error(`Invalid status "${status}". Allowed: ${BOOKING_STATUS_ENUM.join(', ')}`);
  }

  const payment_status = resolvePaymentStatus(
    params.nextPaymentStatus ?? params.currentPaymentStatus
  );

  const body: BookingStatusUpdatePayload = { status, payment_status };

  if (params.depositAmount != null && params.depositAmount >= 0) {
    body.deposit_amount = params.depositAmount;
  }

  if (params.nextStatus && status !== current) {
    validateLifecycleTransition(current, status);
  }

  return body;
}
export function validateLifecycleTransition(from: string, to: string): void {
  const f = trimApiEnum(from);
  const t = trimApiEnum(to);
  if (f === t) return;
  if (t === 'cancelled') return; // Cancel is always allowed from any state
  const expected = BOOKING_STATUS_NEXT[f as BookingStatusValue];
  if (expected !== t) {
    throw new Error(`Invalid transition "${f}" → "${t}". Next step: ${expected ?? 'none'}.`);
  }
}

export type WorkflowAction =
  | {
      type: 'lifecycle';
      nextStatus: BookingStatusValue;
      labelKey: 'confirm' | 'validate' | 'release_to_agency' | 'complete' | 'cancel';
      depositAmount?: number;
    }
  | {
      type: 'payment';
      paymentStatus: 'paid' | 'failed';
      labelKey: 'approve_payment' | 'reject_payment';
    };

export function actionsEqual(a: WorkflowAction, b: WorkflowAction): boolean {
  if (a.type !== b.type) return false;
  return a.type === 'lifecycle'
    ? a.nextStatus === (b as Extract<WorkflowAction, { type: 'lifecycle' }>).nextStatus
    : a.paymentStatus === (b as Extract<WorkflowAction, { type: 'payment' }>).paymentStatus;
}

export function getWorkflowActions(
  role: NormalizedRole,
  booking: BookingWorkflowState
): WorkflowAction[] {
  if (!isAdmin(role)) return [];

  const status = trimApiEnum(booking.status);
  const payment = trimApiEnum(booking.paymentStatus);
  const hasReceipt = Boolean(booking.depositReceiptUrl);
  const actions: WorkflowAction[] = [];

  // If already cancelled or completed, no actions can be performed
  if (status === 'cancelled' || status === 'completed') {
    return [];
  }

  // Cancel action is always available for any admin/superadmin as long as status is not cancelled/completed
  actions.push({ type: 'lifecycle', nextStatus: 'cancelled', labelKey: 'cancel' });

  if (role === 'admin') {
    if (status === 'pending') {
      actions.push({ type: 'lifecycle', nextStatus: 'confirmed', labelKey: 'confirm' });
    } else if (status === 'confirmed') {
      actions.push({
        type: 'lifecycle',
        nextStatus: 'validated',
        labelKey: 'validate',
        depositAmount: SWAGGER_DEPOSIT_DZD,
      });
    }
    return actions;
  }

  if (!isSuperAdmin(role)) return actions;

  if (status === 'confirmed') {
    actions.push({
      type: 'lifecycle',
      nextStatus: 'validated',
      labelKey: 'validate',
      depositAmount: SWAGGER_DEPOSIT_DZD,
    });
  }

  if (status === 'validated' && isPaymentAwaitingReview(payment, hasReceipt)) {
    actions.push({ type: 'payment', paymentStatus: 'paid', labelKey: 'approve_payment' });
    actions.push({ type: 'payment', paymentStatus: 'failed', labelKey: 'reject_payment' });
  }

  if (status === 'validated' && payment === 'paid') {
    actions.push({ type: 'lifecycle', nextStatus: 'ready_for_agency', labelKey: 'release_to_agency' });
  }

  if (status === 'ready_for_agency') {
    actions.push({ type: 'lifecycle', nextStatus: 'completed', labelKey: 'complete' });
  }

  return actions;
}
export function validatePaymentAction(
  booking: BookingWorkflowState,
  paymentStatus: 'paid' | 'failed'
): void {
  const status = trimApiEnum(booking.status);
  if (status !== 'validated') {
    throw new Error(`Payment review requires status=validated (current: ${status || 'unknown'}).`);
  }
  if (!isPaymentAwaitingReview(trimApiEnum(booking.paymentStatus), Boolean(booking.depositReceiptUrl))) {
    throw new Error('Receipt must be uploaded and payment awaiting review before approve/reject.');
  }
  if (!isPaymentStatus(paymentStatus)) {
    throw new Error(`Invalid payment_status "${paymentStatus}".`);
  }
}

export function getWorkflowStepIndex(status: string): number {
  const s = trimApiEnum(status);
  const idx = BOOKING_LIFECYCLE_STEPS.indexOf(s as BookingStatusValue);
  return idx >= 0 ? idx : 0;
}

export function describeWaitingState(booking: BookingWorkflowState): string | null {
  const status = trimApiEnum(booking.status);
  const payment = trimApiEnum(booking.paymentStatus);
  const hasReceipt = Boolean(booking.depositReceiptUrl);

  if (status === 'validated' && !hasReceipt && (payment === 'pending' || payment === 'failed' || !payment)) {
    return 'Waiting for client to upload deposit receipt.';
  }
  if (status === 'validated' && isPaymentAwaitingReview(payment, hasReceipt)) {
    return 'Receipt uploaded — awaiting admin payment verification.';
  }
  if (status === 'validated' && payment === 'paid') {
    return 'Payment confirmed — ready to release to agency.';
  }
  return null;
}

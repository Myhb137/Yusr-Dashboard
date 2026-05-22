import { bookingService } from './bookingService';
import { authService } from './authService';
import { getCurrentRole, type NormalizedRole } from '../utils/authRole';
import {
  buildStatusUpdatePayload,
  buildReceiptValidationPayload,
  buildDepositSavePayload,
  toBookingStatus,
  getAlternateApiStatus,
  STATUS_NOT_ALLOWED_ERROR,
  PAYMENT_LOCKED_ERROR,
  type BookingStatusUpdatePayload,
  type DbBookingStatus,
} from '../utils/bookingStatus';
import { logBookingStatusChange } from '../utils/bookingAuditLog';

export interface BookingForStatusUpdate {
  id: string;
  status: string;
  apiStatus: string;
  paymentStatus: string;
  depositAmount: number;
  totalPrice: number;
  receiptUrl?: string | null;
  receiptValidated: boolean;
}

export interface StatusUpdateResult {
  booking: Record<string, unknown>;
  payload: BookingStatusUpdatePayload;
}

function getActorId(): string | undefined {
  const user = authService.getStoredUser();
  return user?.id || user?._id || user?.user?.id;
}

function isStatusCheckError(err: unknown): boolean {
  const ax = err as { response?: { data?: { error?: string; message?: string } } };
  const msg = String(ax.response?.data?.error || ax.response?.data?.message || '');
  return msg.includes('bookings_status_check');
}

async function callStatusApi(
  bookingId: string,
  payload: BookingStatusUpdatePayload
): Promise<unknown> {
  if (!payload.status) {
    throw new Error('PUT /api/v1/bookings/{id}/status requires a status field.');
  }

  const attempts: BookingStatusUpdatePayload[] = [payload];

  const alt = getAlternateApiStatus(payload.status as DbBookingStatus);
  if (alt) {
    attempts.push({ ...payload, status: alt });
  }

  let lastError: unknown;

  for (const attempt of attempts) {
    try {
      return await bookingService.updateBookingStatus(bookingId, attempt);
    } catch (err: unknown) {
      lastError = err;
      const ax = err as {
        response?: { status?: number; data?: { message?: string; error?: string } };
      };

      if (ax.response?.status === 403) {
        throw new Error(
          ax.response.data?.message ||
            ax.response.data?.error ||
            PAYMENT_LOCKED_ERROR
        );
      }
      if (ax.response?.status === 404) {
        throw new Error(
          'Status endpoint not found. Expected PUT /api/v1/bookings/{id}/status on the API server.'
        );
      }

      if (!isStatusCheckError(err) || attempt === attempts[attempts.length - 1]) {
        break;
      }
    }
  }

  throw lastError;
}

export const bookingStatusService = {
  getRole(): NormalizedRole {
    return getCurrentRole();
  },

  async updateStatus(
    booking: BookingForStatusUpdate,
    nextStatus: string,
    options?: {
      role?: NormalizedRole;
      depositAmount?: number;
      validateReceipt?: boolean;
    }
  ): Promise<StatusUpdateResult> {
    const role = options?.role ?? getCurrentRole();
    const fromStatus = toBookingStatus(booking.status);

    let payload: BookingStatusUpdatePayload;

    try {
      payload = buildStatusUpdatePayload(
        {
          status: booking.status,
          apiStatus: booking.apiStatus,
          paymentStatus: booking.paymentStatus,
          depositAmount: booking.depositAmount,
          totalPrice: booking.totalPrice,
          receiptUrl: booking.receiptUrl,
          receiptValidated: booking.receiptValidated,
        },
        nextStatus,
        role,
        options
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : STATUS_NOT_ALLOWED_ERROR;
      throw new Error(msg);
    }

    const response = await callStatusApi(booking.id, payload);
    const updated = extractBooking(response);

    logBookingStatusChange({
      bookingId: booking.id,
      fromStatus,
      toStatus: String(payload.status ?? fromStatus),
      actorRole: role,
      actorId: getActorId(),
      paymentStatus: payload.payment_status,
      depositAmount: payload.deposit_amount,
      receiptValidated: payload.payment_status === 'paid',
    });

    return { booking: updated, payload };
  },

  async validateReceipt(
    booking: BookingForStatusUpdate,
    depositAmount?: number,
    role?: NormalizedRole
  ): Promise<StatusUpdateResult> {
    const r = role ?? getCurrentRole();

    if (toBookingStatus(booking.status) !== toBookingStatus('confirmed')) {
      throw new Error('Receipt can only be validated while booking is confirmed.');
    }

    const payload = buildReceiptValidationPayload(booking, r, depositAmount);
    const response = await callStatusApi(booking.id, payload);
    const updated = extractBooking(response);

    logBookingStatusChange({
      bookingId: booking.id,
      fromStatus: booking.status,
      toStatus: String(payload.status),
      actorRole: r,
      actorId: getActorId(),
      paymentStatus: payload.payment_status,
      depositAmount: payload.deposit_amount,
      receiptValidated: true,
    });

    return { booking: updated, payload };
  },

  async saveDeposit(
    booking: BookingForStatusUpdate,
    depositAmount: number,
    role?: NormalizedRole
  ): Promise<{ result: StatusUpdateResult; persistedOnServer: boolean }> {
    const r = role ?? getCurrentRole();

    if (toBookingStatus(booking.status) !== toBookingStatus('confirmed')) {
      throw new Error('Deposit can only be set while booking is confirmed.');
    }

    const payload = buildDepositSavePayload(booking, r, depositAmount);

    try {
      const response = await callStatusApi(booking.id, payload);
      const updated = extractBooking(response);

      logBookingStatusChange({
        bookingId: booking.id,
        fromStatus: booking.status,
        toStatus: String(payload.status),
        actorRole: r,
        actorId: getActorId(),
        depositAmount: payload.deposit_amount,
      });

      return {
        result: { booking: updated, payload },
        persistedOnServer: true,
      };
    } catch (err) {
      if (!isStatusCheckError(err)) {
        throw err;
      }
      return {
        result: {
          booking: {},
          payload: { deposit_amount: depositAmount },
        },
        persistedOnServer: false,
      };
    }
  },
};

function extractBooking(response: unknown): Record<string, unknown> {
  const r = response as Record<string, unknown>;
  return (
    (r?.booking as Record<string, unknown>) ||
    ((r?.data as Record<string, unknown>)?.booking as Record<string, unknown>) ||
    (r?.data as Record<string, unknown>) ||
    r ||
    {}
  );
}

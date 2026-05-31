import { bookingService } from './bookingService';
import { authService } from './authService';
import { getCurrentRole, type NormalizedRole } from '../utils/authRole';
import {
  actionsEqual,
  buildStatusUpdatePayload,
  getWorkflowActions,
  mapApiBookingToWorkflowState,
  validateLifecycleTransition,
  validatePaymentAction,
  type BookingWorkflowState,
  type WorkflowAction,
} from '../utils/bookingWorkflow';
import { trimApiEnum } from '../constants/bookingApiEnums';
import { logBookingStatusChange } from '../utils/bookingAuditLog';
import { resolveAdminTenant } from '../utils/tenantScope';

export interface BookingForWorkflowUpdate extends BookingWorkflowState {
  id: string;
}

export interface WorkflowUpdateResult {
  booking: Record<string, unknown>;
  payload: ReturnType<typeof buildStatusUpdatePayload>;
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

function mapApiError(err: unknown, context: BookingWorkflowState, payload: unknown): never {
  const ax = err as {
    response?: { status?: number; data?: { message?: string; error?: string } };
  };

  if (ax.response?.status === 403) {
    throw new Error(ax.response.data?.message || ax.response.data?.error || 'Forbidden');
  }
  if (ax.response?.status === 404) {
    throw new Error('PUT /api/v1/bookings/{id}/status not found.');
  }
  if (isStatusCheckError(err)) {
    throw new Error(
      `Server rejected this transition (bookings_status_check). ` +
        `Current API state: status="${context.status}", payment_status="${context.paymentStatus ?? 'none'}". ` +
        `Sent: ${JSON.stringify(payload)}. ` +
        `Allowed chain: pending → confirmed → validated → ready_for_agency → completed.`
    );
  }
  throw err;
}

async function loadFreshBookingState(bookingId: string): Promise<BookingForWorkflowUpdate> {
  const tenant = await resolveAdminTenant();
  const list = (await bookingService.getDashboardBookings(tenant, {
    limit: 100,
    offset: 0,
  })) as Record<string, unknown>[];

  const raw = list.find((b) => String(b.id ?? b._id) === bookingId);
  if (!raw) {
    throw new Error('Booking not found in latest GET /bookings response.');
  }

  return {
    id: bookingId,
    ...mapApiBookingToWorkflowState(raw),
  };
}

export const bookingStatusService = {
  getRole(): NormalizedRole {
    return getCurrentRole();
  },

  getAvailableActions(role: NormalizedRole, booking: BookingWorkflowState) {
    return getWorkflowActions(role, booking);
  },

  /** Re-fetch from GET /bookings, then PUT /status with Swagger body. */
  async applyWorkflowAction(
    bookingId: string,
    action: WorkflowAction,
    options?: { role?: NormalizedRole }
  ): Promise<WorkflowUpdateResult> {
    const role = options?.role ?? getCurrentRole();
    const booking = await loadFreshBookingState(bookingId);

    const allowed = getWorkflowActions(role, booking);
    if (!allowed.some((a) => actionsEqual(a, action))) {
      throw new Error(
        `Action not allowed for current API state (status=${booking.status}, payment_status=${booking.paymentStatus ?? 'none'}). Refresh the page.`
      );
    }

    const currentStatus = trimApiEnum(booking.status);
    let payload;

    if (action.type === 'lifecycle') {
      validateLifecycleTransition(currentStatus, action.nextStatus);
      payload = buildStatusUpdatePayload({
        currentStatus,
        currentPaymentStatus: booking.paymentStatus,
        nextStatus: action.nextStatus,
        depositAmount: action.depositAmount,
      });
    } else {
      validatePaymentAction(booking, action.paymentStatus);
      payload = buildStatusUpdatePayload({
        currentStatus,
        currentPaymentStatus: booking.paymentStatus,
        nextStatus: currentStatus,
        nextPaymentStatus: action.paymentStatus,
      });
    }

    let response: unknown;
    try {
      response = await bookingService.updateBooking(bookingId, payload);
    } catch (err) {
      mapApiError(err, booking, payload);
    }

    const updated = extractBooking(response);

    logBookingStatusChange({
      bookingId,
      fromStatus: currentStatus,
      toStatus: payload.status,
      actorRole: role,
      actorId: getActorId(),
    });

    return { booking: updated, payload };
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

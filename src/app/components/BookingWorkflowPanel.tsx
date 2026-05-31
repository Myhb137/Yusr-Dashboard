import { motion } from 'motion/react';
import { CheckCircle, RadioButtonUnchecked } from '@mui/icons-material';
import type { DashboardBooking } from '../context/bookingContextTypes';
import type { NormalizedRole } from '../utils/authRole';
import {
  WORKFLOW_STEPS,
  getWorkflowActions,
  getWorkflowStepIndex,
  describeWaitingState,
  type WorkflowAction,
} from '../utils/bookingWorkflow';
import {
  LIFECYCLE_FLOW_LABEL,
  PAYMENT_FLOW_LABEL,
} from '../constants/bookingApiEnums';

const STEP_LABELS: Record<string, string> = {
  pending: 'pending',
  confirmed: 'confirmed',
  validated: 'validated',
  ready_for_agency: 'ready_for_agency',
  completed: 'completed',
};

function workflowActionLabel(action: WorkflowAction, tBookings: Record<string, string>): string {
  switch (action.labelKey) {
    case 'confirm':
      return tBookings.markConfirmed || 'Confirm';
    case 'validate':
      return tBookings.validateAttendance || tBookings.validated || 'Validate';
    case 'release_to_agency':
      return tBookings.ready_for_agency || 'Release to Agency';
    case 'complete':
      return tBookings.completed || 'Complete';
    case 'approve_payment':
      return tBookings.approvePayment || 'Approve (paid)';
    case 'reject_payment':
      return tBookings.rejectPayment || 'Reject (failed)';
    default:
      return action.type === 'lifecycle' ? action.nextStatus : action.paymentStatus;
  }
}

interface BookingWorkflowPanelProps {
  booking: DashboardBooking;
  userRole: NormalizedRole;
  tBookings: Record<string, string>;
  isUpdating: boolean;
  statusError: string | null;
  statusSuccess: string | null;
  onAction: (action: WorkflowAction) => void;
  getStatusColor: (status: string) => string;
  getPaymentStatusColor: (status: string | null) => string;
  statusLabel: (status: string, t: Record<string, string>) => string;
  paymentStatusLabel: (status: string | null, t: Record<string, string>) => string;
}

export function BookingWorkflowPanel({
  booking,
  userRole,
  tBookings,
  isUpdating,
  statusError,
  statusSuccess,
  onAction,
  getStatusColor,
  getPaymentStatusColor,
  statusLabel,
  paymentStatusLabel,
}: BookingWorkflowPanelProps) {
  const workflowState = {
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    depositReceiptUrl: booking.depositReceiptUrl ?? booking.receiptUrl ?? null,
  };

  const actions = getWorkflowActions(userRole, workflowState);
  const lifecycleActions = actions.filter((a) => a.type === 'lifecycle');
  const paymentActions = actions.filter((a) => a.type === 'payment');
  const currentStep = getWorkflowStepIndex(booking.status);
  const waitingHint = describeWaitingState(workflowState);

  return (
    <div className="space-y-4">
      {/* Lifecycle stepper (Swagger order) */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 overflow-x-auto">
        <p className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider mb-3">
          Lifecycle — {LIFECYCLE_FLOW_LABEL}
        </p>
        <div className="flex items-center gap-1 min-w-max">
          {WORKFLOW_STEPS.map((step, index) => {
            const done = index < currentStep;
            const active = index === currentStep;
            return (
              <div key={step} className="flex items-center gap-1">
                <div
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[0.65rem] font-semibold whitespace-nowrap ${
                    active
                      ? 'bg-blue-600 text-white'
                      : done
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-white text-slate-400 border border-slate-200'
                  }`}
                >
                  {done ? (
                    <CheckCircle sx={{ fontSize: 14 }} />
                  ) : (
                    <RadioButtonUnchecked sx={{ fontSize: 14 }} />
                  )}
                  {STEP_LABELS[step] || step}
                </div>
                {index < WORKFLOW_STEPS.length - 1 && (
                  <span className="text-slate-300 text-xs">→</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Current API values */}
      <div className="flex flex-wrap gap-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">status:</span>
          <span
            className={`inline-flex px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(booking.status)}`}
          >
            {statusLabel(booking.status, tBookings)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">payment_status:</span>
          <span
            className={`inline-flex px-2 py-1 rounded-full text-xs font-bold border ${getPaymentStatusColor(booking.paymentStatus)}`}
          >
            {paymentStatusLabel(booking.paymentStatus, tBookings)}
          </span>
        </div>
      </div>

      {waitingHint && (
        <p className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
          {waitingHint}
        </p>
      )}

      <p className="text-[0.65rem] text-slate-500">{PAYMENT_FLOW_LABEL}</p>

      {/* Lifecycle actions → PUT /status { status } */}
      {lifecycleActions.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            {tBookings.updateStatus}
          </p>
          <div className="flex flex-wrap gap-2">
            {lifecycleActions.map((action) => (
              <motion.button
                key={`lifecycle-${action.nextStatus}`}
                type="button"
                whileTap={{ scale: 0.98 }}
                disabled={isUpdating}
                onClick={() => onAction(action)}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition-colors disabled:opacity-50 ${getStatusColor(action.nextStatus)}`}
              >
                {workflowActionLabel(action, tBookings)}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Payment actions → PUT /status { status, payment_status } */}
      {paymentActions.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            {tBookings.paymentStatus} — PUT /status
          </p>
          <div className="flex flex-wrap gap-2">
            {paymentActions.map((action) => (
              <motion.button
                key={`payment-${action.paymentStatus}`}
                type="button"
                whileTap={{ scale: 0.98 }}
                disabled={isUpdating}
                onClick={() => onAction(action)}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition-colors disabled:opacity-50 ${
                  action.paymentStatus === 'paid'
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                    : 'bg-red-100 text-red-700 border-red-200'
                }`}
              >
                {workflowActionLabel(action, tBookings)}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {lifecycleActions.length === 0 && paymentActions.length === 0 && (
        <p className="text-sm text-gray-500">{tBookings.noStatusActions}</p>
      )}

      {isUpdating && (
        <p className="text-xs text-blue-500 animate-pulse">{tBookings.validating || 'Updating…'}</p>
      )}
      {statusSuccess && (
        <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          {statusSuccess}
        </p>
      )}
      {statusError && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 whitespace-pre-wrap">
          {statusError}
        </p>
      )}
    </div>
  );
}

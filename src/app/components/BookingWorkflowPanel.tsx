import { motion } from 'motion/react';
import { 
  CheckCircle, 
  RadioButtonUnchecked, 
  InfoOutlined, 
  Check, 
  Close, 
  WarningAmberRounded, 
  ArrowForward,
  PaymentsOutlined,
  PlaylistAddCheckOutlined
} from '@mui/icons-material';
import type { DashboardBooking } from '../context/bookingContextTypes';
import type { NormalizedRole } from '../utils/authRole';
import {
  WORKFLOW_STEPS,
  getWorkflowActions,
  getWorkflowStepIndex,
  describeWaitingState,
  type WorkflowAction,
} from '../utils/bookingWorkflow';

const STEP_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  validated: 'Validated',
  ready_for_agency: 'Ready for Agency',
  completed: 'Completed',
};

const STEP_DESCRIPTIONS: Record<string, string> = {
  pending: 'Waiting for agency availability confirmation.',
  confirmed: 'Confirmed by agency. Ready for verification.',
  validated: 'Details validated. Awaiting deposit verification.',
  ready_for_agency: 'Cleared for travel. Ready for agency execution.',
  completed: 'Booking completed successfully.',
};

function workflowActionLabel(action: WorkflowAction, tBookings: Record<string, string>): string {
  switch (action.labelKey) {
    case 'confirm':
      return tBookings.markConfirmed || 'Confirm Booking';
    case 'validate':
      return tBookings.validateAttendance || 'Validate Details';
    case 'release_to_agency':
      return tBookings.ready_for_agency || 'Release to Agency';
    case 'complete':
      return tBookings.completed || 'Complete Booking';
    case 'cancel':
      return tBookings.cancelBooking || 'Cancel Booking';
    case 'approve_payment':
      return tBookings.approvePayment || 'Approve Payment';
    case 'reject_payment':
      return tBookings.rejectPayment || 'Reject Payment';
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
    <div className="space-y-6">
      {/* Visual Stepper Section */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <PlaylistAddCheckOutlined style={{ fontSize: 16 }} className="text-blue-500" />
          {tBookings.workflowLifecycle || 'Booking Workflow Lifecycle'}
        </h3>
        
        {/* Horizontal Timeline */}
        <div className="relative pt-2">
          {/* Background progress track line */}
          <div className="absolute top-[21px] left-4 right-4 h-0.5 bg-gray-100 -z-0" />
          
          {/* Active progress track line */}
          <div 
            className="absolute top-[21px] left-4 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 -z-0 transition-all duration-500"
            style={{ width: `${(currentStep / (WORKFLOW_STEPS.length - 1)) * 92}%` }}
          />

          <div className="flex justify-between relative z-10">
            {WORKFLOW_STEPS.map((step, index) => {
              const done = index < currentStep;
              const active = index === currentStep;
              
              return (
                <div key={step} className="flex flex-col items-center flex-1">
                  {/* Step Bubble */}
                  <motion.div 
                    initial={{ scale: 0.9 }}
                    animate={{ scale: active ? 1.05 : 1 }}
                    className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                      active 
                        ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-blue-500 shadow-md shadow-blue-200' 
                        : done
                          ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-100'
                          : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {done ? (
                      <Check style={{ fontSize: 18 }} />
                    ) : (
                      <span className="text-xs font-bold">{index + 1}</span>
                    )}
                  </motion.div>

                  {/* Step Label */}
                  <span className={`text-[10px] sm:text-[11px] font-bold mt-2 text-center transition-colors ${
                    active ? 'text-indigo-600' : done ? 'text-emerald-600' : 'text-gray-400'
                  }`}>
                    {STEP_LABELS[step] || step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current Step Description Card */}
        <div className="bg-gradient-to-r from-gray-50 to-blue-50/30 rounded-xl p-3.5 border border-gray-100/70 text-xs">
          <p className="font-semibold text-gray-800 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Current Stage: <span className="text-blue-600 font-bold">{STEP_LABELS[WORKFLOW_STEPS[currentStep]] || WORKFLOW_STEPS[currentStep]}</span>
          </p>
          <p className="text-gray-500 mt-1 leading-relaxed">
            {STEP_DESCRIPTIONS[WORKFLOW_STEPS[currentStep]]}
          </p>
        </div>
      </div>

      {/* Grid of status cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Booking Status</span>
          <div className="mt-2.5">
            <span className={`inline-flex px-3 py-1 rounded-xl text-xs font-bold border transition-colors ${getStatusColor(booking.status)}`}>
              {statusLabel(booking.status, tBookings)}
            </span>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Payment Status</span>
          <div className="mt-2.5">
            <span className={`inline-flex px-3 py-1 rounded-xl text-xs font-bold border transition-colors ${getPaymentStatusColor(booking.paymentStatus)}`}>
              {paymentStatusLabel(booking.paymentStatus, tBookings)}
            </span>
          </div>
        </div>
      </div>

      {/* User Information Waiting States */}
      {waitingHint && userRole === 'superadmin' && (
        <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl px-4 py-3.5 flex gap-3 items-start">
          <InfoOutlined className="text-indigo-500 shrink-0 mt-0.5" style={{ fontSize: 18 }} />
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-indigo-950">Next Action Required</p>
            <p className="text-xs text-indigo-700/90 leading-relaxed">
              {waitingHint}
            </p>
          </div>
        </div>
      )}

      {/* Interactive Action Area */}
      {(lifecycleActions.length > 0 || paymentActions.length > 0) ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="space-y-4">
            {/* Lifecycle Transitions */}
            {lifecycleActions.length > 0 && (
              <div className="flex flex-wrap gap-3">
                 {lifecycleActions.map((action) => {
                  let btnColor = 'from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-100';
                  if (action.nextStatus === 'completed') {
                    btnColor = 'from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-100';
                  } else if (action.nextStatus === 'ready_for_agency') {
                    btnColor = 'from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-indigo-100';
                  } else if (action.nextStatus === 'cancelled') {
                    btnColor = 'from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 shadow-rose-100';
                  }
                  
                  return (
                    <motion.button
                      key={`lifecycle-${action.nextStatus}`}
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={isUpdating}
                      onClick={() => onAction(action)}
                      className={`px-5 py-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r ${btnColor} shadow-lg transition-all disabled:opacity-50 flex items-center gap-2`}
                    >
                      {action.nextStatus === 'cancelled' ? <Close style={{ fontSize: 16 }} /> : <Check style={{ fontSize: 16 }} />}
                      {workflowActionLabel(action, tBookings)}
                    </motion.button>
                  );
                })}
              </div>
            )}

            {/* Payment Approvals */}
            {paymentActions.length > 0 && (
              <div className="space-y-2.5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <PaymentsOutlined style={{ fontSize: 13 }} />
                  Verification Action
                </p>
                <div className="flex flex-wrap gap-3">
                  {paymentActions.map((action) => {
                    const isApprove = action.paymentStatus === 'paid';
                    const btnClass = isApprove
                      ? 'from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-100'
                      : 'from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 shadow-rose-100';

                    return (
                      <motion.button
                        key={`payment-${action.paymentStatus}`}
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={isUpdating}
                        onClick={() => onAction(action)}
                        className={`px-5 py-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r ${btnClass} shadow-lg transition-all disabled:opacity-50 flex items-center gap-1.5`}
                      >
                        {isApprove ? <Check style={{ fontSize: 16 }} /> : <Close style={{ fontSize: 16 }} />}
                        {workflowActionLabel(action, tBookings)}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Finalized State (No Actions) */
        !waitingHint && (
          <div className="bg-emerald-50/40 border border-emerald-100/55 rounded-2xl px-4 py-4 flex gap-3 items-center">
            <CheckCircle className="text-emerald-500 shrink-0" style={{ fontSize: 20 }} />
            <div>
              <p className="text-xs font-bold text-emerald-950">Workflow Completed</p>
              <p className="text-[11px] text-emerald-700 mt-0.5 font-medium">
                No further status changes or actions are required for this booking.
              </p>
            </div>
          </div>
        )
      )}

      {/* Notifications and Alerts */}
      {isUpdating && (
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 px-1">
          <div className="w-3.5 h-3.5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <span>{tBookings.validating || 'Applying workflow transition...'}</span>
        </div>
      )}
      
      {statusSuccess && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex gap-2.5 items-start text-emerald-800"
        >
          <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" style={{ fontSize: 16 }} />
          <span className="text-xs font-medium leading-relaxed">{statusSuccess}</span>
        </motion.div>
      )}

      {statusError && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex gap-2.5 items-start text-red-800"
        >
          <WarningAmberRounded className="text-red-500 shrink-0 mt-0.5" style={{ fontSize: 16 }} />
          <span className="text-xs font-medium leading-relaxed whitespace-pre-wrap">{statusError}</span>
        </motion.div>
      )}
    </div>
  );
}

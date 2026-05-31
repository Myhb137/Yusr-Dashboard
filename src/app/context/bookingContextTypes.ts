import type { NormalizedRole } from '../utils/authRole';
import type { BookingStatus, PaymentStatus } from '../types/api';
import type { GetBookingsParams } from '../utils/bookingQuery';
import type { WorkflowAction } from '../utils/bookingWorkflow';

export interface DashboardBooking {
  id: string;
  bookingRef: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerGender?: string;
  offerName: string;
  destination: string;
  startDate: string;
  endDate: string;
  travelers: number;
  amount: string;
  totalPrice: number;
  status: BookingStatus | string;
  apiStatus: string;
  paymentStatus: PaymentStatus | string | null;
  depositAmount: number;
  /** deposit_receipt_url from GET /bookings */
  depositReceiptUrl: string | null;
  receiptUrl?: string | null;
  fullUser?: unknown;
  offer?: unknown;
}

export interface BookingContextValue {
  bookings: DashboardBooking[];
  isLoading: boolean;
  error: string | null;
  userRole: NormalizedRole;
  refreshBookings: (params?: GetBookingsParams) => Promise<void>;
  applyWorkflowAction: (id: string, action: WorkflowAction) => Promise<void>;
  uploadDepositReceipt: (id: string, file: File) => Promise<void>;
}

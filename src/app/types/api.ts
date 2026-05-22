export interface ApiSuccess<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface ApiError {
  success?: boolean;
  message: string;
  data?: unknown;
}

export interface User {
  id: string;
  full_name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone: string;
  role: 'user' | 'admin' | 'superAdmin';
  status: 'active' | 'deactivated';
  agency_name?: string;
  agency_logo_url?: string;
}

export type UserRole = 'user' | 'admin' | 'superAdmin';

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: User;
  requiresTwoFactor?: boolean;
  requiresOtp?: boolean;
  otpProvider?: 'firebase' | 'sms' | 'email' | 'dev';
  otpChannel?: 'sms' | 'email' | 'dev';
  twoFactorToken?: string;
  otpSessionToken?: string;
  phone?: string;
}

export interface LoginRequest {
  email?: string;
  phone?: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  gender?: string;
  role?: 'user';
}

export interface VerifyAdmin2FARequest {
  twoFactorToken: string;
  firebaseIdToken: string;
}

export interface VerifyAdminOtpRequest {
  twoFactorToken: string;
  otp?: string;
  code?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  code: string;
  password: string;
}

export interface Offer {
  id: string;
  title: string;
  location: string;
  type: 'standard' | 'custom' | 'special' | 'activity';
  description?: string;
  duration?: string;
  places?: number;
  available: boolean;
  image_url?: string;
  total_price: number;
  currency: string;
  amenities?: string[];
  itinerary?: string[];
  rating?: number;
  total_reviews?: number;
}

export interface Booking {
  id: string;
  user_id: string;
  offer_id: string;
  total_price: number;
  payment_method: string;
  status: 'pending' | 'confirmed' | 'validated' | 'ready_for_agency' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'under_review' | 'paid' | 'failed' | 'refunded';
  deposit_amount?: number;
  receipt_url?: string;
  created_at?: string;
}

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'validated'
  | 'ready_for_agency'
  | 'completed'
  | 'cancelled';

export type PaymentStatus = 'pending' | 'under_review' | 'paid' | 'failed' | 'refunded';

/** Workflow statuses for PATCH /bookings/{id}/status */
export type WorkflowBookingStatus = 'pending' | 'confirmed' | 'ready_for_agency' | 'completed';

export type WorkflowPaymentStatus = 'pending' | 'paid' | 'failed';

export interface BookingCreateRequest {
  offer_id: string;
  total_price: number;
  payment_method: string;
  receipt_url?: string;
}

export interface BookingStatusUpdateRequest {
  status: WorkflowBookingStatus | BookingStatus;
  payment_status?: WorkflowPaymentStatus | PaymentStatus;
  deposit_amount?: number;
  receipt_url?: string;
}

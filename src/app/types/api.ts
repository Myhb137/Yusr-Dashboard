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
  /** Dev only — OTP may be returned when SMTP is not configured */
  otp?: string;
  code?: string;
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

/** POST /api/v1/auth/login/verify-admin-otp */
export interface VerifyAdminOtpRequest {
  twoFactorToken: string;
  /** 6-digit code (alias: `code`) */
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
  status: BookingStatus;
  payment_status: PaymentStatus;
  deposit_amount?: number;
  receipt_url?: string;
  created_at?: string;
}

import type {
  BookingStatusValue,
  PaymentStatusValue,
} from '../constants/bookingApiEnums';

export type BookingStatus = BookingStatusValue;
export type PaymentStatus = PaymentStatusValue;

/** PUT /api/v1/bookings/{id}/status — full row state (status + payment_status required) */
export interface BookingStatusUpdateRequest {
  status: BookingStatus;
  payment_status: PaymentStatus;
  deposit_amount?: number;
}

export interface BookingCreateRequest {
  offer_id: string;
  total_price: number;
  payment_method: string;
  receipt_url?: string;
}

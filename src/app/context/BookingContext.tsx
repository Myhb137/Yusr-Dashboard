import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { bookingService } from '../services/bookingService';
import { offerService } from '../services/offerService';
import { authService } from '../services/authService';
import { adminService } from '../services/adminService';

interface Booking {
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
  status: 'pending' | 'confirmed' | 'validated' | 'ready_for_agency' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'under_review' | 'paid' | 'failed' | 'refunded';
  depositAmount: number;
  fullUser?: any;
  offer?: any;
}

interface BookingContextType {
  bookings: Booking[];
  isLoading: boolean;
  error: string | null;
  refreshBookings: () => Promise<void>;
  /** Updates booking status. Optionally pass paymentStatus + depositAmount; falls back to current booking values. */
  updateBookingStatus: (id: string, status: string, paymentStatus?: string, depositAmount?: number) => Promise<void>;
  /** Updates payment status only; preserves current booking status and depositAmount. */
  updatePaymentStatus: (id: string, paymentStatus: string) => Promise<void>;
  /**
   * Validates that the user has paid the booking fee and will attend.
   * Sets status=confirmed, payment_status=paid, deposit_amount=depositAmount.
   */
  validateAttendance: (id: string, depositAmount: number) => Promise<void>;
  /**
   * Resets a booking back to pending (fee unpaid).
   * Sets status=pending, payment_status=pending, deposit_amount=0.
   */
  resetToPending: (id: string) => Promise<void>;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const fetchBookings = useCallback(async (force = false) => {
    if (isLoading) return;
    if (hasLoadedOnce && !force) return;

    try {
      setIsLoading(true);
      setError(null);

      const user = authService.getStoredUser();
      const currentUserId = user?._id || user?.id || user?.user?.id || user?.data?.id;
      const currentRole = String(
        user?.role ||
        user?.user?.role ||
        user?.data?.role ||
        user?.user_metadata?.role ||
        user?.app_metadata?.role ||
        ''
      ).toLowerCase().replace(/[_ ]/g, '');

      const extractId = (obj: any, ...keys: string[]): string | null => {
        if (!obj) return null;
        for (const key of keys) {
          const val = obj[key];
          if (!val) continue;
          if (typeof val === 'string' && val.length > 0) return val;
          const id = val?._id || val?.id;
          if (id) return String(id);
        }
        return null;
      };

      const extractName = (u: any): string =>
        u?.full_name ||
        u?.name ||
        `${u?.firstName || u?.first_name || ''} ${u?.lastName || u?.last_name || ''}`.trim() ||
        u?.username ||
        u?.email?.split('@')[0] ||
        '';

      const extractStatus = (booking: any): Booking['status'] => {
        const status = String(booking?.status || '').trim();
        // Backend constraint rejects "confirmed"; treat legacy "confirmed" as "validated".
        if (status === 'confirmed') return 'validated';
        const allowed: Booking['status'][] = ['pending', 'validated', 'ready_for_agency', 'completed', 'cancelled'];
        return allowed.includes(status as Booking['status']) ? (status as Booking['status']) : 'pending';
      };

      const extractPaymentStatus = (booking: any): Booking['paymentStatus'] => {
        const payment = String(booking?.paymentStatus || booking?.payment_status || '').trim();
        const allowed: Booking['paymentStatus'][] = ['pending', 'under_review', 'paid', 'failed', 'refunded'];
        return allowed.includes(payment as Booking['paymentStatus']) ? (payment as Booking['paymentStatus']) : 'pending';
      };

      let bookingsArray: any[] = [];
      const normalizeBookings = (data: any) => (
        Array.isArray(data) ? data : (data?.bookings || data?.data?.bookings || data?.data || [])
      );

      // Swagger-driven status workflow:
      // - Read bookings from /api/v1/bookings/user/{userId}
      // - Update statuses through /api/v1/bookings/{id}/status
      if (currentUserId) {
        const data = await bookingService.getUserBookings(String(currentUserId));
        bookingsArray = normalizeBookings(data);
      }

      const offerIdSet = new Set<string>();
      const userIdSet = new Set<string>();
      bookingsArray.forEach((b: any) => {
        const oid = extractId(b, 'offer_id', 'offerId', 'offer');
        const uid = extractId(b, 'user_id', 'userId', 'user');
        if (oid) offerIdSet.add(oid);
        if (uid) userIdSet.add(uid);
      });

      const [offerResults, usersResult] = await Promise.all([
        Promise.allSettled(
          [...offerIdSet].map(id => offerService.getOfferDetails(id).then(r => ({ id, data: r?.offer || r?.data?.offer || r?.data || r })))
        ),
        (bookingsArray.length > 0)
          ? adminService.getAllUsers({ limit: 100, offset: 0 }).catch(() => [])
          : Promise.resolve([]),
      ]);
      const offerMap: Record<string, any> = {};
      offerResults.forEach(r => { if (r.status === 'fulfilled') offerMap[r.value.id] = r.value.data; });
      const userMap: Record<string, any> = {};
      if (Array.isArray(usersResult)) {
        usersResult.forEach((u: any) => {
          const id = String(u?.id || u?._id || '').trim();
          if (id) userMap[id] = u;
        });
      }

      // Fallback: resolve any unresolved booking users by direct Swagger endpoint.
      const unresolvedUserIds = [...userIdSet].filter((id) => !userMap[String(id).trim()]);
      if (unresolvedUserIds.length > 0) {
        const detailResults = await Promise.allSettled(
          unresolvedUserIds.map((id) =>
            adminService.getUserDetails(String(id).trim()).then((r: any) => ({
              id: String(id).trim(),
              data: r?.user || r?.data?.user || r?.data || r,
            }))
          )
        );
        detailResults.forEach((r) => {
          if (r.status === 'fulfilled' && r.value?.id) {
            userMap[r.value.id] = r.value.data;
          }
        });
      }

      const mappedBookings: Booking[] = bookingsArray.map((booking: any) => {
        const oid = extractId(booking, 'offer_id', 'offerId', 'offer');
        const o = oid ? offerMap[oid] : null;
        const uid = extractId(booking, 'user_id', 'userId', 'user');
        const normalizedUid = uid ? String(uid).trim() : null;
        const mappedUser = normalizedUid ? userMap[normalizedUid] : null;
        const resolvedUser = mappedUser ??
          (typeof booking.user === 'object' ? booking.user : null) ??
          (typeof booking.customer === 'object' ? booking.customer : null);
        const resolvedOffer = o ?? (typeof booking.offer === 'object' ? booking.offer : null);

        return {
          id: booking.id || booking._id,
          bookingRef: booking.ref || booking.bookingRef || `BK-${(booking.id || booking._id).toString().slice(-6).toUpperCase()}`,
          customerName: extractName(resolvedUser) || booking.customerName || booking.full_name || booking.user_name || 'Unknown User',
          customerEmail: resolvedUser?.email || booking.customerEmail || booking.email || '-',
          customerPhone: resolvedUser?.phone || resolvedUser?.phoneNumber || booking.customerPhone || booking.phone || '-',
          customerGender: resolvedUser?.gender || booking.customerGender || booking.gender || '-',
          offerName: resolvedOffer?.title || resolvedOffer?.name || booking.offerName || 'Custom Trip',
          destination: resolvedOffer?.location || resolvedOffer?.destination || booking.destination || '-',
          startDate: booking.startDate || booking.start_date || '-',
          endDate: booking.endDate || booking.end_date || '-',
          travelers: booking.travelers || booking.people || 1,
          amount: booking.totalAmount !== undefined ? `${booking.totalAmount} DZD` : booking.total_price !== undefined ? `${booking.total_price} DZD` : booking.amount || '0 DZD',
          status: extractStatus(booking),
          paymentStatus: extractPaymentStatus(booking),
          depositAmount: booking.deposit_amount ?? booking.depositAmount ?? 0,
          fullUser: resolvedUser,
          offer: resolvedOffer,
        };
      });

      setBookings(mappedBookings);
      setHasLoadedOnce(true);
    } catch (err: any) {
      console.error('Failed to fetch bookings:', err);
      setError('Failed to load bookings.');
    } finally {
      setIsLoading(false);
    }
  }, [hasLoadedOnce, isLoading]);

  /** PUT /api/v1/bookings/{id}/status — update status, preserve other fields unless overridden */
  const updateBookingStatus = async (
    id: string,
    status: string,
    paymentStatus?: string,
    depositAmount?: number
  ) => {
    try {
      const current = bookings.find(b => b.id === id);
      const normalizedStatus = status === 'confirmed' ? 'validated' : status;
      const resolvedPayment = paymentStatus ?? current?.paymentStatus ?? 'pending';
      const resolvedDeposit = depositAmount ?? current?.depositAmount ?? 0;
      await bookingService.updateBookingStatus(id, normalizedStatus, resolvedPayment, resolvedDeposit);
      setBookings(prev =>
        prev.map(b => b.id === id ? { ...b, status: normalizedStatus as Booking['status'] } : b)
      );
    } catch (err) {
      console.error('Failed to update status:', err);
      throw err;
    }
  };

  /** PUT /api/v1/bookings/{id}/status — update payment status only, preserves status + depositAmount */
  const updatePaymentStatus = async (id: string, paymentStatus: string) => {
    try {
      const current = bookings.find(b => b.id === id);
      await bookingService.updateBookingStatus(
        id,
        current?.status ?? 'pending',
        paymentStatus,
        current?.depositAmount ?? 0
      );
      setBookings(prev =>
        prev.map(b => b.id === id ? { ...b, paymentStatus: paymentStatus as Booking['paymentStatus'] } : b)
      );
    } catch (err) {
      console.error('Failed to update payment status:', err);
      throw err;
    }
  };

  /**
   * Admin confirms the user has paid the booking fee.
   * Sets status=confirmed, payment_status=paid, deposit_amount=depositAmount.
   */
  const validateAttendance = async (id: string, depositAmount: number) => {
    try {
      await bookingService.updateBookingStatus(id, 'validated', 'paid', depositAmount);
      setBookings(prev =>
        prev.map(b =>
          b.id === id
            ? { ...b, status: 'validated', paymentStatus: 'paid', depositAmount }
            : b
        )
      );
    } catch (err) {
      console.error('Failed to validate attendance:', err);
      throw err;
    }
  };

  /**
   * Resets a booking back to pending — user hasn't paid the fee yet.
   * Sets status=pending, payment_status=pending, deposit_amount=0.
   */
  const resetToPending = async (id: string) => {
    try {
      await bookingService.updateBookingStatus(id, 'pending', 'pending', 0);
      setBookings(prev =>
        prev.map(b =>
          b.id === id
            ? { ...b, status: 'pending', paymentStatus: 'pending', depositAmount: 0 }
            : b
        )
      );
    } catch (err) {
      console.error('Failed to reset booking:', err);
      throw err;
    }
  };

  const refreshBookings = () => fetchBookings(true);

  // Initial load
  useEffect(() => {
    fetchBookings();
  }, []);

  return (
    <BookingContext.Provider value={{
      bookings,
      isLoading,
      error,
      refreshBookings,
      updateBookingStatus,
      updatePaymentStatus,
      validateAttendance,
      resetToPending,
    }}>
      {children}
    </BookingContext.Provider>
  );
};

export const useBookings = () => {
  const context = useContext(BookingContext);
  if (context === undefined) {
    throw new Error('useBookings must be used within a BookingProvider');
  }
  return context;
};

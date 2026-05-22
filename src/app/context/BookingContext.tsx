import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { bookingService } from '../services/bookingService';
import { bookingStatusService, type BookingForStatusUpdate } from '../services/bookingStatusService';
import { offerService } from '../services/offerService';
import { authService } from '../services/authService';
import { adminService } from '../services/adminService';
import { getCurrentRole, isSuperAdmin } from '../utils/authRole';
import {
  toBookingStatus,
  fromApiStatus,
  parseTotalPrice,
  isReceiptValidated,
  type BookingStatus as BookingStatusType,
} from '../utils/bookingStatus';

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
  /** Canonical UI workflow status */
  status: BookingStatusType;
  /** Raw status from API/DB (e.g. confirmed vs validated) */
  apiStatus: string;
  paymentStatus: 'pending' | 'under_review' | 'paid' | 'failed' | 'refunded';
  depositAmount: number;
  receiptUrl?: string | null;
  receiptValidated: boolean;
  fullUser?: any;
  offer?: any;
}

export interface UpdateBookingStatusOptions {
  depositAmount?: number;
  validateReceipt?: boolean;
}

interface BookingContextType {
  bookings: DashboardBooking[];
  isLoading: boolean;
  error: string | null;
  userRole: ReturnType<typeof getCurrentRole>;
  refreshBookings: () => Promise<void>;
  updateBookingStatus: (
    id: string,
    status: string,
    options?: UpdateBookingStatusOptions
  ) => Promise<void>;
  validateReceipt: (id: string, depositAmount?: number) => Promise<void>;
  /** Saves deposit (API when possible, otherwise local until validate / release) */
  saveDepositAmount: (id: string, depositAmount: number) => Promise<'api' | 'local'>;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

function toBookingForUpdate(b: DashboardBooking): BookingForStatusUpdate {
  return {
    id: b.id,
    status: b.status,
    apiStatus: b.apiStatus,
    paymentStatus: b.paymentStatus,
    depositAmount: b.depositAmount,
    totalPrice: b.totalPrice,
    receiptUrl: b.receiptUrl,
    receiptValidated: b.receiptValidated,
  };
}

export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bookings, setBookings] = useState<DashboardBooking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [userRole, setUserRole] = useState(getCurrentRole);

  const fetchBookings = useCallback(async (force = false) => {
    if (isLoading && !force) return;
    if (hasLoadedOnce && !force) return;

    try {
      setIsLoading(true);
      setError(null);

      const role = getCurrentRole();
      setUserRole(role);
      const superAdmin = isSuperAdmin(role);

      const user = authService.getStoredUser();
      const currentUserId = user?._id || user?.id || user?.user?.id || user?.data?.id;
      const currentRole = String(
        user?.role ||
          user?.user?.role ||
          user?.data?.role ||
          user?.user_metadata?.role ||
          user?.app_metadata?.role ||
          ''
      )
        .toLowerCase()
        .replace(/[_ ]/g, '');

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

      const extractPaymentStatus = (booking: any): DashboardBooking['paymentStatus'] => {
        const payment = String(booking?.paymentStatus || booking?.payment_status || '').trim();
        const allowed: DashboardBooking['paymentStatus'][] = [
          'pending',
          'under_review',
          'paid',
          'failed',
          'refunded',
        ];
        return allowed.includes(payment as DashboardBooking['paymentStatus'])
          ? (payment as DashboardBooking['paymentStatus'])
          : 'pending';
      };

      const normalizeBookings = (data: any) =>
        Array.isArray(data) ? data : data?.bookings || data?.data?.bookings || data?.data || [];

      let bookingsArray: any[] = [];
      const allBookingsRaw = await bookingService.getAllBookings();
      bookingsArray = normalizeBookings(allBookingsRaw);

      if (currentRole !== 'superadmin' && currentUserId) {
        const offersRaw = await offerService.getAllOffers();
        const offersArray = Array.isArray(offersRaw)
          ? offersRaw
          : (offersRaw as any)?.offers || (offersRaw as any)?.data || [];
        const myOfferIds = new Set(
          offersArray
            .filter((o: any) => {
              const ownerId = o.user_id || o.userId || o.admin_id || o.created_by;
              const ownerIdStr = typeof ownerId === 'object' ? ownerId._id || ownerId.id : ownerId;
              return String(ownerIdStr) === String(currentUserId);
            })
            .map((o: any) => String(o.id || o._id))
        );

        bookingsArray = bookingsArray.filter((b: any) => {
          const oid = extractId(b, 'offer_id', 'offerId', 'offer');
          return oid && myOfferIds.has(String(oid));
        });
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
          [...offerIdSet].map((id) =>
            offerService
              .getOfferDetails(id)
              .then((r) => ({
                id,
                data: (r as any)?.offer || (r as any)?.data?.offer || (r as any)?.data || r,
              }))
          )
        ),
        bookingsArray.length > 0
          ? adminService.getAllUsers({ limit: 100, offset: 0 }).catch(() => [])
          : Promise.resolve([]),
      ]);

      const offerMap: Record<string, any> = {};
      offerResults.forEach((r) => {
        if (r.status === 'fulfilled') offerMap[r.value.id] = r.value.data;
      });

      const userMap: Record<string, any> = {};
      if (Array.isArray(usersResult)) {
        usersResult.forEach((u: any) => {
          const id = String(u?.id || u?._id || '').trim();
          if (id) userMap[id] = u;
        });
      }

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

      const mappedBookings: DashboardBooking[] = bookingsArray.map((booking: any) => {
        const oid = extractId(booking, 'offer_id', 'offerId', 'offer');
        const o = oid ? offerMap[oid] : null;
        const uid = extractId(booking, 'user_id', 'userId', 'user');
        const normalizedUid = uid ? String(uid).trim() : null;
        const mappedUser = normalizedUid ? userMap[normalizedUid] : null;
        const resolvedUser =
          mappedUser ??
          (typeof booking.user === 'object' ? booking.user : null) ??
          (typeof booking.customer === 'object' ? booking.customer : null);
        const resolvedOffer = o ?? (typeof booking.offer === 'object' ? booking.offer : null);

        const totalPrice = parseTotalPrice(
          booking.total_price ?? booking.totalAmount ?? booking.amount
        );
        const paymentStatus = extractPaymentStatus(booking);
        const receiptValidatedFlag =
          booking.receipt_validated === true ||
          booking.receiptValidated === true ||
          isReceiptValidated({ paymentStatus, receiptValidated: false });

        const rawReceipt =
          booking.receipt_url ||
          booking.receiptUrl ||
          booking.payment_receipt_url ||
          booking.paymentReceiptUrl ||
          booking.receipt_image ||
          booking.receiptImage ||
          null;

        return {
          id: booking.id || booking._id,
          bookingRef:
            booking.ref ||
            booking.bookingRef ||
            `BK-${(booking.id || booking._id).toString().slice(-6).toUpperCase()}`,
          customerName:
            extractName(resolvedUser) ||
            booking.customerName ||
            booking.full_name ||
            booking.user_name ||
            'Unknown User',
          customerEmail: resolvedUser?.email || booking.customerEmail || booking.email || '-',
          customerPhone:
            resolvedUser?.phone || resolvedUser?.phoneNumber || booking.customerPhone || booking.phone || '-',
          customerGender: resolvedUser?.gender || booking.customerGender || booking.gender || '-',
          offerName: resolvedOffer?.title || resolvedOffer?.name || booking.offerName || 'Custom Trip',
          destination: resolvedOffer?.location || resolvedOffer?.destination || booking.destination || '-',
          startDate: booking.startDate || booking.start_date || '-',
          endDate: booking.endDate || booking.end_date || '-',
          travelers: booking.travelers || booking.people || 1,
          amount:
            booking.totalAmount !== undefined
              ? `${booking.totalAmount} DZD`
              : booking.total_price !== undefined
                ? `${booking.total_price} DZD`
                : booking.amount || '0 DZD',
          totalPrice,
          apiStatus: String(booking?.status || 'pending').trim().toLowerCase(),
          status: fromApiStatus(booking?.status),
          paymentStatus,
          depositAmount: Number(booking.deposit_amount ?? booking.depositAmount ?? 0) || 0,
          receiptUrl: superAdmin ? rawReceipt : null,
          receiptValidated: receiptValidatedFlag,
          fullUser: resolvedUser,
          offer: resolvedOffer,
        };
      });

      setBookings(mappedBookings);
      setHasLoadedOnce(true);
    } catch (err: any) {
      console.error('Failed to fetch bookings:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load bookings.');
    } finally {
      setIsLoading(false);
    }
  }, [hasLoadedOnce, isLoading]);

  const applyUpdateFromResponse = (id: string, updated: Record<string, unknown>, fallback: Partial<DashboardBooking>) => {
    setBookings((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        const paymentStatus = String(
          updated.payment_status ?? updated.paymentStatus ?? fallback.paymentStatus ?? b.paymentStatus
        ) as DashboardBooking['paymentStatus'];
        return {
          ...b,
          apiStatus: String(
            updated.status ?? updated.apiStatus ?? fallback.status ?? b.apiStatus
          )
            .trim()
            .toLowerCase(),
          status: fromApiStatus(String(updated.status ?? fallback.status ?? b.status)),
          paymentStatus,
          depositAmount: Number(
            updated.deposit_amount ?? updated.depositAmount ?? fallback.depositAmount ?? b.depositAmount
          ),
          receiptValidated:
            updated.receipt_validated === true ||
            isReceiptValidated({
              paymentStatus,
              receiptValidated: fallback.receiptValidated,
            }),
          ...(fallback.receiptUrl !== undefined ? { receiptUrl: fallback.receiptUrl } : {}),
        };
      })
    );
  };

  const updateBookingStatus = async (
    id: string,
    status: string,
    options?: UpdateBookingStatusOptions
  ) => {
    const current = bookings.find((b) => b.id === id);
    if (!current) throw new Error('Booking not found');

    const { booking: updated, payload } = await bookingStatusService.updateStatus(
      toBookingForUpdate(current),
      status,
      options
    );

    applyUpdateFromResponse(id, updated, {
      status: payload.status,
      paymentStatus: payload.payment_status as DashboardBooking['paymentStatus'],
      depositAmount: payload.deposit_amount,
      receiptValidated: payload.payment_status === 'paid',
    });
  };

  const validateReceipt = async (id: string, depositAmount?: number) => {
    const current = bookings.find((b) => b.id === id);
    if (!current) throw new Error('Booking not found');

    const { booking: updated, payload } = await bookingStatusService.validateReceipt(
      toBookingForUpdate(current),
      depositAmount
    );

    applyUpdateFromResponse(id, updated, {
      depositAmount: payload.deposit_amount,
      paymentStatus: 'paid',
      receiptValidated: true,
    });
  };

  const saveDepositAmount = async (id: string, depositAmount: number): Promise<'api' | 'local'> => {
    if (depositAmount <= 0) {
      throw new Error('Deposit amount must be greater than zero.');
    }
    const current = bookings.find((b) => b.id === id);
    if (!current) throw new Error('Booking not found');
    if (toBookingStatus(current.status) !== toBookingStatus('confirmed')) {
      throw new Error('Deposit can only be set while booking is confirmed.');
    }

    const { result, persistedOnServer } = await bookingStatusService.saveDeposit(
      toBookingForUpdate(current),
      depositAmount
    );

    if (persistedOnServer) {
      applyUpdateFromResponse(id, result.booking, {
        depositAmount: result.payload.deposit_amount ?? depositAmount,
        status: result.payload.status
          ? fromApiStatus(String(result.payload.status))
          : current.status,
        apiStatus: String(result.payload.status ?? current.apiStatus),
      });
      return 'api';
    }

    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, depositAmount } : b))
    );
    return 'local';
  };

  const refreshBookings = () => fetchBookings(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  return (
    <BookingContext.Provider
      value={{
        bookings,
        isLoading,
        error,
        userRole,
        refreshBookings,
        updateBookingStatus,
        validateReceipt,
        saveDepositAmount,
      }}
    >
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

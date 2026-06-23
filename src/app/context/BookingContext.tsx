import React, { useState, useCallback, useRef } from 'react';
import { BookingContext } from './bookingContextStore';
import type { DashboardBooking } from './bookingContextTypes';
import type { WorkflowAction } from '../utils/bookingWorkflow';

export type { DashboardBooking } from './bookingContextTypes';
export { useBookings } from './useBookings';
import { bookingService } from '../services/bookingService';
import { bookingStatusService } from '../services/bookingStatusService';
import { offerService } from '../services/offerService';
import { authService } from '../services/authService';
import { adminService } from '../services/adminService';
import { getCurrentRole, isSuperAdmin, isAdmin } from '../utils/authRole';
import {
  collectCurrentIdentityIds,
  collectCurrentIdentityEmails,
  collectCurrentAgencyNames,
  syncRememberedOffersFromBookings,
  type AdminTenantContext,
} from '../utils/tenantScope';
import {
  parseTotalPrice,
} from '../utils/bookingStatus';
import {
  DEFAULT_BOOKINGS_LIMIT,
  type GetBookingsParams,
} from '../utils/bookingQuery';
import { trimApiEnum } from '../constants/bookingApiEnums';

/**
 * Resolve tenant context WITHOUT hitting the network.
 * Uses only localStorage (JWT + stored user).  The one-time network
 * refresh happens separately inside fetchBookings on first load.
 */
function resolveTenantFromStorage(): AdminTenantContext {
  const role = getCurrentRole();
  const identityIds = collectCurrentIdentityIds();
  const emails = collectCurrentIdentityEmails();
  const agencyNames = collectCurrentAgencyNames();
  return {
    role,
    userId: identityIds[0] ?? null,
    email: emails[0] ?? null,
    identityIds,
    emails,
    agencyNames,
  };
}

export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bookings, setBookings] = useState<DashboardBooking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState(getCurrentRole);

  // ----- refs (never trigger re-renders) -----
  const isFetchingRef = useRef(false);
  const hasFetchedRef = useRef(false);
  const authRefreshedRef = useRef(false);
  const fetchParamsRef = useRef<GetBookingsParams>({
    limit: DEFAULT_BOOKINGS_LIMIT,
    offset: 0,
  });

  // -----------------------------------------------------------------------
  // Core fetch — called ONCE on mount and imperatively on manual refresh
  // -----------------------------------------------------------------------
  const fetchBookings = useCallback(async (force = false, params?: GetBookingsParams) => {
    if (params) {
      fetchParamsRef.current = params;
    }

    if (isFetchingRef.current) return;
    if (hasFetchedRef.current && !force) return;

    isFetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const role = getCurrentRole();
      setUserRole(role);

      // ── Auth: refresh stored user ONCE per session (not on every render) ──
      if (!authRefreshedRef.current) {
        authRefreshedRef.current = true;
        try {
          const profile = await authService.getCurrentUser();
          const user =
            (profile as any)?.user ||
            (profile as any)?.data?.user ||
            (profile as any)?.data ||
            profile;
          if (user && typeof user === 'object') {
            // Persist fresh user data to localStorage so tenantScope reads it
            const existing = authService.getStoredUser() || {};
            localStorage.setItem('user', JSON.stringify({ ...existing, ...user }));
          }
        } catch {
          // If /auth/user fails (e.g. 429), we continue with cached localStorage data
        }
      }

      // ── Tenant from storage (no extra network call) ──
      const tenant = resolveTenantFromStorage();

      // ── Helpers ──
      const extractId = (obj: unknown, ...keys: string[]): string | null => {
        if (!obj || typeof obj !== 'object') return null;
        const record = obj as Record<string, unknown>;
        for (const key of keys) {
          const val = record[key];
          if (!val) continue;
          if (typeof val === 'string' && val.length > 0) return val;
          if (typeof val === 'object' && val !== null) {
            const nested = val as Record<string, unknown>;
            const id = nested._id ?? nested.id;
            if (id) return String(id);
          }
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

      const extractPaymentStatus = (booking: Record<string, unknown>): DashboardBooking['paymentStatus'] => {
        const payment = trimApiEnum(booking.paymentStatus ?? booking.payment_status);
        return payment || null;
      };

      const [bookingsArray, offersArray, adminsArray] = await Promise.all([
        bookingService.getDashboardBookings(tenant, fetchParamsRef.current) as Promise<any[]>,
        isSuperAdmin(role)
          ? offerService.getAllOffers() as Promise<any[]>
          : offerService.getDashboardOffers(tenant, []) as Promise<any[]>,
        // Fetch admins list only for super admin – used to resolve agency names per offer
        isSuperAdmin(role)
          ? adminService.getAllAdmins({ limit: 200, offset: 0 }).catch(() => []) as Promise<any[]>
          : Promise.resolve([]),
      ]);

      // ── Build offer map from the already-fetched list (0 extra calls) ──
      const offerMap: Record<string, any> = {};
      if (Array.isArray(offersArray)) {
        offersArray.forEach((o: any) => {
          const id = String(o?.id || o?._id || '').trim();
          if (id) offerMap[id] = o;
        });
      }

      // ── Build admin map keyed by user id AND email (for agency name lookup) ──
      const adminMap: Record<string, any> = {};
      const adminEmailMap: Record<string, any> = {};
      if (Array.isArray(adminsArray)) {
        adminsArray.forEach((a: any) => {
          const id = String(a?.id || a?._id || '').trim();
          if (id) adminMap[id] = a;
          const email = String(a?.email || '').trim().toLowerCase();
          if (email) adminEmailMap[email] = a;
        });
      }

      // ── Debug: log first raw booking to inspect available fields ──
      if (bookingsArray.length > 0 && isSuperAdmin(role)) {
        const sample = bookingsArray[0];
        console.debug('[BookingContext] raw booking sample keys:', Object.keys(sample || {}));
        if (sample?.offer) console.debug('[BookingContext] booking.offer keys:', Object.keys(sample.offer || {}));
      }

      // ── Helper: resolve agency name, checking every possible data source ──
      const resolveAgencyName = (resolvedOffer: any, rawBooking?: any): string => {
        // Sources to check in priority order:
        const inlineOffer = rawBooking && typeof rawBooking.offer === 'object' ? rawBooking.offer : null;

        // 1. Direct agency name on offer (current or future API)
        const directSources = [resolvedOffer, inlineOffer];
        for (const src of directSources) {
          if (!src) continue;
          const direct =
            src?.agency?.name ||
            src?.agency_name ||
            src?.agencyName ||
            src?.creator?.agency_name ||
            src?.creator?.name ||
            src?.admin?.agency_name ||
            src?.admin?.agencyName;
          if (direct && direct !== 'null') return String(direct);
        }

        // 2. Cross-reference via offer owner user_id → adminMap → agency_name
        const ownerIdCandidates: string[] = [];
        for (const src of [resolvedOffer, inlineOffer]) {
          if (!src) continue;
          [src.user_id, src.userId, src.admin_id, src.adminId, src.owner_id, src.ownerId,
            src.creator?.id, src.creator?._id, src.admin?.id, src.admin?._id,
          ].forEach((v: any) => { if (v) ownerIdCandidates.push(String(v).trim()); });
        }
        for (const oid of ownerIdCandidates) {
          const admin = adminMap[oid];
          if (admin?.agency_name) return admin.agency_name;
          if (admin?.agencyName) return admin.agencyName;
        }

        // 3. Agency info directly on the raw booking (some APIs embed it)
        if (rawBooking) {
          const bookingDirect =
            rawBooking?.agency?.name ||
            rawBooking?.agency_name ||
            rawBooking?.agencyName ||
            rawBooking?.admin?.agency_name ||
            rawBooking?.admin?.agencyName;
          if (bookingDirect && bookingDirect !== 'null') return String(bookingDirect);

          // 4. Cross-reference booking.admin_id / booking.agency_id → adminMap
          const bookingAdminId = rawBooking?.admin_id || rawBooking?.adminId ||
            rawBooking?.agency_id || rawBooking?.agencyId ||
            rawBooking?.admin?.id || rawBooking?.admin?._id;
          if (bookingAdminId) {
            const admin = adminMap[String(bookingAdminId).trim()];
            if (admin?.agency_name) return admin.agency_name;
            if (admin?.agencyName) return admin.agencyName;
          }

          // 5. Cross-reference booking.admin email → adminEmailMap
          const bookingAdminEmail = rawBooking?.admin?.email || rawBooking?.agency?.email;
          if (bookingAdminEmail) {
            const admin = adminEmailMap[String(bookingAdminEmail).trim().toLowerCase()];
            if (admin?.agency_name) return admin.agency_name;
          }
        }

        return '-';
      };

      // ── Collect user IDs needed ──
      const userIdSet = new Set<string>();
      bookingsArray.forEach((b: any) => {
        const uid = extractId(b, 'user_id', 'userId', 'user');
        if (uid) userIdSet.add(uid);
      });

      // ── Fetch users in one batch call (superadmins only to avoid 403) ──
      const userMap: Record<string, any> = {};
      if (isSuperAdmin(role) && bookingsArray.length > 0) {
        try {
          const usersResult = await adminService.getAllUsers({ limit: 100, offset: 0 });
          if (Array.isArray(usersResult)) {
            usersResult.forEach((u: any) => {
              const id = String(u?.id || u?._id || '').trim();
              if (id) userMap[id] = u;
            });
          }
        } catch {
          // If users list fails, continue — we fall back to inline booking data
        }

        // Fetch any users not in the batch, sequentially with a 100 ms gap to avoid 429
        const missing = [...userIdSet].filter((id) => !userMap[String(id).trim()]);
        for (const id of missing) {
          await new Promise((r) => setTimeout(r, 100));
          try {
            const r = await adminService.getUserDetails(String(id).trim());
            const userData = (r as any)?.user || (r as any)?.data?.user || (r as any)?.data || r;
            if (userData) {
              const uid = String((userData as any).id || (userData as any)._id || id).trim();
              userMap[uid] = userData;
            }
          } catch {
            // Skip failed individual lookups silently
          }
        }
      }

      // Fetch user info for missing/incomplete users using getUserDetails or getUserBookings fallback.
      // This ensures normal agency admins see booker details for their offers.
      const missingUserIds = [...userIdSet].filter((id) => {
        const u = userMap[String(id).trim()];
        return !u || (!u.email && !u.phone && !u.full_name && !u.firstName && !u.lastName);
      });

      for (const id of missingUserIds) {
        const trimmedId = String(id).trim();
        try {
          // First check if any other booking in the fetched list already has the user info inline
          const inlineMatch = bookingsArray.find((b: any) => {
            const uid = extractId(b, 'user_id', 'userId', 'user');
            if (uid && String(uid).trim() === trimmedId) {
              const userObj = b.user || b.customer;
              return userObj && typeof userObj === 'object' && extractName(userObj) && (userObj.email || userObj.phone);
            }
            return false;
          });

          if (inlineMatch) {
            userMap[trimmedId] = inlineMatch.user || inlineMatch.customer;
            continue;
          }

          // Attempt 1: Fetch details directly using getUserDetails (allowed if backend permits admins to view their offer's bookers)
          try {
            const r = await adminService.getUserDetails(trimmedId);
            const userData = (r as any)?.user || (r as any)?.data?.user || (r as any)?.data || r;
            if (userData && (userData.email || userData.phone || userData.full_name || userData.firstName)) {
              userMap[trimmedId] = userData;
              continue;
            }
          } catch {
            // Ignore unauthorized/bad request errors and try fallback
          }

          // Attempt 2: Fetch bookings for this user as a fallback to extract user/customer details
          const userBookings = await bookingService.getUserBookings(trimmedId);
          const normalizedBookings = Array.isArray(userBookings)
            ? userBookings
            : (userBookings?.bookings || userBookings?.data || []);
          const firstBookingWithUser = normalizedBookings.find((b: any) => {
            const userObj = b?.user || b?.customer;
            return userObj && (userObj.email || userObj.phone || extractName(userObj));
          });
          if (firstBookingWithUser) {
            userMap[trimmedId] = firstBookingWithUser.user || firstBookingWithUser.customer;
          }
        } catch (e) {
          console.error(`Failed to load fallback user details for user ${trimmedId}:`, e);
        }
      }

      // ── Map to DashboardBooking ──
      const superAdmin = isSuperAdmin(role);
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

        const totalPrice = parseTotalPrice(booking.total_price ?? booking.totalAmount ?? booking.amount);
        const paymentStatus = extractPaymentStatus(booking);

        const rawStatus = trimApiEnum(booking?.status);

        const depositReceiptUrl =
          booking.deposit_receipt_url ||
          booking.depositReceiptUrl ||
          booking.receipt_url ||
          booking.receiptUrl ||
          null;

        const rawReceipt = depositReceiptUrl;

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
          agencyName: resolveAgencyName(resolvedOffer),
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
          apiStatus: rawStatus,
          status: rawStatus,
          paymentStatus,
          depositAmount: Number(booking.deposit_amount ?? booking.depositAmount ?? 0) || 0,
          depositReceiptUrl: depositReceiptUrl ? String(depositReceiptUrl) : null,
          receiptUrl: superAdmin && rawReceipt ? String(rawReceipt) : null,
          fullUser: resolvedUser,
          offer: resolvedOffer,
        };
      });

      setBookings(mappedBookings);
      hasFetchedRef.current = true;
    } catch (err: any) {
      console.error('Failed to fetch bookings:', err);
      const status = err?.response?.status;
      let userMsg = 'Failed to load bookings. Please try refreshing the page.';
      if (status === 401) {
        userMsg = 'Session expired. Please log in again.';
      } else if (status === 403) {
        userMsg = 'You do not have access to view these bookings.';
      } else if (err.message === 'Network Error') {
        userMsg = 'Network error. Please check your internet connection.';
      } else if (err?.response?.data?.message) {
        userMsg = err.response.data.message;
      }
      setError(userMsg);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  // !! Empty deps — this function never changes identity, no loop possible !!
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyBookingUpdateFromResponse = (id: string, updated: Record<string, unknown>) => {
    setBookings((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        const nextStatus = trimApiEnum(updated.status ?? b.status);
        const nextPayment = updated.payment_status ?? updated.paymentStatus;
        const nextReceipt =
          updated.deposit_receipt_url ??
          updated.depositReceiptUrl ??
          b.depositReceiptUrl;
        return {
          ...b,
          apiStatus: nextStatus,
          status: nextStatus,
          paymentStatus: nextPayment != null ? trimApiEnum(nextPayment) : b.paymentStatus,
          depositReceiptUrl: nextReceipt ? String(nextReceipt) : b.depositReceiptUrl,
          receiptUrl: nextReceipt ? String(nextReceipt) : b.receiptUrl,
          depositAmount: Number(
            updated.deposit_amount ?? updated.depositAmount ?? b.depositAmount
          ),
        };
      })
    );
  };

  const applyWorkflowAction = async (id: string, action: WorkflowAction) => {
    const { booking: updated } = await bookingStatusService.applyWorkflowAction(id, action);
    applyBookingUpdateFromResponse(id, updated);
    await fetchBookings(true, fetchParamsRef.current);
  };

  /** POST /bookings/{id}/deposit-receipt — upload proof only, no status change from frontend */
  const uploadDepositReceipt = async (id: string, file: File): Promise<void> => {
    await bookingService.uploadDepositReceipt(id, file);
    await refreshBookings(fetchParamsRef.current);
  };


  const refreshBookings = useCallback((params?: GetBookingsParams) => {
    hasFetchedRef.current = false;
    return fetchBookings(true, params);
  }, [fetchBookings]);

  // ── Bookings are NOT pre-loaded on mount.
  // ── They are fetched on-demand when a page component calls refreshBookings().
  // ── This keeps the server free at login time.

  return (
    <BookingContext.Provider
      value={{
        bookings,
        isLoading,
        error,
        userRole,
        refreshBookings,
        applyWorkflowAction,
        uploadDepositReceipt,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
};

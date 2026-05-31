/**
 * tenantScope.ts
 * ──────────────
 * Utilities for resolving the currently logged-in admin's identity and
 * scoping API data (bookings, offers) to their agency.
 *
 * Roles
 *  • superadmin  – sees ALL data; no filtering.
 *  • admin       – agency admin; filtered to their own offers/bookings.
 */

// ─────────────────────────────────────────────────────────────
// Public composite types
// ─────────────────────────────────────────────────────────────

/** A single customer booking record, flattened for display. */
export interface BookerInfo {
  bookingId: string;
  bookingRef: string;
  userId: string | null;
  name: string;
  email: string;
  phone: string;
  gender: string;
  status: string;
  paymentStatus: string | null;
  amount: number;
  depositAmount: number;
  travelers: number;
  createdAt: string | null;
}

/** An offer enriched with the list of customers who booked it. */
export interface OfferWithBookers {
  offer: Record<string, unknown>;
  bookers: BookerInfo[];
  bookingCount: number;
  totalRevenue: number;
  uniqueCustomers: number;
}

import { authService } from '../services/authService';
import { getCurrentRole, isSuperAdmin, type NormalizedRole } from './authRole';
import api from '../services/api';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface AdminTenantContext {
  role: NormalizedRole;
  userId: string | null;
  email: string | null;
  identityIds: string[];
  emails: string[];
  agencyNames: string[];
}

// ─────────────────────────────────────────────────────────────
// Internal helpers – reading stored user
// ─────────────────────────────────────────────────────────────

function getStoredUser(): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Extract a scalar string from an arbitrary object, trying multiple key names. */
export function extractEntityId(
  obj: unknown,
  ...keys: string[]
): string | null {
  if (!obj || typeof obj !== 'object') return null;
  const record = obj as Record<string, unknown>;
  for (const key of keys) {
    const val = record[key];
    if (!val) continue;
    if (typeof val === 'string' && val.length > 0) return val;
    if (typeof val === 'number') return String(val);
    if (typeof val === 'object' && val !== null) {
      const nested = val as Record<string, unknown>;
      const id = nested._id ?? nested.id;
      if (id) return String(id);
    }
  }
  return null;
}

/** Normalise an id value to a trimmed string or null. */
export function normalizeId(id: string | null | undefined): string | null {
  if (!id) return null;
  const s = String(id).trim();
  return s.length > 0 ? s : null;
}

// ─────────────────────────────────────────────────────────────
// Identity helpers
// ─────────────────────────────────────────────────────────────

/**
 * Collect every user-id variant we can find in localStorage for the
 * currently logged-in user.
 */
export function collectCurrentIdentityIds(): string[] {
  const user = getStoredUser();
  if (!user) return [];

  const candidates: unknown[] = [
    user.id,
    user._id,
    user.userId,
    user.user_id,
    (user.user as Record<string, unknown> | undefined)?.id,
    (user.user as Record<string, unknown> | undefined)?._id,
  ];

  const ids: string[] = [];
  for (const c of candidates) {
    const s = c != null ? normalizeId(String(c)) : null;
    if (s && !ids.includes(s)) ids.push(s);
  }
  return ids;
}

/**
 * Collect every email variant we can find in localStorage for the
 * currently logged-in user.
 */
export function collectCurrentIdentityEmails(): string[] {
  const user = getStoredUser();
  if (!user) return [];

  const raw: unknown[] = [
    user.email,
    (user.user as Record<string, unknown> | undefined)?.email,
    ...(Array.isArray(user._identityEmails) ? user._identityEmails : []),
  ];

  const emails: string[] = [];
  for (const e of raw) {
    if (typeof e === 'string') {
      const s = e.trim().toLowerCase();
      if (s && !emails.includes(s)) emails.push(s);
    }
  }
  return emails;
}

/**
 * Collect every agency name variant we can find in localStorage for the
 * currently logged-in user.
 */
export function collectCurrentAgencyNames(): string[] {
  const user = getStoredUser();
  if (!user) return [];
  const names: string[] = [];
  const candidates = [
    user.agency_name,
    user.agencyName,
    (user.user as Record<string, unknown> | undefined)?.agency_name,
    (user.user as Record<string, unknown> | undefined)?.agencyName,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) {
      const s = c.trim().toLowerCase();
      if (!names.includes(s)) names.push(s);
    }
  }
  return names;
}

// ─────────────────────────────────────────────────────────────
// persistLoginEmail / resolveCurrentUserId
// ─────────────────────────────────────────────────────────────

/**
 * Persist the email used at login so tenantScope can always find it even
 * when the /auth/user response omits the field.
 */
export function persistLoginEmail(email: string): void {
  if (!email) return;
  const normalised = email.trim().toLowerCase();
  try {
    const existing = getStoredUser() ?? {};
    const currentEmails: string[] = Array.isArray(existing._identityEmails)
      ? (existing._identityEmails as string[])
      : [];
    if (!currentEmails.includes(normalised)) {
      currentEmails.unshift(normalised);
    }
    localStorage.setItem(
      'user',
      JSON.stringify({ ...existing, email: normalised, _identityEmails: currentEmails })
    );
  } catch {
    // If storage is unavailable, silently continue
  }
}

/**
 * Resolve the current user's id, refreshing from the API if not already
 * stored.  Returns the id string or null.
 */
export async function resolveCurrentUserId(): Promise<string | null> {
  const ids = collectCurrentIdentityIds();
  if (ids.length > 0) return ids[0];

  try {
    const profile = await authService.getCurrentUser();
    const user =
      (profile as any)?.user ??
      (profile as any)?.data?.user ??
      (profile as any)?.data ??
      profile;
    if (user && typeof user === 'object') {
      const existing = getStoredUser() ?? {};
      localStorage.setItem('user', JSON.stringify({ ...existing, ...user }));
      const freshIds = collectCurrentIdentityIds();
      return freshIds[0] ?? null;
    }
  } catch {
    // Ignore network errors – caller continues with null
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// Admin tenant context resolution
// ─────────────────────────────────────────────────────────────

let _cachedTenant: AdminTenantContext | null = null;

/** Invalidate the cached AdminTenantContext (e.g. on logout). */
export function invalidateAdminTenantCache(): void {
  _cachedTenant = null;
}

/**
 * Resolve the full AdminTenantContext, refreshing from the API once per
 * session and caching the result.
 */
export async function resolveAdminTenant(): Promise<AdminTenantContext> {
  if (_cachedTenant) return _cachedTenant;

  // Try to refresh stored user from the API
  try {
    const profile = await authService.getCurrentUser();
    const user =
      (profile as any)?.user ??
      (profile as any)?.data?.user ??
      (profile as any)?.data ??
      profile;
    if (user && typeof user === 'object') {
      const existing = getStoredUser() ?? {};
      const email =
        typeof (user as any).email === 'string'
          ? (user as any).email.trim().toLowerCase()
          : undefined;
      localStorage.setItem(
        'user',
        JSON.stringify({
          ...existing,
          ...user,
          ...(email ? { email, _identityEmails: [email] } : {}),
        })
      );
    }
  } catch {
    // Continue with cached localStorage data
  }

  const role = getCurrentRole();
  const identityIds = collectCurrentIdentityIds();
  const emails = collectCurrentIdentityEmails();
  const agencyNames = collectCurrentAgencyNames();

  _cachedTenant = {
    role,
    userId: identityIds[0] ?? null,
    email: emails[0] ?? null,
    identityIds,
    emails,
    agencyNames,
  };

  return _cachedTenant;
}

// ─────────────────────────────────────────────────────────────
// Offer ownership helpers
// ─────────────────────────────────────────────────────────────

export function collectOfferOwnerIds(offer: unknown): string[] {
  if (!offer || typeof offer !== 'object') return [];
  const o = offer as Record<string, unknown>;
  const candidates: unknown[] = [
    o.user_id,
    o.userId,
    o.admin_id,
    o.adminId,
    o.owner_id,
    o.ownerId,
    (o.user as Record<string, unknown> | undefined)?.id,
    (o.user as Record<string, unknown> | undefined)?._id,
    (o.admin as Record<string, unknown> | undefined)?.id,
    (o.admin as Record<string, unknown> | undefined)?._id,
    (o.agency as Record<string, unknown> | undefined)?.id,
    (o.agency as Record<string, unknown> | undefined)?._id,
    (o.agency as Record<string, unknown> | undefined)?.user_id,
    (o.agency as Record<string, unknown> | undefined)?.userId,
    (o.creator as Record<string, unknown> | undefined)?.id,
    (o.creator as Record<string, unknown> | undefined)?._id,
    (o.creator as Record<string, unknown> | undefined)?.user_id,
    (o.creator as Record<string, unknown> | undefined)?.userId,
  ];
  const ids: string[] = [];
  for (const c of candidates) {
    if (c == null) continue;
    const s = normalizeId(String(c));
    if (s && !ids.includes(s)) ids.push(s);
  }
  return ids;
}

/**
 * Decide whether a given offer belongs to the tenant (agency admin).
 */
function offerBelongsToTenant(offer: unknown, tenant: AdminTenantContext): boolean {
  const ownerIds = collectOfferOwnerIds(offer);
  
  // Try matching owner IDs first
  if (ownerIds.length > 0) {
    const matched = ownerIds.some(
      (id) =>
        tenant.identityIds.includes(id) ||
        tenant.emails.some((e) => id.toLowerCase() === e)
    );
    if (matched) return true;
  }

  // Fallback: match by agency name if defined
  if (tenant.agencyNames && tenant.agencyNames.length > 0 && offer && typeof offer === 'object') {
    const o = offer as Record<string, unknown>;
    
    // Check agency names in offer fields:
    const offerAgencyNames: string[] = [];
    const candidates = [
      o.agency_name,
      o.agencyName,
      (o.agency as Record<string, unknown> | undefined)?.name,
      (o.creator as Record<string, unknown> | undefined)?.agency_name,
      (o.creator as Record<string, unknown> | undefined)?.agencyName,
    ];
    for (const c of candidates) {
      if (typeof c === 'string' && c.trim()) {
        offerAgencyNames.push(c.trim().toLowerCase());
      }
    }
    
    const matchedAgency = offerAgencyNames.some((name) => tenant.agencyNames.includes(name));
    if (matchedAgency) return true;
  }

  return false;
}

/**
 * Filter an offer list to only those owned by the tenant.
 * Super admins always receive the full list.
 *
 * Two-pass strategy:
 *  1. Match offers by user_id / admin_id field against the tenant identity.
 *  2. If pass-1 returns nothing, fall back to offers whose ID was registered
 *     via registerCreatedOfferResponse (created in this browser session).
 */
export function filterOffersForAdmin(
  offers: unknown[],
  tenant: AdminTenantContext,
  _bookingsHint?: unknown[]
): unknown[] {
  if (isSuperAdmin(tenant.role)) return offers;

  // Pass 1 — ownership field matching
  const owned = offers.filter((o) => offerBelongsToTenant(o, tenant));
  if (owned.length > 0) return owned;

  // Pass 2 — localStorage-registered IDs (offers created this session)
  const registered = getRegisteredCreatedOfferIds();
  if (registered.size === 0) return [];
  return offers.filter((o) => {
    const id = normalizeId(extractEntityId(o, 'id', '_id'));
    return id != null && registered.has(id);
  });
}

// ─────────────────────────────────────────────────────────────
// Booking filtering
// ─────────────────────────────────────────────────────────────

/**
 * Build a Set of offer-ids that belong to the tenant using live API offer
 * data and, optionally, booking references.
 */
export function collectAgencyOfferIdsFromApi(
  tenant: AdminTenantContext,
  _bookings: unknown[],
  offers: unknown[]
): Set<string> {
  if (isSuperAdmin(tenant.role)) return new Set();
  const ids = new Set<string>();
  for (const offer of offers) {
    if (offerBelongsToTenant(offer, tenant)) {
      const id = normalizeId(extractEntityId(offer, 'id', '_id'));
      if (id) ids.add(id);
    }
  }
  return ids;
}

/**
 * Filter bookings to those whose offer belongs to the tenant.
 * Super admins always receive the full list.
 */
export function filterBookingsForRole(
  bookings: unknown[],
  offers: unknown[],
  role: NormalizedRole,
  tenant: AdminTenantContext
): unknown[] {
  if (isSuperAdmin(role)) return bookings;

  const allowedOfferIds = collectAgencyOfferIdsFromApi(tenant, bookings, offers);
  if (allowedOfferIds.size === 0) return [];

  return bookings.filter((b) => {
    const oid = normalizeId(extractEntityId(b, 'offer_id', 'offerId', 'offer'));
    return oid != null && allowedOfferIds.has(oid);
  });
}

// ─────────────────────────────────────────────────────────────
// Normalisation helpers
// ─────────────────────────────────────────────────────────────

/** Unwrap various API response shapes into a flat booking array. */
export function normalizeBookingsList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.bookings)) return d.bookings;
    if (Array.isArray(d.data)) return d.data;
  }
  return [];
}

/** Unwrap various API response shapes into a flat offer array. */
export function normalizeOffersList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.offers)) return d.offers;
    if (Array.isArray(d.data)) return d.data;
  }
  return [];
}

// ─────────────────────────────────────────────────────────────
// Offer registration (remember newly created offers)
// ─────────────────────────────────────────────────────────────

const CREATED_OFFERS_KEY = '_createdOfferIds';

/**
 * After the admin creates an offer, remember its id in localStorage so
 * we can attribute it to them even if the API response doesn't include
 * ownership fields.
 */
export function registerCreatedOfferResponse(data: unknown): void {
  try {
    const offer =
      (data as any)?.offer ??
      ((data as any)?.data as Record<string, unknown> | undefined)?.offer ??
      (data as any)?.data ??
      data;
    const id = normalizeId(extractEntityId(offer, 'id', '_id'));
    if (!id) return;
    const raw = localStorage.getItem(CREATED_OFFERS_KEY);
    const existing: string[] = raw ? JSON.parse(raw) : [];
    if (!existing.includes(id)) {
      existing.unshift(id);
      localStorage.setItem(CREATED_OFFERS_KEY, JSON.stringify(existing.slice(0, 200)));
    }
  } catch {
    // Storage errors are non-fatal
  }
}

/** Return the set of offer ids the current session has created. */
export function getRegisteredCreatedOfferIds(): Set<string> {
  try {
    const raw = localStorage.getItem(CREATED_OFFERS_KEY);
    return raw ? new Set<string>(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

// ─────────────────────────────────────────────────────────────
// Offer + Bookers join
// ─────────────────────────────────────────────────────────────

/** Extract a human-readable name from a user object. */
function extractUserName(user: unknown): string {
  if (!user || typeof user !== 'object') return 'Unknown';
  const u = user as Record<string, unknown>;
  const full =
    (u.full_name as string | undefined) ??
    (u.fullName as string | undefined);
  if (full?.trim()) return full.trim();
  const first = String(u.firstName ?? u.first_name ?? '').trim();
  const last = String(u.lastName ?? u.last_name ?? '').trim();
  const combined = [first, last].filter(Boolean).join(' ');
  if (combined) return combined;
  return String(u.username ?? u.email ?? 'Unknown').split('@')[0];
}

/** Extract a phone number from a user object. */
function extractUserPhone(user: unknown): string {
  if (!user || typeof user !== 'object') return '—';
  const u = user as Record<string, unknown>;
  return String(u.phone ?? u.phoneNumber ?? u.phone_number ?? '—');
}

/** Extract email from a booking or its inline user. */
function extractEmail(booking: Record<string, unknown>, user: unknown): string {
  const bEmail = booking.customerEmail ?? booking.email;
  if (typeof bEmail === 'string' && bEmail.trim()) return bEmail.trim();
  if (user && typeof user === 'object') {
    const e = (user as Record<string, unknown>).email;
    if (typeof e === 'string' && e.trim()) return e.trim();
  }
  return '—';
}

/**
 * Join an offer list with a booking list.
 * Returns each offer enriched with the list of customers who booked it,
 * sorted by descending booking count.
 *
 * Uses only client-side data — no extra network calls.
 */
export function joinOffersWithBookers(
  offers: unknown[],
  bookings: unknown[]
): OfferWithBookers[] {
  // Build offer-id → bookings map
  const bookingsByOfferId = new Map<string, unknown[]>();
  for (const b of bookings) {
    const offerId = normalizeId(extractEntityId(b, 'offer_id', 'offerId', 'offer'));
    if (!offerId) continue;
    const list = bookingsByOfferId.get(offerId) ?? [];
    list.push(b);
    bookingsByOfferId.set(offerId, list);
  }

  return offers.map((rawOffer) => {
    const offer = rawOffer as Record<string, unknown>;
    const offerId = normalizeId(extractEntityId(offer, 'id', '_id')) ?? '';
    const relatedBookings = bookingsByOfferId.get(offerId) ?? [];

    let totalRevenue = 0;
    const seenCustomers = new Set<string>();

    const bookers: BookerInfo[] = relatedBookings.map((rawBooking) => {
      const b = rawBooking as Record<string, unknown>;

      // Resolve customer from inline user object or fallback fields
      const inlineUser =
        (typeof b.user === 'object' && b.user !== null ? b.user : null) ??
        (typeof b.customer === 'object' && b.customer !== null ? b.customer : null);

      const userId =
        normalizeId(extractEntityId(b, 'user_id', 'userId')) ??
        normalizeId(extractEntityId(inlineUser, 'id', '_id'));

      const name = extractUserName(inlineUser) !== 'Unknown'
        ? extractUserName(inlineUser)
        : String(b.customerName ?? b.full_name ?? b.user_name ?? 'Unknown');

      const email = extractEmail(b, inlineUser);
      const phone = extractUserPhone(inlineUser) !== '—'
        ? extractUserPhone(inlineUser)
        : String(b.customerPhone ?? b.phone ?? '—');

      const gender = String(
        (inlineUser as Record<string, unknown> | null)?.gender ?? b.customerGender ?? b.gender ?? '—'
      );

      const status = String(b.status ?? 'unknown');
      const paymentStatus =
        b.payment_status != null ? String(b.payment_status)
          : b.paymentStatus != null ? String(b.paymentStatus)
          : null;

      const amount = Number(b.total_price ?? b.totalAmount ?? b.amount ?? 0);
      totalRevenue += amount;

      const bId = String(b.id ?? b._id ?? '');
      const bRef =
        String(b.ref ?? b.bookingRef ?? b.booking_ref ?? `BK-${bId.slice(-6).toUpperCase()}`);

      if (userId) seenCustomers.add(userId);

      return {
        bookingId: bId,
        bookingRef: bRef,
        userId,
        name,
        email,
        phone,
        gender,
        status,
        paymentStatus,
        amount,
        depositAmount: Number(b.deposit_amount ?? b.depositAmount ?? 0),
        travelers: Number(b.travelers ?? b.people ?? 1),
        createdAt: String(b.created_at ?? b.createdAt ?? '') || null,
      } satisfies BookerInfo;
    });

    return {
      offer,
      bookers,
      bookingCount: bookers.length,
      totalRevenue,
      uniqueCustomers: seenCustomers.size,
    } satisfies OfferWithBookers;
  }).sort((a, b) => b.bookingCount - a.bookingCount);
}

// ─────────────────────────────────────────────────────────────
// Sync helpers for BookingContext
// ─────────────────────────────────────────────────────────────

/**
 * After fetching bookings, persist any offer-ids we see in the booking
 * list that reference offers owned by the current user (best-effort,
 * uses inline booking.offer data when available).
 */
export function syncRememberedOffersFromBookings(
  bookings: unknown[],
  tenant: AdminTenantContext
): void {
  if (isSuperAdmin(tenant.role)) return;
  try {
    const raw = localStorage.getItem(CREATED_OFFERS_KEY);
    const existing: string[] = raw ? JSON.parse(raw) : [];
    const newIds: string[] = [];

    for (const b of bookings) {
      const booking = b as Record<string, unknown>;
      const offer = booking.offer;
      if (!offer || typeof offer !== 'object') continue;
      if (offerBelongsToTenant(offer, tenant)) {
        const id = normalizeId(extractEntityId(offer, 'id', '_id'));
        if (id && !existing.includes(id) && !newIds.includes(id)) {
          newIds.push(id);
        }
      }
    }

    if (newIds.length > 0) {
      const merged = [...newIds, ...existing].slice(0, 200);
      localStorage.setItem(CREATED_OFFERS_KEY, JSON.stringify(merged));
    }
  } catch {
    // Non-fatal
  }
}

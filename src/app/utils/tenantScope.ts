import { authService } from '../services/authService';
import { getCurrentRole, isSuperAdmin, type NormalizedRole } from './authRole';

const REMEMBERED_OFFERS_KEY = 'buraq_admin_offer_ids_v2';

export interface AdminTenantContext {
  role: NormalizedRole;
  userId: string | null;
  email: string | null;
  /** Agency admin's scoped id for `GET /api/v1/offers/{agencyId}`. Null for super admins. */
  agencyId: string | null;
  identityIds: string[];
  emails: string[];
}

export function normalizeId(id: unknown): string | null {
  if (id == null || id === '') return null;
  const s = String(id).trim().toLowerCase();
  return s.length > 0 ? s : null;
}

function normalizeEmail(email: unknown): string | null {
  if (typeof email !== 'string' || !email.trim()) return null;
  return email.trim().toLowerCase();
}

/** Extract a string id from an object using common key names (supports nested refs). */
export function extractEntityId(obj: unknown, ...keys: string[]): string | null {
  if (!obj || typeof obj !== 'object') return null;
  const record = obj as Record<string, unknown>;
  for (const key of keys) {
    const val = record[key];
    if (val == null || val === '') continue;
    if (typeof val === 'string' && val.trim()) return val.trim();
    if (typeof val === 'number') return String(val);
    if (typeof val === 'object') {
      const nested = val as Record<string, unknown>;
      const id = nested._id ?? nested.id;
      if (id != null && String(id).trim()) return String(id).trim();
    }
  }
  return null;
}

const NESTED_OWNER_KEYS = ['user', 'admin', 'creator', 'agency', 'owner', 'createdBy', 'created_by'];

/** All id-like values on an offer that may indicate ownership (API field names vary). */
export function collectOfferOwnerIds(offer: unknown): string[] {
  if (!offer || typeof offer !== 'object') return [];
  const record = offer as Record<string, unknown>;
  const ids = new Set<string>();

  const scalarKeys = [
    'user_id',
    'userId',
    'admin_id',
    'adminId',
    'created_by',
    'createdBy',
    'owner_id',
    'ownerId',
    'agency_id',
    'agencyId',
    'creator_id',
    'creatorId',
  ];
  for (const key of scalarKeys) {
    const val = record[key];
    if (typeof val === 'string' && !val.includes('@')) {
      const n = normalizeId(val);
      if (n) ids.add(n);
    }
  }

  for (const key of NESTED_OWNER_KEYS) {
    const nested = record[key];
    if (nested && typeof nested === 'object') {
      const nestedId = extractEntityId(nested, 'id', '_id', 'user_id', 'userId');
      const n = normalizeId(nestedId);
      if (n) ids.add(n);
    }
  }

  return [...ids];
}

export function collectOfferOwnerEmails(offer: unknown): string[] {
  if (!offer || typeof offer !== 'object') return [];
  const record = offer as Record<string, unknown>;
  const emails = new Set<string>();
  const add = (val: unknown) => {
    const e = normalizeEmail(val);
    if (e) emails.add(e);
  };

  const scalarEmailKeys = [
    'email',
    'admin_email',
    'adminEmail',
    'creator_email',
    'user_email',
    'owner_email',
    'created_by_email',
  ];
  for (const key of scalarEmailKeys) {
    add(record[key]);
  }

  const createdBy = record.created_by ?? record.createdBy;
  if (typeof createdBy === 'string' && createdBy.includes('@')) {
    add(createdBy);
  }

  for (const key of NESTED_OWNER_KEYS) {
    const nested = record[key];
    if (nested && typeof nested === 'object') {
      add((nested as Record<string, unknown>).email);
    }
  }

  return [...emails];
}

/** User id from JWT (often matches offer.user_id in DB even when API omits it on list). */
export function getIdentityFromJwt(): string[] {
  const token = localStorage.getItem('token');
  if (!token) return [];
  try {
    const parts = token.split('.');
    if (parts.length < 2) return [];
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))) as Record<
      string,
      unknown
    >;
    const ids = new Set<string>();
    const add = (v: unknown) => {
      const n = normalizeId(v);
      if (n) ids.add(n);
    };
    add(payload.sub);
    add(payload.id);
    add(payload.userId);
    add(payload.user_id);
    const user = payload.user;
    if (user && typeof user === 'object') {
      add(extractEntityId(user, 'id', '_id', 'sub'));
    }
    return [...ids];
  } catch {
    return [];
  }
}

/** Logged-in admin identity (ids + emails from profile / OTP session). */
export function collectCurrentIdentityIds(user?: unknown): string[] {
  const root = user ?? authService.getStoredUser();
  const ids = new Set<string>();
  const add = (val: unknown) => {
    const n = normalizeId(val);
    if (n) ids.add(n);
  };

  getIdentityFromJwt().forEach(add);

  if (root && typeof root === 'object') {
    const record = root as Record<string, unknown>;
    add(extractEntityId(record, 'id', '_id', 'userId', 'sub', 'uuid'));
    add(record.sub);
    add(record.uuid);

    const nestedSources = [record.user, record.data, record.profile];
    for (const src of nestedSources) {
      if (src && typeof src === 'object') {
        add(extractEntityId(src, 'id', '_id', 'userId', 'sub'));
      }
    }

    const remembered = (record as { _identityIds?: string[] })._identityIds;
    if (Array.isArray(remembered)) {
      remembered.forEach(add);
    }
  }

  return [...ids];
}

export function collectCurrentIdentityEmails(user?: unknown): string[] {
  const root = user ?? authService.getStoredUser();
  if (!root || typeof root !== 'object') return [];

  const emails = new Set<string>();
  const add = (val: unknown) => {
    const e = normalizeEmail(val);
    if (e) emails.add(e);
  };

  const record = root as Record<string, unknown>;
  add(record.email);
  if (record.user && typeof record.user === 'object') {
    add((record.user as Record<string, unknown>).email);
  }
  if (record.data && typeof record.data === 'object') {
    add((record.data as Record<string, unknown>).email);
  }

  const remembered = (record as { _identityEmails?: string[] })._identityEmails;
  if (Array.isArray(remembered)) {
    remembered.forEach(add);
  }

  return [...emails];
}

export function getCurrentUserId(): string | null {
  return collectCurrentIdentityIds()[0] ?? null;
}

export function getCurrentUserEmail(): string | null {
  return collectCurrentIdentityEmails()[0] ?? null;
}

/** Call after login with the email used on the sign-in form (e.g. andrewsamuel964@gmail.com). */
export function persistLoginEmail(loginEmail: string) {
  const e = normalizeEmail(loginEmail);
  if (!e) return;
  const user = authService.getStoredUser() || {};
  persistUserIdentity({
    ...(user as Record<string, unknown>),
    email: e,
  });
}

function rememberedStorageKeys(identityIds: string[], emails: string[]): string[] {
  const keys = new Set<string>();
  identityIds.forEach((id) => {
    const n = normalizeId(id);
    if (n) keys.add(`id:${n}`);
  });
  emails.forEach((e) => {
    const n = normalizeEmail(e);
    if (n) keys.add(`email:${n}`);
  });
  return [...keys];
}

function loadRememberedOffersMap(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(REMEMBERED_OFFERS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string[]>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveRememberedOffersMap(map: Record<string, string[]>) {
  localStorage.setItem(REMEMBERED_OFFERS_KEY, JSON.stringify(map));
}

/** Persist offer ids created by this admin (keyed by user id and email). */
export function rememberOfferForCurrentUser(offerId: string) {
  if (!offerId) return;
  const n = normalizeId(offerId);
  if (!n) return;

  const identityIds = collectCurrentIdentityIds();
  const emails = collectCurrentIdentityEmails();
  const keys = rememberedStorageKeys(identityIds, emails);
  if (keys.length === 0) return;

  const map = loadRememberedOffersMap();
  for (const key of keys) {
    const list = map[key] ?? [];
    if (!list.includes(n)) {
      map[key] = [...list, n];
    }
  }
  saveRememberedOffersMap(map);
}

export function getRememberedOfferIds(identityIds?: string[], emails?: string[]): Set<string> {
  const ids = identityIds ?? collectCurrentIdentityIds();
  const em = emails ?? collectCurrentIdentityEmails();
  const keys = rememberedStorageKeys(ids, em);
  const map = loadRememberedOffersMap();
  const result = new Set<string>();
  for (const key of keys) {
    (map[key] ?? []).forEach((oid) => {
      const n = normalizeId(oid);
      if (n) result.add(n);
    });
  }
  return result;
}

function persistUserIdentity(user: Record<string, unknown>) {
  const existing = authService.getStoredUser() || {};
  const identityIds = new Set([
    ...collectCurrentIdentityIds(existing),
    ...collectCurrentIdentityIds(user),
  ]);
  const identityEmails = new Set([
    ...collectCurrentIdentityEmails(existing),
    ...collectCurrentIdentityEmails(user),
  ]);
  const id = [...identityIds][0] ?? extractEntityId(user, 'id', '_id');
  const email = [...identityEmails][0] ?? normalizeEmail(user.email);

  localStorage.setItem(
    'user',
    JSON.stringify({
      ...existing,
      ...user,
      ...(id ? { id: (user.id as string) || (user._id as string) || id } : {}),
      ...(email ? { email } : {}),
      _identityIds: [...identityIds],
      _identityEmails: [...identityEmails],
    })
  );
}

export function extractCreatedOfferId(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const root = data as Record<string, unknown>;
  const candidates: unknown[] = [
    root.offer,
    (root.data as Record<string, unknown> | undefined)?.offer,
    root.data,
    root,
  ];
  for (const c of candidates) {
    const id = extractEntityId(c, 'id', '_id');
    if (id) return id;
  }
  return null;
}

/** Learn offer ids from this admin's bookings (API list has no user_id on offers). */
export function syncRememberedOffersFromBookings(
  bookings: unknown[],
  tenant?: Partial<AdminTenantContext>
) {
  const identityIds = tenant?.identityIds ?? collectCurrentIdentityIds();
  const emails = tenant?.emails ?? collectCurrentIdentityEmails();
  const keys = rememberedStorageKeys(identityIds, emails);
  if (keys.length === 0) return;

  const map = loadRememberedOffersMap();
  let changed = false;

  for (const b of bookings) {
    const oid = normalizeId(extractEntityId(b, 'offer_id', 'offerId', 'offer'));
    if (!oid) continue;
    for (const key of keys) {
      const list = map[key] ?? [];
      if (!list.includes(oid)) {
        map[key] = [...list, oid];
        changed = true;
      }
    }
  }

  if (changed) saveRememberedOffersMap(map);
}

/** Offer ids this agency admin is allowed to see (registry + bookings + API owner fields if any). */
export function collectAllowedOfferIds(
  tenant: AdminTenantContext,
  bookings: unknown[],
  offers: unknown[]
): Set<string> {
  const allowed = new Set<string>();

  getRememberedOfferIds(tenant.identityIds, tenant.emails).forEach((id) => allowed.add(id));

  for (const o of offers) {
    if (offerBelongsToTenant(o, tenant)) {
      const oid = normalizeId(extractEntityId(o, 'id', '_id'));
      if (oid) allowed.add(oid);
    }
  }

  return allowed;
}

/**
 * Filter offers for agency admin. The public offers API does not return user_id on each row,
 * so we match via local registry (creates) + booking offer_ids + optional owner fields.
 */
export function filterOffersForAdmin(
  offers: unknown[],
  tenant: AdminTenantContext,
  bookings: unknown[] = []
): unknown[] {
  const allowed = collectAllowedOfferIds(tenant, bookings, offers);

  if (allowed.size === 0) {
    return [];
  }

  return offers.filter((o) => {
    const oid = normalizeId(extractEntityId(o, 'id', '_id'));
    return oid != null && allowed.has(oid);
  });
}

/** Parse POST /offers response and register ownership hints. */
export function registerCreatedOfferResponse(data: unknown) {
  if (!data || typeof data !== 'object') return;
  const root = data as Record<string, unknown>;
  const offer =
    (root.offer as Record<string, unknown> | undefined) ||
    (root.data as Record<string, unknown> | undefined)?.offer ||
    (root.data as Record<string, unknown> | undefined) ||
    root;

  const offerId = extractCreatedOfferId(data);
  if (offerId) rememberOfferForCurrentUser(offerId);

  const ownerIds = collectOfferOwnerIds(offer);
  const ownerEmails = collectOfferOwnerEmails(offer);
  if (ownerIds.length > 0 || ownerEmails.length > 0) {
    const user = authService.getStoredUser() || {};
    persistUserIdentity({
      ...user,
      _identityIds: [...new Set([...collectCurrentIdentityIds(user), ...ownerIds])],
      _identityEmails: [...new Set([...collectCurrentIdentityEmails(user), ...ownerEmails])],
    });
  }
}

/** Load profile and cache id + email (e.g. andrewsamuel964@gmail.com) for strict filtering. */
export async function resolveCurrentUserId(): Promise<string | null> {
  try {
    const profile = await authService.getCurrentUser();
    const user =
      (profile as { user?: Record<string, unknown> })?.user ||
      (profile as { data?: { user?: Record<string, unknown> } })?.data?.user ||
      (profile as { data?: Record<string, unknown> })?.data ||
      profile;
    if (user && typeof user === 'object') {
      persistUserIdentity(user as Record<string, unknown>);
      return getCurrentUserId();
    }
  } catch {
    /* fall back to stored user */
  }
  return getCurrentUserId();
}

/**
 * Session-level cache: the very first call resolves the user profile from the
 * network; every subsequent call returns the cached result instantly (0 network).
 * Call `invalidateAdminTenantCache()` after login/logout to reset.
 */
let _tenantPromise: Promise<AdminTenantContext> | null = null;

export function invalidateAdminTenantCache() {
  _tenantPromise = null;
}

export async function resolveAdminTenant(): Promise<AdminTenantContext> {
  if (_tenantPromise) return _tenantPromise;

  _tenantPromise = (async () => {
    await resolveCurrentUserId();
    const role = getCurrentRole();
    const identityIds = collectCurrentIdentityIds();
    const emails = collectCurrentIdentityEmails();
    return {
      role,
      userId: identityIds[0] ?? null,
      email: emails[0] ?? null,
      agencyId: isSuperAdmin(role) ? null : (identityIds[0] ?? null),
      identityIds,
      emails,
    };
  })();

  return _tenantPromise;
}

export function getOfferOwnerId(offer: unknown): string | null {
  return collectOfferOwnerIds(offer)[0] ?? null;
}

/**
 * True if this offer belongs to the logged-in agency admin.
 * Matches by creator user/admin id OR creator email (e.g. andrewsamuel964@gmail.com).
 */
export function offerBelongsToTenant(
  offer: unknown,
  tenant: Pick<AdminTenantContext, 'identityIds' | 'emails'>
): boolean {
  const identitySet = new Set(
    tenant.identityIds.map((id) => normalizeId(id)).filter(Boolean) as string[]
  );
  const emailSet = new Set(
    tenant.emails.map((e) => normalizeEmail(e)).filter(Boolean) as string[]
  );

  const ownerIds = collectOfferOwnerIds(offer);
  if (ownerIds.length > 0 && identitySet.size > 0) {
    if (ownerIds.some((oid) => identitySet.has(oid))) return true;
  }

  const ownerEmails = collectOfferOwnerEmails(offer);
  if (ownerEmails.length > 0 && emailSet.size > 0) {
    if (ownerEmails.some((e) => emailSet.has(e))) return true;
  }

  // Offers with no owner fields are super admin platform offers.
  // Agency admins must NOT see them — only super admin has access.
  return false;
}

export function offerMatchesIdentity(offer: unknown, identityIds: string[]): boolean {
  return offerBelongsToTenant(offer, {
    identityIds,
    emails: collectCurrentIdentityEmails(),
  });
}

export function ownsOffer(offer: unknown, userId: string | null): boolean {
  if (!userId) return false;
  const identityIds = [...collectCurrentIdentityIds()];
  const n = normalizeId(userId);
  if (n && !identityIds.includes(n)) identityIds.push(n);
  return offerMatchesIdentity(offer, identityIds);
}

/**
 * Agency admin: only their offers. Super admin: all offers.
 * @deprecated Prefer filterOffersForAdmin with bookings when loading dashboard offers.
 */
export function filterOffersForRole(
  offers: unknown[],
  role?: NormalizedRole,
  tenant?: Partial<AdminTenantContext>
): unknown[] {
  const r = role ?? tenant?.role ?? getCurrentRole();
  if (isSuperAdmin(r)) return offers;

  const identityIds = tenant?.identityIds ?? collectCurrentIdentityIds();
  const emails = tenant?.emails ?? collectCurrentIdentityEmails();
  const ctx: AdminTenantContext = {
    role: r,
    userId: tenant?.userId ?? identityIds[0] ?? null,
    email: tenant?.email ?? emails[0] ?? null,
    identityIds,
    emails,
  };

  return filterOffersForAdmin(offers, ctx, []);
}

function buildTenantContext(
  role?: NormalizedRole,
  tenant?: Partial<AdminTenantContext>
): AdminTenantContext {
  const r = role ?? tenant?.role ?? getCurrentRole();
  const identityIds = tenant?.identityIds ?? collectCurrentIdentityIds();
  const emails = tenant?.emails ?? collectCurrentIdentityEmails();
  return {
    role: r,
    userId: tenant?.userId ?? identityIds[0] ?? null,
    email: tenant?.email ?? emails[0] ?? null,
    agencyId: tenant?.agencyId ?? (isSuperAdmin(r) ? null : (identityIds[0] ?? null)),
    identityIds,
    emails,
  };
}

/** Offer ids this agency admin may use for booking scoping. */
export function getMyOfferIds(
  offers: unknown[],
  role?: NormalizedRole,
  tenant?: Partial<AdminTenantContext>,
  bookings: unknown[] = []
): Set<string> {
  const ctx = buildTenantContext(role, tenant);
  if (isSuperAdmin(ctx.role)) {
    const ids = new Set<string>();
    for (const o of offers) {
      const id = normalizeId(extractEntityId(o, 'id', '_id'));
      if (id) ids.add(id);
    }
    return ids;
  }
  return collectAllowedOfferIds(ctx, bookings, offers);
}

/** Agency admin: only bookings whose offer_id belongs to this admin. Super admin: all. */
export function filterBookingsForRole(
  bookings: unknown[],
  offers: unknown[],
  role?: NormalizedRole,
  tenant?: Partial<AdminTenantContext>
): unknown[] {
  const ctx = buildTenantContext(role, tenant);
  if (isSuperAdmin(ctx.role)) return bookings;

  const allowedOfferIds = collectAllowedOfferIds(ctx, bookings, offers);
  if (allowedOfferIds.size === 0) return [];

  return bookings.filter((b) => {
    const oid = normalizeId(extractEntityId(b, 'offer_id', 'offerId', 'offer'));
    return oid != null && allowedOfferIds.has(oid);
  });
}

export function normalizeOffersList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.offers)) return d.offers;
    if (Array.isArray(d.data)) return d.data;
    const nested = d.data as Record<string, unknown> | undefined;
    if (nested && Array.isArray(nested.offers)) return nested.offers;
  }
  return [];
}

export function normalizeBookingsList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.bookings)) return d.bookings;
    if (Array.isArray(d.data)) return d.data;
    const nested = d.data as Record<string, unknown> | undefined;
    if (nested && Array.isArray(nested.bookings)) return nested.bookings;
  }
  return [];
}

import api from './api';
import { isSuperAdmin } from '../utils/authRole';
import {
  collectAgencyOfferIdsFromApi,
  collectOfferOwnerIds,
  extractEntityId,
  normalizeId,
  normalizeBookingsList,
  normalizeOffersList,
  type AdminTenantContext,
} from '../utils/tenantScope';

const OFFERS_ENDPOINT = import.meta.env.VITE_API_OFFERS_ENDPOINT || '/api/v1/offers';
const FETCH_CONCURRENCY = 5;

async function fetchOfferDetail(offerId: string): Promise<unknown | null> {
  try {
    const response = await api.get(`${OFFERS_ENDPOINT}/${offerId}`);
    const data = response.data;
    if (!data || typeof data !== 'object') return data;
    const root = data as Record<string, unknown>;
    return root.offer ?? (root.data as Record<string, unknown> | undefined)?.offer ?? root.data ?? root;
  } catch {
    return null;
  }
}

function mergeOffersById(existing: unknown[], incoming: unknown[]): unknown[] {
  const byId = new Map<string, unknown>();
  for (const o of existing) {
    const id = normalizeId(extractEntityId(o, 'id', '_id'));
    if (id) byId.set(id, o);
  }
  for (const o of incoming) {
    const id = normalizeId(extractEntityId(o, 'id', '_id'));
    if (id) byId.set(id, o);
  }
  return [...byId.values()];
}

async function enrichOffersWithApiOwnership(
  offers: unknown[],
  offerIdsHint: Set<string>
): Promise<unknown[]> {
  const byId = new Map<string, unknown>();
  for (const o of offers) {
    const id = normalizeId(extractEntityId(o, 'id', '_id'));
    if (id) byId.set(id, o);
  }

  const idsToFetch: string[] = [];
  for (const id of offerIdsHint) {
    const existing = byId.get(id);
    if (!existing) {
      idsToFetch.push(id);
      continue;
    }
    if (collectOfferOwnerIds(existing).length === 0) {
      idsToFetch.push(id);
    }
  }

  const fetched: unknown[] = [];
  for (let i = 0; i < idsToFetch.length; i += FETCH_CONCURRENCY) {
    const batch = idsToFetch.slice(i, i + FETCH_CONCURRENCY);
    const results = await Promise.all(batch.map(fetchOfferDetail));
    results.forEach((detail) => {
      if (detail) fetched.push(detail);
    });
  }

  return mergeOffersById(offers, fetched);
}

function collectOfferIdsFromBookings(bookings: unknown[]): Set<string> {
  const ids = new Set<string>();
  for (const b of bookings) {
    const oid = normalizeId(extractEntityId(b, 'offer_id', 'offerId', 'offer'));
    if (oid) ids.add(oid);
  }
  return ids;
}

function filterByAllowedOfferIds<T>(
  rows: T[],
  allowedOfferIds: Set<string>,
  getOfferId: (row: T) => string | null
): T[] {
  if (allowedOfferIds.size === 0) return [];
  return rows.filter((row) => {
    const oid = getOfferId(row);
    return oid != null && allowedOfferIds.has(oid);
  });
}

export interface AgencyScopeResult {
  bookings: unknown[];
  offers: unknown[];
  allowedOfferIds: Set<string>;
}

/** Scope bookings and offers to the logged-in agency admin using live API data only. */
export async function resolveAgencyScope(
  tenant: AdminTenantContext,
  rawBookings: unknown[],
  rawOffers: unknown[]
): Promise<AgencyScopeResult> {
  if (isSuperAdmin(tenant.role)) {
    return { bookings: rawBookings, offers: rawOffers, allowedOfferIds: new Set() };
  }

  const offerIdsHint = collectOfferIdsFromBookings(rawBookings);
  for (const o of rawOffers) {
    const id = normalizeId(extractEntityId(o, 'id', '_id'));
    if (id) offerIdsHint.add(id);
  }

  const enrichedOffers = await enrichOffersWithApiOwnership(rawOffers, offerIdsHint);
  const allowedOfferIds = collectAgencyOfferIdsFromApi(tenant, rawBookings, enrichedOffers);

  const bookings = filterByAllowedOfferIds(rawBookings, allowedOfferIds, (b) =>
    normalizeId(extractEntityId(b, 'offer_id', 'offerId', 'offer'))
  );

  const offers = filterByAllowedOfferIds(enrichedOffers, allowedOfferIds, (o) =>
    normalizeId(extractEntityId(o, 'id', '_id'))
  );

  return { bookings, offers, allowedOfferIds };
}

export { normalizeBookingsList, normalizeOffersList };

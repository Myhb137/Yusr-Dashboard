import api from './api';
import { Offer } from '../types/api';
import { isSuperAdmin } from '../utils/authRole';
import {
  normalizeOffersList,
  registerCreatedOfferResponse,
  resolveAdminTenant,
  filterOffersForAdmin,
  type AdminTenantContext,
} from '../utils/tenantScope';

const OFFERS_ENDPOINT = import.meta.env.VITE_API_OFFERS_ENDPOINT || '/api/v1/offers';

export type OfferType = 'standard' | 'custom' | 'special' | 'activity';

export interface OfferCreateInput {
  title: string;
  location: string;
  type: OfferType;
  description?: string;
  duration?: string;
  places?: number;
  available?: boolean;
  image_url?: string;
  total_price?: number;
  currency?: string;
  amenities?: string[];
  itinerary?: string[];
}

export interface CreateOfferOptions {
  /** When set, POST multipart/form-data with `image` (Supabase upload on server). */
  imageFile?: File;
}

function appendFormField(fd: FormData, key: string, value: unknown) {
  if (value === undefined || value === null || value === '') return;
  if (typeof value === 'boolean') {
    fd.append(key, value ? 'true' : 'false');
    return;
  }
  if (Array.isArray(value)) {
    fd.append(key, JSON.stringify(value));
    return;
  }
  fd.append(key, String(value));
}

/** Map UI/modal fields to Swagger OfferCreate (JSON or multipart). */
export function buildOfferCreateBody(raw: Record<string, unknown>): OfferCreateInput {
  const title = String(raw.title ?? raw.name ?? '').trim();
  const location = String(raw.location ?? raw.destination ?? '').trim();
  const type = (raw.type as OfferType) || 'standard';

  const body: OfferCreateInput = { title, location, type };

  const description = raw.description;
  if (description != null && String(description).trim()) {
    body.description = String(description).trim();
  }

  const duration = raw.duration;
  if (duration != null && String(duration).trim()) {
    body.duration = String(duration).trim();
  }

  const places = raw.places ?? raw.maxPeople;
  if (places != null && places !== '') {
    const n = Number(places);
    if (!Number.isNaN(n) && n > 0) body.places = Math.floor(n);
  }

  if (typeof raw.available === 'boolean') {
    body.available = raw.available;
  } else if (raw.status != null) {
    body.available = raw.status === 'active';
  }

  const imageUrl = raw.image_url ?? raw.imageUrl ?? raw.image;
  if (imageUrl != null && String(imageUrl).trim()) {
    body.image_url = String(imageUrl).trim();
  }

  const price = raw.total_price ?? raw.price;
  if (price != null && price !== '') {
    const n = Number(String(price).replace(/[^\d.]/g, ''));
    if (!Number.isNaN(n)) body.total_price = n;
  }

  if (raw.currency) body.currency = String(raw.currency);

  if (Array.isArray(raw.amenities)) {
    body.amenities = raw.amenities.filter((a) => String(a).trim());
  }

  if (Array.isArray(raw.itinerary)) {
    body.itinerary = raw.itinerary.map((i) => String(i)).filter(Boolean);
  }

  return body;
}

function buildOfferFormData(
  body: OfferCreateInput,
  imageFile?: File,
  ownerUserId?: string | null
): FormData {
  const fd = new FormData();
  if (ownerUserId) {
    appendFormField(fd, 'user_id', ownerUserId);
    appendFormField(fd, 'admin_id', ownerUserId);
  }
  appendFormField(fd, 'title', body.title);
  appendFormField(fd, 'location', body.location);
  appendFormField(fd, 'type', body.type);
  appendFormField(fd, 'description', body.description);
  appendFormField(fd, 'duration', body.duration);
  appendFormField(fd, 'places', body.places);
  appendFormField(fd, 'available', body.available);
  appendFormField(fd, 'total_price', body.total_price);
  appendFormField(fd, 'currency', body.currency);
  appendFormField(fd, 'amenities', body.amenities);
  appendFormField(fd, 'itinerary', body.itinerary);
  if (imageFile) {
    fd.append('image', imageFile);
  } else if (body.image_url) {
    appendFormField(fd, 'image_url', body.image_url);
  }
  return fd;
}

export const offerService = {
  getAllOffers: async (): Promise<Offer[]> => {
    const response = await api.get(OFFERS_ENDPOINT);
    const data = response.data;
    return Array.isArray(data) ? data : (data?.offers || data?.data || []);
  },

  /** Offers scoped to the logged-in agency admin; super admin sees all. */
  getDashboardOffers: async (
    tenant?: AdminTenantContext,
    bookingsHint?: unknown[]
  ): Promise<Offer[]> => {
    const scope = tenant ?? (await resolveAdminTenant());

    // Fetch from global endpoint because backend currently lacks an agency scoping endpoint
    const response = await api.get(OFFERS_ENDPOINT);
    const allOffers = normalizeOffersList(response.data);

    if (isSuperAdmin(scope.role)) {
      return allOffers as Offer[];
    }

    // Agency admin: filter client-side until backend implements /api/v1/offers/agency/{id}
    return filterOffersForAdmin(allOffers, scope, bookingsHint) as Offer[];
  },

  getOfferDetails: async (id: string): Promise<Offer> => {
    const response = await api.get(`${OFFERS_ENDPOINT}/${id}`);
    return response.data;
  },

  createOffer: async (offerData: Record<string, unknown>, options?: CreateOfferOptions) => {
    const body = buildOfferCreateBody(offerData);
    if (!body.title || !body.location || !body.type) {
      throw new Error('Title, destination, and type are required.');
    }

    const tenant = await resolveAdminTenant();
    const ownerId = tenant.userId || tenant.identityIds[0] || null;
    const payload: Record<string, unknown> = { ...body };
    if (ownerId && !isSuperAdmin(tenant.role)) {
      payload.user_id = ownerId;
      payload.admin_id = ownerId;
    }

    if (options?.imageFile) {
      const fd = buildOfferFormData(body, options.imageFile, ownerId);
      const response = await api.post(OFFERS_ENDPOINT, fd);
      registerCreatedOfferResponse(response.data);
      return response.data;
    }

    const response = await api.post(OFFERS_ENDPOINT, payload);
    registerCreatedOfferResponse(response.data);
    return response.data;
  },

  updateOffer: async (
    id: string,
    offerData: Record<string, unknown>,
    options?: CreateOfferOptions
  ) => {
    const body = buildOfferCreateBody(offerData);

    if (options?.imageFile) {
      const fd = buildOfferFormData(body, options.imageFile);
      const response = await api.put(`${OFFERS_ENDPOINT}/${id}`, fd);
      return response.data;
    }

    const response = await api.put(`${OFFERS_ENDPOINT}/${id}`, body);
    return response.data;
  },

  deleteOffer: async (id: string) => {
    const response = await api.delete(`${OFFERS_ENDPOINT}/${id}`);
    return response.data;
  },

  addOfferTag: async (id: string, tag: string) => {
    const response = await api.post(`${OFFERS_ENDPOINT}/${id}/tags`, { tag });
    return response.data;
  },

  addOfferReview: async (id: string, reviewData: any) => {
    const response = await api.post(`${OFFERS_ENDPOINT}/${id}/reviews`, reviewData);
    return response.data;
  },

  getOfferReviews: async (id: string) => {
    const response = await api.get(`${OFFERS_ENDPOINT}/${id}/reviews`);
    return response.data;
  },
};

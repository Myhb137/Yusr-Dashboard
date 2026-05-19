import api from './api';
import { Offer } from '../types/api';

const OFFERS_ENDPOINT = import.meta.env.VITE_API_OFFERS_ENDPOINT || '/api/v1/offers';

export const offerService = {
  getAllOffers: async (): Promise<Offer[]> => {
    const response = await api.get(OFFERS_ENDPOINT);
    const data = response.data;
    return Array.isArray(data) ? data : (data?.offers || data?.data || []);
  },

  getOfferDetails: async (id: string): Promise<Offer> => {
    const response = await api.get(`${OFFERS_ENDPOINT}/${id}`);
    return response.data;
  },

  createOffer: async (offerData: any) => {
    const response = await api.post(OFFERS_ENDPOINT, offerData);
    return response.data;
  },

  updateOffer: async (id: string, offerData: any) => {
    const response = await api.put(`${OFFERS_ENDPOINT}/${id}`, offerData);
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

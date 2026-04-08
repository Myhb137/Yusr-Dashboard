import api from './api';

const OFFERS_ENDPOINT = import.meta.env.VITE_API_OFFERS_ENDPOINT || '/api/v1/offers';

export const offerService = {
  getAllOffers: async () => {
    const response = await api.get(OFFERS_ENDPOINT);
    return response.data;
  },

  getOfferDetails: async (id: string) => {
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

  addOfferTags: async (id: string, tags: string[]) => {
    const response = await api.post(`${OFFERS_ENDPOINT}/${id}/tags`, { tags });
    return response.data;
  },
};

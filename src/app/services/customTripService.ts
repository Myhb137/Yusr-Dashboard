import api from './api';
import type { ApiSuccess, CustomTrip } from '../types/api';

export const customTripService = {
  /** GET /api/v1/custom-trips */
  async getAllCustomTrips(): Promise<CustomTrip[]> {
    const response = await api.get<ApiSuccess<CustomTrip[]>>('/api/v1/custom-trips');
    return response.data.data || [];
  },

  /** GET /api/v1/custom-trips/my */
  async getMyCustomTrips(): Promise<CustomTrip[]> {
    const response = await api.get<ApiSuccess<CustomTrip[]>>('/api/v1/custom-trips/my');
    return response.data.data || [];
  },

  /** PATCH /api/v1/custom-trips/{id}/status */
  async updateStatus(id: string, status: string): Promise<CustomTrip> {
    const response = await api.patch<ApiSuccess<CustomTrip>>(`/api/v1/custom-trips/${id}/status`, { status });
    return response.data.data as CustomTrip;
  },
};

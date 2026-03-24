import api from "./api";
import type { Venue, VenueListItem, PaginatedResponse } from "../types";

export interface VenueFilters {
  city?: string;
  sport?: string;
  page?: number;
}

export const venuesService = {
  async getVenues(filters?: VenueFilters): Promise<PaginatedResponse<VenueListItem>> {
    const { data } = await api.get<PaginatedResponse<VenueListItem>>("/venues/", {
      params: filters,
    });
    return data;
  },

  async getVenue(id: string): Promise<Venue> {
    const { data } = await api.get<Venue>(`/venues/${id}/`);
    return data;
  },
};

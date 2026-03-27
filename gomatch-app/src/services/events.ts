import api from "./api";
import type {
  EventDetail,
  EventListItem,
  EventRegistration,
  PaginatedResponse,
} from "../types";

export const eventsService = {
  async getEvents(params?: Record<string, string>): Promise<PaginatedResponse<EventListItem>> {
    const { data } = await api.get<PaginatedResponse<EventListItem>>("/events/", { params });
    return data;
  },

  async getFeaturedEvents(): Promise<EventListItem[]> {
    const { data } = await api.get<PaginatedResponse<EventListItem>>("/events/?status=upcoming");
    return data.results.filter((e) => e.is_featured);
  },

  async getEvent(id: string): Promise<EventDetail> {
    const { data } = await api.get<EventDetail>(`/events/${id}/`);
    return data;
  },

  async register(eventId: string, partnerId?: string): Promise<EventRegistration> {
    const { data } = await api.post<EventRegistration>(
      `/events/${eventId}/register/`,
      partnerId ? { partner_id: partnerId } : {},
    );
    return data;
  },

  async cancelRegistration(eventId: string): Promise<EventRegistration> {
    const { data } = await api.post<EventRegistration>(
      `/events/${eventId}/cancel-registration/`,
    );
    return data;
  },

  async getMyRegistrations(): Promise<EventRegistration[]> {
    const { data } = await api.get<EventRegistration[]>("/events/my/");
    return data;
  },
};

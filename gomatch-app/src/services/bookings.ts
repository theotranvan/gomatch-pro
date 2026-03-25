import api from "./api";
import type { TimeSlot, Booking, PaginatedResponse } from "../types";

export const bookingsService = {
  async getSlots(venueId: string, courtId: string, date: string): Promise<TimeSlot[]> {
    const { data } = await api.get<PaginatedResponse<TimeSlot>>(
      `/venues/${venueId}/courts/${courtId}/slots/`,
      { params: { date } },
    );
    return data.results;
  },

  async holdSlot(courtId: string, slotId: string): Promise<void> {
    await api.post(`/venues/courts/${courtId}/slots/hold/`, { slot_id: slotId });
  },

  async createBooking(timeSlotId: string, matchId?: string): Promise<Booking> {
    const body: Record<string, string> = { time_slot_id: timeSlotId };
    if (matchId) body.match_id = matchId;
    const { data } = await api.post<Booking>("/bookings/", body);
    return data;
  },

  async getMyBookings(): Promise<PaginatedResponse<Booking>> {
    const { data } = await api.get<PaginatedResponse<Booking>>("/bookings/my/");
    return data;
  },

  async getBookingDetail(id: string): Promise<Booking> {
    const { data } = await api.get<Booking>(`/bookings/${id}/`);
    return data;
  },

  async cancelBooking(id: string): Promise<Booking> {
    const { data } = await api.post<Booking>(`/bookings/${id}/cancel/`);
    return data;
  },
};

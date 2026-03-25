import api from "./api";
import type {
  Tournament,
  TournamentListItem,
  PaginatedResponse,
  Sport,
  TournamentStatus,
  PlayerProfile,
} from "../types";

export interface TournamentFilters {
  sport?: Sport;
  status?: TournamentStatus;
  page?: number;
}

export const tournamentsService = {
  async getTournaments(
    filters?: TournamentFilters
  ): Promise<PaginatedResponse<TournamentListItem>> {
    const { data } = await api.get<PaginatedResponse<TournamentListItem>>(
      "/tournaments/",
      { params: filters }
    );
    return data;
  },

  async getTournament(id: string): Promise<Tournament> {
    const { data } = await api.get<Tournament>(`/tournaments/${id}/`);
    return data;
  },

  async register(
    tournamentId: string,
    partnerId?: string
  ): Promise<{ detail: string; participant_id: string }> {
    const { data } = await api.post(`/tournaments/${tournamentId}/register/`, {
      partner_id: partnerId || null,
    });
    return data;
  },

  async searchPlayers(
    search: string
  ): Promise<PaginatedResponse<PlayerProfile>> {
    const { data } = await api.get<PaginatedResponse<PlayerProfile>>(
      "/players/",
      { params: { search } }
    );
    return data;
  },
};

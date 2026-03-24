import api from "./api";
import type {
  Match,
  MatchListItem,
  PaginatedResponse,
  Sport,
  MatchType,
  PlayMode,
  MatchStatus,
} from "../types";

export interface MatchFilters {
  sport?: Sport;
  match_type?: MatchType;
  play_mode?: PlayMode;
  status?: MatchStatus;
  page?: number;
}

export interface CreateMatchData {
  sport: Sport;
  match_type: MatchType;
  play_mode: PlayMode;
  scheduled_date: string;
  scheduled_time: string;
  max_participants?: number;
}

export const matchesService = {
  async getMatches(filters?: MatchFilters): Promise<PaginatedResponse<MatchListItem>> {
    const { data } = await api.get<PaginatedResponse<MatchListItem>>("/matches/", {
      params: filters,
    });
    return data;
  },

  async getMatch(id: string): Promise<Match> {
    const { data } = await api.get<Match>(`/matches/${id}/`);
    return data;
  },

  async createMatch(matchData: CreateMatchData): Promise<Match> {
    const { data } = await api.post<Match>("/matches/create/", matchData);
    return data;
  },

  async joinMatch(id: string): Promise<void> {
    await api.post(`/matches/${id}/join/`);
  },

  async getMyMatches(): Promise<PaginatedResponse<MatchListItem>> {
    const { data } = await api.get<PaginatedResponse<MatchListItem>>("/matches/my/");
    return data;
  },
};

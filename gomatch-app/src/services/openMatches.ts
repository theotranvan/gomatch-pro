import api from "./api";
import type {
  OpenMatch,
  OpenMatchListItem,
  PaginatedResponse,
  Sport,
  MatchType,
  PlayMode,
  SkillLevel,
} from "../types";

export interface OpenMatchFilters {
  sport?: Sport;
  match_type?: MatchType;
  play_mode?: PlayMode;
  required_level_min?: SkillLevel;
  required_level_max?: SkillLevel;
  page?: number;
}

export interface CreateOpenMatchData {
  sport: Sport;
  match_type: MatchType;
  play_mode: PlayMode;
  scheduled_date: string;
  scheduled_time: string;
  max_participants?: number;
  required_level_min?: SkillLevel;
  required_level_max?: SkillLevel;
  description?: string;
  expires_at?: string;
}

export const openMatchesService = {
  async getOpenMatches(filters?: OpenMatchFilters): Promise<PaginatedResponse<OpenMatchListItem>> {
    const { data } = await api.get<PaginatedResponse<OpenMatchListItem>>("/matches/open/", {
      params: filters,
    });
    return data;
  },

  async getOpenMatch(id: string): Promise<OpenMatch> {
    const { data } = await api.get<OpenMatch>(`/matches/open/${id}/`);
    return data;
  },

  async createOpenMatch(matchData: CreateOpenMatchData): Promise<OpenMatch> {
    const { data } = await api.post<OpenMatch>("/matches/open/create/", matchData);
    return data;
  },

  async joinOpenMatch(id: string): Promise<void> {
    await api.post(`/matches/open/${id}/join/`);
  },
};

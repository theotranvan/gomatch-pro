import api from "./api";
import type {
  PlayerProfile,
  PaginatedResponse,
  Sport,
  SkillLevel,
  PlayMode,
  Ranking,
} from "../types";

export interface PlayerFilters {
  search?: string;
  sport?: Sport;
  level_tennis?: SkillLevel;
  level_padel?: SkillLevel;
  preferred_play_mode?: PlayMode;
  city?: string;
  page?: number;
}

export const playersService = {
  async getPlayers(
    filters?: PlayerFilters
  ): Promise<PaginatedResponse<PlayerProfile>> {
    const { data } = await api.get<PaginatedResponse<PlayerProfile>>(
      "/players/",
      { params: filters }
    );
    return data;
  },

  async getPlayer(playerId: string): Promise<PlayerProfile> {
    const { data } = await api.get<PlayerProfile>(`/players/${playerId}/`);
    return data;
  },

  async getPlayerRankings(playerId: string): Promise<Ranking[]> {
    const { data } = await api.get<PaginatedResponse<Ranking>>("/rankings/", {
      params: { player: playerId },
    });
    return data.results;
  },
};

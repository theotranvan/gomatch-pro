import api from "./api";
import type { PlayerProfile, PaginatedResponse, Sport, SkillLevel } from "../types";

export interface PlayerFilters {
  sport?: Sport;
  level?: SkillLevel;
  city?: string;
  page?: number;
}

export const playersService = {
  async getPlayers(filters?: PlayerFilters): Promise<PaginatedResponse<PlayerProfile>> {
    const { data } = await api.get<PaginatedResponse<PlayerProfile>>("/players/", {
      params: filters,
    });
    return data;
  },
};

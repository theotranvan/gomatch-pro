import api from "./api";
import type { PlayerStats } from "../types";

export const statsService = {
  async getMyStats(): Promise<PlayerStats> {
    const { data } = await api.get<PlayerStats>("/stats/me/");
    return data;
  },

  async getPlayerStats(playerId: string): Promise<PlayerStats> {
    const { data } = await api.get<PlayerStats>(`/stats/${playerId}/`);
    return data;
  },
};

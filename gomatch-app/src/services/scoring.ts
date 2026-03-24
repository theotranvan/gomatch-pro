import api from "./api";
import type { Score, Ranking, SetScore, Sport, PaginatedResponse } from "../types";

export const scoringService = {
  async submitScore(matchId: string, sets: SetScore[]): Promise<Score> {
    const { data } = await api.post<Score>(`/matches/${matchId}/score/`, { sets });
    return data;
  },

  async confirmScore(scoreId: string): Promise<Score> {
    const { data } = await api.post<Score>(`/scores/${scoreId}/confirm/`);
    return data;
  },

  async disputeScore(scoreId: string): Promise<Score> {
    const { data } = await api.post<Score>(`/scores/${scoreId}/dispute/`);
    return data;
  },

  async getRankings(sport?: Sport): Promise<Ranking[]> {
    const { data } = await api.get<PaginatedResponse<Ranking>>("/rankings/", {
      params: sport ? { sport } : undefined,
    });
    return data.results;
  },

  async getMyRankings(): Promise<Ranking[]> {
    const { data } = await api.get<Ranking[]>("/rankings/me/");
    return data;
  },
};

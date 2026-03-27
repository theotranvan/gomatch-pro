import api from "./api";
import type { Connection, ConnectionStatusResult } from "../types";

export const connectionsService = {
  async getConnections(): Promise<Connection[]> {
    const { data } = await api.get<Connection[]>("/connections/");
    return data;
  },

  async getPendingRequests(): Promise<Connection[]> {
    const { data } = await api.get<Connection[]>("/connections/pending/");
    return data;
  },

  async getCount(): Promise<number> {
    const { data } = await api.get<{ count: number }>("/connections/count/");
    return data.count;
  },

  async getConnectionStatus(playerId: string): Promise<ConnectionStatusResult> {
    const { data } = await api.get<ConnectionStatusResult>(
      `/connections/status/${playerId}/`,
    );
    return data;
  },

  async sendRequest(playerId: string): Promise<Connection> {
    const { data } = await api.post<Connection>("/connections/request/", {
      player_id: playerId,
    });
    return data;
  },

  async accept(connectionId: string): Promise<Connection> {
    const { data } = await api.post<Connection>(
      `/connections/${connectionId}/accept/`,
    );
    return data;
  },

  async decline(connectionId: string): Promise<Connection> {
    const { data } = await api.post<Connection>(
      `/connections/${connectionId}/decline/`,
    );
    return data;
  },

  async remove(connectionId: string): Promise<void> {
    await api.delete(`/connections/${connectionId}/`);
  },

  async block(playerId: string): Promise<Connection> {
    const { data } = await api.post<Connection>("/connections/block/", {
      player_id: playerId,
    });
    return data;
  },
};

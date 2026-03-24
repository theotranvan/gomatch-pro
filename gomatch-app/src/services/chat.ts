import api from "./api";
import type { ChatRoom, ChatMessage, PaginatedResponse } from "../types";

export const chatService = {
  async getChatRooms(): Promise<ChatRoom[]> {
    const { data } = await api.get<{ results: ChatRoom[] } | ChatRoom[]>("/chat/rooms/");
    return Array.isArray(data) ? data : data.results;
  },

  async getMessages(roomId: string, page?: number): Promise<PaginatedResponse<ChatMessage>> {
    const { data } = await api.get<PaginatedResponse<ChatMessage>>(
      `/chat/rooms/${roomId}/messages/`,
      { params: page ? { page } : undefined },
    );
    return data;
  },

  async sendMessage(roomId: string, content: string): Promise<ChatMessage> {
    const { data } = await api.post<ChatMessage>(
      `/chat/rooms/${roomId}/messages/`,
      { content },
    );
    return data;
  },

  async markAsRead(roomId: string): Promise<void> {
    await api.post(`/chat/rooms/${roomId}/mark-read/`);
  },
};

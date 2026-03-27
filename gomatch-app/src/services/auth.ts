import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import api from "./api";
import { Config } from "../constants/config";
import type { AuthResponse, PlayerProfile, Tokens, User } from "../types";

export const authService = {
  async register(
    email: string,
    password: string,
    passwordConfirm: string,
  ): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/auth/register/", {
      email,
      password,
      password_confirm: passwordConfirm,
    });
    await authService.storeTokens(data.tokens);
    return data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/auth/login/", {
      email,
      password,
    });
    await authService.storeTokens(data.tokens);
    return data;
  },

  async refreshToken(refresh: string): Promise<string> {
    const { data } = await axios.post<{ access: string }>(
      `${Config.API_URL}/auth/token/refresh/`,
      { refresh },
    );
    await AsyncStorage.setItem("access_token", data.access);
    return data.access;
  },

  async logout(): Promise<void> {
    await authService.clearTokens();
  },

  async getMe(): Promise<User> {
    const { data } = await api.get<User>("/auth/me/");
    return data;
  },

  async updateProfile(profileData: Partial<PlayerProfile>): Promise<PlayerProfile> {
    const { data } = await api.patch<PlayerProfile>("/auth/profile/", profileData);
    return data;
  },

  async uploadAvatar(uri: string): Promise<string> {
    const filename = uri.split("/").pop() ?? "avatar.jpg";
    const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
    const mimeMap: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
    const type = mimeMap[ext] ?? "image/jpeg";

    const form = new FormData();
    form.append("image", { uri, name: filename, type } as unknown as Blob);

    const { data } = await api.post<{ avatar_url: string }>("/auth/upload-avatar/", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.avatar_url;
  },

  async storeTokens(tokens: Tokens): Promise<void> {
    await AsyncStorage.setItem("access_token", tokens.access);
    await AsyncStorage.setItem("refresh_token", tokens.refresh);
  },

  async getTokens(): Promise<Tokens | null> {
    const access = await AsyncStorage.getItem("access_token");
    const refresh = await AsyncStorage.getItem("refresh_token");
    if (access && refresh) {
      return { access, refresh };
    }
    return null;
  },

  async clearTokens(): Promise<void> {
    await AsyncStorage.removeItem("access_token");
    await AsyncStorage.removeItem("refresh_token");
  },
};

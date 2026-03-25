import api from "./api";

export const notificationService = {
  async registerPushToken(token: string): Promise<void> {
    await api.post("/auth/push-token/", { token });
  },
};

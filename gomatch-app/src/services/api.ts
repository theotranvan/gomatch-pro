import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Config } from "../constants/config";

const api = axios.create({
  baseURL: Config.API_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach access token to every request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("access_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, try to refresh the token once
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refresh = await AsyncStorage.getItem("refresh_token");
      if (refresh) {
        try {
          const { data } = await axios.post(
            `${Config.API_URL}/auth/token/refresh/`,
            { refresh },
          );
          await AsyncStorage.setItem("access_token", data.access);
          originalRequest.headers.Authorization = `Bearer ${data.access}`;
          return api(originalRequest);
        } catch {
          await AsyncStorage.removeItem("access_token");
          await AsyncStorage.removeItem("refresh_token");
        }
      }
    }
    return Promise.reject(error);
  },
);

export default api;

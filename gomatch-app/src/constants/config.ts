import Constants from "expo-constants";

export const Config = {
  API_URL:
    (Constants.expoConfig?.extra?.apiUrl as string) ||
    "http://localhost:8000/api",
} as const;

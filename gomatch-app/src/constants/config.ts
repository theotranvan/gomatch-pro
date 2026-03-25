import Constants from "expo-constants";

export const Config = {
  API_URL:
    (Constants.expoConfig?.extra?.apiUrl as string) ||
    "http://localhost:8000/api",
  STRIPE_PUBLISHABLE_KEY:
    (Constants.expoConfig?.extra?.stripePublishableKey as string) || "",
} as const;

import Constants from "expo-constants";

const apiUrl =
  (Constants.expoConfig?.extra?.apiUrl as string) ||
  "http://localhost:8000/api";

// Derive WebSocket base URL from API URL (http→ws, https→wss, strip /api suffix)
const wsUrl = apiUrl
  .replace(/\/api\/?$/, "")
  .replace(/^http/, "ws");

export const Config = {
  API_URL: apiUrl,
  WS_URL: wsUrl,
  STRIPE_PUBLISHABLE_KEY:
    (Constants.expoConfig?.extra?.stripePublishableKey as string) || "",
  SENTRY_DSN:
    (Constants.expoConfig?.extra?.sentryDsn as string) || "",
} as const;

import "dotenv/config";
import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Go Match",
  slug: "gomatch",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#1B6B4A",
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.gomatch.app",
    infoPlist: {
      NSCameraUsageDescription:
        "Go Match a besoin de la caméra pour votre photo de profil.",
      NSPhotoLibraryUsageDescription:
        "Go Match a besoin d'accéder à vos photos pour votre photo de profil.",
    },
  },
  android: {
    package: "com.gomatch.app",
    adaptiveIcon: {
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
      backgroundColor: "#1B6B4A",
    },
    permissions: [
      "CAMERA",
      "READ_EXTERNAL_STORAGE",
      "WRITE_EXTERNAL_STORAGE",
      "ACCESS_NETWORK_STATE",
      "INTERNET",
    ],
  },
  web: {
    favicon: "./assets/favicon.png",
  },
  plugins: [
    [
      "@stripe/stripe-react-native",
      {
        merchantIdentifier: "merchant.com.gomatch.app",
        enableGooglePay: false,
      },
    ],
    "expo-notifications",
  ],
  extra: {
    apiUrl: process.env.API_URL || "http://localhost:8000/api",
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
  },
});

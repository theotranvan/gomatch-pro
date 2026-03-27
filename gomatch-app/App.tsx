import React from "react";
import { StatusBar } from "expo-status-bar";
import Toast from "react-native-toast-message";
import * as SplashScreen from "expo-splash-screen";
import * as Sentry from "@sentry/react-native";
import { StripeProvider } from "@stripe/stripe-react-native";
import { AuthProvider } from "./src/contexts/AuthContext";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { Config } from "./src/constants/config";

SplashScreen.preventAutoHideAsync();

Sentry.init({
  dsn: Config.SENTRY_DSN,
  tracesSampleRate: 0.1,
  enabled: !!Config.SENTRY_DSN,
});

function App() {
  return (
    <StripeProvider publishableKey={Config.STRIPE_PUBLISHABLE_KEY}>
      <AuthProvider>
        <RootNavigator />
        <StatusBar style="light" />
        <Toast position="top" topOffset={50} visibilityTime={3000} />
      </AuthProvider>
    </StripeProvider>
  );
}

export default Sentry.wrap(App);

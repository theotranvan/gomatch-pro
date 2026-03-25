import React from "react";
import { StatusBar } from "expo-status-bar";
import Toast from "react-native-toast-message";
import * as SplashScreen from "expo-splash-screen";
import { AuthProvider } from "./src/contexts/AuthContext";
import { RootNavigator } from "./src/navigation/RootNavigator";

SplashScreen.preventAutoHideAsync();

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
      <StatusBar style="light" />
      <Toast position="top" topOffset={50} visibilityTime={3000} />
    </AuthProvider>
  );
}

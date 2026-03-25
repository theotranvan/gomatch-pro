import React, { useCallback } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { AuthStack } from "./AuthStack";
import { MainTabs } from "./MainTabs";
import { OnboardingScreen } from "../screens/auth/OnboardingScreen";
import { useAuth } from "../hooks/useAuth";
import { Colors } from "../constants/colors";

function isProfileComplete(profile: { first_name: string; last_name: string } | null): boolean {
  if (!profile) return false;
  return !!profile.first_name && !!profile.last_name;
}

export function RootNavigator() {
  const { user, profile, isLoading, isAuthenticated } = useAuth();

  const onLayoutRootView = useCallback(async () => {
    if (!isLoading) {
      await SplashScreen.hideAsync();
    }
  }, [isLoading]);

  if (isLoading) {
    return null;
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <NavigationContainer>
        {!isAuthenticated ? (
          <AuthStack />
        ) : !isProfileComplete(profile) ? (
          <OnboardingScreen />
        ) : (
          <MainTabs />
        )}
      </NavigationContainer>
    </View>
  );
}

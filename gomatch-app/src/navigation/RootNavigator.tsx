import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { ActivityIndicator, View } from "react-native";
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

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.BACKGROUND }}>
        <ActivityIndicator size="large" color={Colors.PRIMARY} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!isAuthenticated ? (
        <AuthStack />
      ) : !isProfileComplete(profile) ? (
        <OnboardingScreen />
      ) : (
        <MainTabs />
      )}
    </NavigationContainer>
  );
}

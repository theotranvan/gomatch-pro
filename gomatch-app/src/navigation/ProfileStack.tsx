import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ProfileScreen } from "../screens/main/ProfileScreen";
import { EditProfileScreen } from "../screens/main/EditProfileScreen";
import { BookingDetailScreen } from "../screens/main/BookingDetailScreen";
import { Colors } from "../constants/colors";

export type ProfileStackParamList = {
  ProfileMain: undefined;
  EditProfile: undefined;
  BookingDetail: { bookingId: string };
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.BACKGROUND },
        headerTintColor: Colors.TEXT,
        headerTitleStyle: { fontWeight: "bold" },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{ title: "Mon profil" }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: "Modifier le profil" }}
      />
      <Stack.Screen
        name="BookingDetail"
        component={BookingDetailScreen}
        options={{ title: "Détail réservation" }}
      />
    </Stack.Navigator>
  );
}

import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { VenueListScreen } from "../screens/main/VenueListScreen";
import { VenueDetailScreen } from "../screens/main/VenueDetailScreen";
import { Colors } from "../constants/colors";

export type VenuesStackParamList = {
  VenueList: undefined;
  VenueDetail: { venueId: string };
};

const Stack = createNativeStackNavigator<VenuesStackParamList>();

export function VenuesStack() {
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
        name="VenueList"
        component={VenueListScreen}
        options={{ title: "Clubs & Terrains" }}
      />
      <Stack.Screen
        name="VenueDetail"
        component={VenueDetailScreen}
        options={{ title: "Détail du club" }}
      />
    </Stack.Navigator>
  );
}

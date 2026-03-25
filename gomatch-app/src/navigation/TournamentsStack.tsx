import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { TournamentListScreen } from "../screens/main/TournamentListScreen";
import { TournamentDetailScreen } from "../screens/main/TournamentDetailScreen";
import { TournamentRegistrationScreen } from "../screens/main/TournamentRegistrationScreen";
import { Colors } from "../constants/colors";
import type { Sport, MatchType } from "../types";

export type TournamentsStackParamList = {
  TournamentList: undefined;
  TournamentDetail: { tournamentId: string };
  TournamentRegistration: {
    tournamentId: string;
    tournamentName: string;
    sport: Sport;
    matchType: MatchType;
  };
};

const Stack = createNativeStackNavigator<TournamentsStackParamList>();

export function TournamentsStack() {
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
        name="TournamentList"
        component={TournamentListScreen}
        options={{ title: "Tournois" }}
      />
      <Stack.Screen
        name="TournamentDetail"
        component={TournamentDetailScreen}
        options={{ title: "Tournoi" }}
      />
      <Stack.Screen
        name="TournamentRegistration"
        component={TournamentRegistrationScreen}
        options={{ title: "Inscription" }}
      />
    </Stack.Navigator>
  );
}

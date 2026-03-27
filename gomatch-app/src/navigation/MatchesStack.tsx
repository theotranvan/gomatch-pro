import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MatchListScreen } from "../screens/main/MatchListScreen";
import { MatchDetailScreen } from "../screens/main/MatchDetailScreen";
import { CreateMatchScreen } from "../screens/main/CreateMatchScreen";
import { ScoreEntryScreen } from "../screens/main/ScoreEntryScreen";
import { PaymentScreen } from "../screens/main/PaymentScreen";
import { Colors } from "../constants/colors";

export type MatchesStackParamList = {
  MatchListMain: undefined;
  MatchDetail: { matchId: string };
  CreateMatch: undefined;
  SubmitScore: {
    matchId: string;
    sport: string;
    teamANames?: string;
    teamBNames?: string;
  };
  Payment: {
    bookingId: string;
    matchId: string;
    courtName: string;
    venueName: string;
    date: string;
    time: string;
    pricePerPlayer: number;
  };
};

const Stack = createNativeStackNavigator<MatchesStackParamList>();

export function MatchesStack() {
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
        name="MatchListMain"
        component={MatchListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MatchDetail"
        component={MatchDetailScreen}
        options={{ title: "Détail du match" }}
      />
      <Stack.Screen
        name="CreateMatch"
        component={CreateMatchScreen}
        options={{ title: "Créer un match" }}
      />
      <Stack.Screen
        name="SubmitScore"
        component={ScoreEntryScreen}
        options={{ title: "Saisir le score" }}
      />
      <Stack.Screen
        name="Payment"
        component={PaymentScreen}
        options={{ title: "Paiement" }}
      />
    </Stack.Navigator>
  );
}

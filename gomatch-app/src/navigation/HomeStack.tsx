import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HomeScreen } from "../screens/main/HomeScreen";
import { MatchListScreen } from "../screens/main/MatchListScreen";
import { MatchDetailScreen } from "../screens/main/MatchDetailScreen";
import { ScoreEntryScreen } from "../screens/main/ScoreEntryScreen";
import { RankingScreen } from "../screens/main/RankingScreen";
import { PlayerSearchScreen } from "../screens/main/PlayerSearchScreen";
import { PlayerProfileScreen } from "../screens/main/PlayerProfileScreen";
import { PaymentScreen } from "../screens/main/PaymentScreen";
import { StatsScreen } from "../screens/main/StatsScreen";
import { ConnectionsListScreen } from "../screens/main/ConnectionsListScreen";
import { PendingRequestsScreen } from "../screens/main/PendingRequestsScreen";
import { EventListScreen } from "../screens/main/EventListScreen";
import { EventDetailScreen } from "../screens/main/EventDetailScreen";
import { NotificationsScreen } from "../screens/main/NotificationsScreen";
import { Colors } from "../constants/colors";

export type HomeStackParamList = {
  HomeMain: undefined;
  MatchList: undefined;
  MatchDetail: { matchId: string };
  SubmitScore: { matchId: string; sport: string; teamANames?: string; teamBNames?: string };
  Ranking: undefined;
  PlayerSearch: undefined;
  PlayerProfile: { playerId: string };
  PlayerStats: { playerId?: string };
  ConnectionsList: undefined;
  PendingRequests: undefined;
  EventList: undefined;
  EventDetail: { eventId: string };
  Notifications: undefined;
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

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStack() {
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
        name="HomeMain"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MatchList"
        component={MatchListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MatchDetail"
        component={MatchDetailScreen}
        options={{ title: "Détail du match" }}
      />
      <Stack.Screen
        name="SubmitScore"
        component={ScoreEntryScreen}
        options={{ title: "Saisir le score" }}
      />
      <Stack.Screen
        name="Ranking"
        component={RankingScreen}
        options={{ title: "Classement" }}
      />
      <Stack.Screen
        name="PlayerSearch"
        component={PlayerSearchScreen}
        options={{ title: "Rechercher un joueur" }}
      />
      <Stack.Screen
        name="PlayerProfile"
        component={PlayerProfileScreen}
        options={{ title: "Profil du joueur" }}
      />
      <Stack.Screen
        name="Payment"
        component={PaymentScreen}
        options={{ title: "Paiement" }}
      />
      <Stack.Screen
        name="PlayerStats"
        component={StatsScreen}
        options={{ title: "Statistiques" }}
      />
      <Stack.Screen
        name="ConnectionsList"
        component={ConnectionsListScreen}
        options={{ title: "Mes connexions" }}
      />
      <Stack.Screen
        name="PendingRequests"
        component={PendingRequestsScreen}
        options={{ title: "Demandes reçues" }}
      />
      <Stack.Screen
        name="EventList"
        component={EventListScreen}
        options={{ title: "Go Match Cup" }}
      />
      <Stack.Screen
        name="EventDetail"
        component={EventDetailScreen}
        options={{ title: "Détail de l'événement" }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: "Notifications" }}
      />
    </Stack.Navigator>
  );
}

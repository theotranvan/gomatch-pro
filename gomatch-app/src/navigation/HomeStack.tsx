import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HomeScreen } from "../screens/main/HomeScreen";
import { MatchListScreen } from "../screens/main/MatchListScreen";
import { MatchDetailScreen } from "../screens/main/MatchDetailScreen";
import { ScoreEntryScreen } from "../screens/main/ScoreEntryScreen";
import { RankingScreen } from "../screens/main/RankingScreen";
import { PlayerSearchScreen } from "../screens/main/PlayerSearchScreen";
import { PlayerProfileScreen } from "../screens/main/PlayerProfileScreen";
import { Colors } from "../constants/colors";

export type HomeStackParamList = {
  HomeMain: undefined;
  MatchList: undefined;
  MatchDetail: { matchId: string };
  SubmitScore: { matchId: string; teamANames?: string; teamBNames?: string };
  Ranking: undefined;
  PlayerSearch: undefined;
  PlayerProfile: { playerId: string };
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
        options={{ title: "Accueil" }}
      />
      <Stack.Screen
        name="MatchList"
        component={MatchListScreen}
        options={{ title: "Mes matchs" }}
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
    </Stack.Navigator>
  );
}

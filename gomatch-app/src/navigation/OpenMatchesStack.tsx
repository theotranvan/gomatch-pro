import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { OpenMatchesScreen } from "../screens/main/OpenMatchesScreen";
import { CreateOpenMatchScreen } from "../screens/main/CreateOpenMatchScreen";
import { Colors } from "../constants/colors";

export type OpenMatchesStackParamList = {
  OpenMatchesMain: undefined;
  CreateOpenMatch: undefined;
};

const Stack = createNativeStackNavigator<OpenMatchesStackParamList>();

export function OpenMatchesStack() {
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
        name="OpenMatchesMain"
        component={OpenMatchesScreen}
        options={{ title: "Open Matchs" }}
      />
      <Stack.Screen
        name="CreateOpenMatch"
        component={CreateOpenMatchScreen}
        options={{ title: "Publier une session" }}
      />
    </Stack.Navigator>
  );
}

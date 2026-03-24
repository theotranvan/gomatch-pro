import React from "react";
import { View, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { HomeStack } from "./HomeStack";
import { OpenMatchesStack } from "./OpenMatchesStack";
import { CreateMatchScreen } from "../screens/main/CreateMatchScreen";
import { VenuesStack } from "./VenuesStack";
import { ProfileStack } from "./ProfileStack";
import { Colors } from "../constants/colors";

export type MainTabParamList = {
  Home: undefined;
  OpenMatches: undefined;
  CreateMatch: undefined;
  Venues: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: Colors.PRIMARY,
        tabBarInactiveTintColor: Colors.TEXT_SECONDARY,
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
          borderTopColor: Colors.BORDER,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
        headerStyle: { backgroundColor: Colors.BACKGROUND },
        headerTitleStyle: { fontWeight: "bold", color: Colors.TEXT },
        headerShadowVisible: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          title: "Accueil",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="OpenMatches"
        component={OpenMatchesStack}
        options={{
          title: "Open Matchs",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="CreateMatch"
        component={CreateMatchScreen}
        options={{
          title: "Créer",
          tabBarIcon: ({ focused }) => (
            <View style={[
              styles.createButton,
              focused && styles.createButtonFocused,
            ]}>
              <Ionicons name="add" size={28} color="#FFFFFF" />
            </View>
          ),
          tabBarLabel: () => null,
        }}
      />
      <Tab.Screen
        name="Venues"
        component={VenuesStack}
        options={{
          title: "Clubs",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="business-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          title: "Profil",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  createButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  createButtonFocused: {
    backgroundColor: Colors.PRIMARY_LIGHT,
  },
});

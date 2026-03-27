import React from "react";
import { StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { HomeStack } from "./HomeStack";
import { MatchesStack } from "./MatchesStack";
import { OpenMatchesStack } from "./OpenMatchesStack";
import { ChatStack } from "./ChatStack";
import { ProfileStack } from "./ProfileStack";
import { useNotifications } from "../hooks/useNotifications";

export type MainTabParamList = {
  Home: undefined;
  Matches: undefined;
  Activities: undefined;
  Chat: undefined;
  Profile: undefined;
};

const ACTIVE_COLOR = "#3B82F6";
const INACTIVE_COLOR = "#9CA3AF";

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  useNotifications();

  // TODO: replace with real unread count from chat context/service
  const unreadMessages = 0;

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIconStyle: { marginBottom: -2 },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          title: "Accueil",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Matches"
        component={MatchesStack}
        options={{
          title: "Matchs",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "people" : "people-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Activities"
        component={OpenMatchesStack}
        options={{
          title: "Activités",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "tennisball" : "tennisball-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatStack}
        options={{
          title: "Chat",
          tabBarBadge: unreadMessages > 0 ? unreadMessages : undefined,
          tabBarBadgeStyle: styles.badge,
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "chatbubble" : "chatbubble-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          title: "Profil",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 60,
    paddingBottom: 8,
    paddingTop: 6,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  badge: {
    backgroundColor: "#EF4444",
    fontSize: 10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
  },
});

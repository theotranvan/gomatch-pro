import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ChatListScreen } from "../screens/main/ChatListScreen";
import { ChatScreen } from "../screens/main/ChatScreen";
import { Colors } from "../constants/colors";

export type ChatStackParamList = {
  ChatList: undefined;
  ChatRoom: { roomId: string; roomName: string; participantsCount: number };
};

const Stack = createNativeStackNavigator<ChatStackParamList>();

export function ChatStack() {
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
        name="ChatList"
        component={ChatListScreen}
        options={{ title: "Messages" }}
      />
      <Stack.Screen
        name="ChatRoom"
        component={ChatScreen}
        options={{ title: "" }}
      />
    </Stack.Navigator>
  );
}

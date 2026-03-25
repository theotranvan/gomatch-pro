import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Toast from "react-native-toast-message";
import { useNavigation } from "@react-navigation/native";
import { notificationService } from "../services/notifications";

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type NotificationData = {
  type?: "match" | "chat" | "score";
  match_id?: string;
  room_id?: string;
};

function navigateFromNotification(
  navigation: any,
  data: NotificationData,
) {
  switch (data.type) {
    case "match":
    case "score":
      if (data.match_id) {
        navigation.navigate("Home", {
          screen: "MatchDetail",
          params: { matchId: data.match_id },
        });
      }
      break;
    case "chat":
      if (data.room_id) {
        navigation.navigate("Chat", {
          screen: "ChatRoom",
          params: { roomId: data.room_id, roomName: "", participantsCount: 0 },
        });
      }
      break;
  }
}

export async function registerForPushNotificationsAsync(): Promise<
  string | null
> {
  if (!Device.isDevice) {
    return null;
  }

  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const token = tokenData.data;

  if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  return token;
}

/**
 * Hook to register for push notifications and handle incoming ones.
 * Call this once in the authenticated app (after login).
 */
export function useNotifications() {
  const navigation = useNavigation<any>();
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    // Register push token with backend
    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        notificationService.registerPushToken(token).catch(() => {});
      }
    });

    // Listener: notification received while app is foregrounded
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        const title = notification.request.content.title ?? "";
        const body = notification.request.content.body ?? "";
        Toast.show({
          type: "info",
          text1: title,
          text2: body,
          visibilityTime: 4000,
        });
      });

    // Listener: user tapped on a notification
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content
          .data as NotificationData;
        if (data) {
          navigateFromNotification(navigation, data);
        }
      });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [navigation]);
}

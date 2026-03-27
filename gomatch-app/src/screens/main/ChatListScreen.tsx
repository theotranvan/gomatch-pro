import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { chatService } from "../../services/chat";
import { Colors } from "../../constants/colors";
import { FONT_SIZES, CARD_RADIUS } from "../../constants/theme";
import { Avatar } from "../../components/Avatar";
import { LoadingScreen } from "../../components/LoadingScreen";
import { EmptyState } from "../../components/EmptyState";
import { NetworkError } from "../../components/NetworkError";
import { ErrorState } from "../../components/ErrorState";
import { isNetworkError } from "../../utils/network";
import type { ChatRoom } from "../../types";
import type { ChatStackParamList } from "../../navigation/ChatStack";

type Nav = NativeStackNavigationProp<ChatStackParamList, "ChatList">;

function formatRoomName(room: ChatRoom): string {
  if (room.participants_names.length > 0) {
    const names = room.participants_names.slice(0, 3).join(", ");
    const extra = room.participants_names.length - 3;
    return extra > 0 ? `${names} +${extra}` : names;
  }
  return "Chat";
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0)
    return date.toLocaleTimeString("fr-CH", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return date.toLocaleDateString("fr-CH", { weekday: "short" });
  return date.toLocaleDateString("fr-CH", { day: "2-digit", month: "2-digit" });
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

export function ChatListScreen() {
  const navigation = useNavigation<Nav>();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const fetchRooms = useCallback(async () => {
    try {
      const data = await chatService.getChatRooms();
      const sorted = data.sort((a, b) => {
        const dateA = a.last_message?.created_at ?? a.created_at;
        const dateB = b.last_message?.created_at ?? b.created_at;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
      setRooms(sorted);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => { fetchRooms(); });
    return unsubscribe;
  }, [navigation, fetchRooms]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRooms();
  }, [fetchRooms]);

  const renderItem = ({ item }: { item: ChatRoom }) => {
    const name = formatRoomName(item);
    const displayName = item.participants_names[0] ?? "Chat";
    const lastMsg = item.last_message;
    const lastMsgText = lastMsg
      ? lastMsg.message_type === "system"
        ? `ℹ️ ${truncate(lastMsg.content, 40)}`
        : `${lastMsg.sender_name.split(" ")[0]}: ${truncate(lastMsg.content, 35)}`
      : "Aucun message";
    const lastDate = lastMsg ? formatDate(lastMsg.created_at) : "";
    const hasUnread = item.unread_count > 0;

    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate("ChatRoom", {
            roomId: item.id,
            roomName: name,
            participantsCount: item.participants_names.length,
          })
        }
      >
        <Avatar name={displayName} size="md" />

        <View style={styles.rowContent}>
          <View style={styles.rowTop}>
            <Text
              style={[styles.rowName, hasUnread && styles.rowNameBold]}
              numberOfLines={1}
            >
              {name}
            </Text>
            <Text style={[styles.rowDate, hasUnread && styles.rowDateActive]}>
              {lastDate}
            </Text>
          </View>
          <View style={styles.rowBottom}>
            <Text
              style={[styles.rowMsg, hasUnread && styles.rowMsgBold]}
              numberOfLines={1}
            >
              {lastMsgText}
            </Text>
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {item.unread_count > 99 ? "99+" : item.unread_count}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) return <LoadingScreen message="Chargement des conversations…" />;

  if (error && rooms.length === 0) {
    if (isNetworkError(error))
      return <NetworkError onRetry={() => { setLoading(true); fetchRooms(); }} />;
    return <ErrorState message="Impossible de charger les conversations" onRetry={() => { setLoading(true); fetchRooms(); }} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={rooms}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={rooms.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={
          <EmptyState
            icon="chatbubbles-outline"
            title="Aucune conversation"
            subtitle="Rejoignez un match pour commencer à discuter"
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.NAVY}
            colors={[Colors.NAVY]}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.BACKGROUND },
  emptyContainer: { flex: 1 },

  // ── Row ──
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  rowContent: { flex: 1, marginLeft: 14 },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  rowName: {
    fontSize: FONT_SIZES.h3,
    fontWeight: "500",
    color: Colors.TEXT,
    flex: 1,
    marginRight: 8,
  },
  rowNameBold: { fontWeight: "700" },
  rowDate: { fontSize: FONT_SIZES.caption, color: Colors.TEXT_SECONDARY },
  rowDateActive: { color: Colors.BLUE, fontWeight: "600" },
  rowBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowMsg: {
    fontSize: FONT_SIZES.body,
    color: Colors.TEXT_SECONDARY,
    flex: 1,
    marginRight: 8,
  },
  rowMsgBold: { color: Colors.TEXT, fontWeight: "500" },

  // ── Unread badge ──
  unreadBadge: {
    backgroundColor: Colors.BLUE,
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },

  // ── Separator ──
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.BORDER,
    marginLeft: 78,
  },
});

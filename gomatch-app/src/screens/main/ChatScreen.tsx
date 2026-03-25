import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { chatService } from "../../services/chat";
import { useAuth } from "../../hooks/useAuth";
import { Colors } from "../../constants/colors";
import { LoadingScreen } from "../../components/LoadingScreen";
import { EmptyState } from "../../components/EmptyState";
import type { ChatMessage } from "../../types";
import type { ChatStackParamList } from "../../navigation/ChatStack";

type Props = NativeStackScreenProps<ChatStackParamList, "ChatRoom">;

const POLL_INTERVAL = 5000;

export function ChatScreen({ route, navigation }: Props) {
  const { roomId, roomName, participantsCount } = route.params;
  const { user } = useAuth();
  const currentUserId = user?.id;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const latestIdRef = useRef<string | null>(null);

  // Set header
  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {roomName}
          </Text>
          <Text style={styles.headerSubtitle}>
            {participantsCount} participant{participantsCount > 1 ? "s" : ""}
          </Text>
        </View>
      ),
    });
  }, [navigation, roomName, participantsCount]);

  // Load initial messages + mark as read
  const loadMessages = useCallback(async () => {
    try {
      const res = await chatService.getMessages(roomId, 1);
      const sorted = res.results.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
      setMessages(sorted);
      setPage(1);
      setHasMore(res.next !== null);
      if (sorted.length > 0) {
        latestIdRef.current = sorted[sorted.length - 1].id;
      }
      await chatService.markAsRead(roomId);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Polling for new messages
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await chatService.getMessages(roomId, 1);
        const sorted = res.results.sort(
          (a, b) =>
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime(),
        );
        if (sorted.length > 0) {
          const newestId = sorted[sorted.length - 1].id;
          if (newestId !== latestIdRef.current) {
            latestIdRef.current = newestId;
            setMessages(sorted);
            setHasMore(res.next !== null);
            await chatService.markAsRead(roomId);
          }
        }
      } catch {
        // silent
      }
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [roomId]);

  // Load older messages (pagination)
  const loadOlderMessages = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await chatService.getMessages(roomId, nextPage);
      const older = res.results.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
      setMessages((prev) => [...older, ...prev]);
      setPage(nextPage);
      setHasMore(res.next !== null);
    } catch {
      // silent
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, page, roomId]);

  // Send message
  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || sending) return;
    setSending(true);
    setInputText("");
    try {
      const msg = await chatService.sendMessage(roomId, text);
      setMessages((prev) => [...prev, msg]);
      latestIdRef.current = msg.id;
    } catch {
      setInputText(text);
    } finally {
      setSending(false);
    }
  }, [inputText, sending, roomId]);

  // Auto-scroll when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("fr-CH", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateSeparator = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Hier";
    return d.toLocaleDateString("fr-CH", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  const shouldShowDateSeparator = (index: number): string | null => {
    if (index === 0) return formatDateSeparator(messages[0].created_at);
    const prevDate = new Date(messages[index - 1].created_at).toDateString();
    const currDate = new Date(messages[index].created_at).toDateString();
    if (prevDate !== currDate) {
      return formatDateSeparator(messages[index].created_at);
    }
    return null;
  };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const dateSep = shouldShowDateSeparator(index);
    const isMe = item.sender === currentUserId;
    const isSystem = item.message_type === "system";

    return (
      <View>
        {dateSep && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateSeparatorText}>{dateSep}</Text>
          </View>
        )}

        {isSystem ? (
          <View style={styles.systemContainer}>
            <Text style={styles.systemText}>{item.content}</Text>
          </View>
        ) : (
          <View
            style={[
              styles.bubbleRow,
              isMe ? styles.bubbleRowRight : styles.bubbleRowLeft,
            ]}
          >
            <View>
              {!isMe && (
                <Text style={styles.senderName}>
                  {item.sender_name.split(" ")[0]}
                </Text>
              )}
              <View
                style={[
                  styles.bubble,
                  isMe ? styles.bubbleMine : styles.bubbleOther,
                ]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    isMe ? styles.bubbleTextMine : styles.bubbleTextOther,
                  ]}
                >
                  {item.content}
                </Text>
                <Text
                  style={[
                    styles.bubbleTime,
                    isMe ? styles.bubbleTimeMine : styles.bubbleTimeOther,
                  ]}
                >
                  {formatTime(item.created_at)}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return <LoadingScreen message="Chargement des messages…" />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        onStartReached={loadOlderMessages}
        onStartReachedThreshold={0.1}
        ListHeaderComponent={
          loadingMore ? (
            <View style={styles.loadingMore}>
              <Text style={styles.loadingMoreText}>Chargement…</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="chatbubble-ellipses-outline"
            title="Aucun message"
            subtitle="Lancez la conversation !"
          />
        }
      />

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Votre message…"
          placeholderTextColor={Colors.TEXT_SECONDARY}
          multiline
          maxLength={2000}
          returnKeyType="default"
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!inputText.trim() || sending) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
          activeOpacity={0.7}
        >
          <Ionicons name="send" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  loadingText: {
    color: Colors.TEXT_SECONDARY,
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.TEXT,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.TEXT_SECONDARY,
    textAlign: "center",
  },
  messageList: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  dateSeparator: {
    alignItems: "center",
    marginVertical: 12,
  },
  dateSeparatorText: {
    fontSize: 12,
    color: Colors.TEXT_SECONDARY,
    backgroundColor: "#E8E8E8",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: "hidden",
    fontWeight: "500",
  },
  // System message
  systemContainer: {
    alignItems: "center",
    marginVertical: 6,
    paddingHorizontal: 20,
  },
  systemText: {
    fontSize: 13,
    fontStyle: "italic",
    color: "#999999",
    textAlign: "center",
  },
  // Bubble rows
  bubbleRow: {
    marginVertical: 3,
    maxWidth: "80%",
  },
  bubbleRowRight: {
    alignSelf: "flex-end",
  },
  bubbleRowLeft: {
    alignSelf: "flex-start",
  },
  senderName: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.PRIMARY,
    marginBottom: 2,
    marginLeft: 8,
  },
  // Bubbles
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
    minWidth: 60,
  },
  bubbleMine: {
    backgroundColor: Colors.PRIMARY,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: "#E8E8E8",
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 20,
  },
  bubbleTextMine: {
    color: "#FFFFFF",
  },
  bubbleTextOther: {
    color: Colors.TEXT,
  },
  bubbleTime: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  bubbleTimeMine: {
    color: "rgba(255,255,255,0.7)",
  },
  bubbleTimeOther: {
    color: Colors.TEXT_SECONDARY,
  },
  // Loading more
  loadingMore: {
    alignItems: "center",
    paddingVertical: 12,
  },
  loadingMoreText: {
    fontSize: 13,
    color: Colors.TEXT_SECONDARY,
  },
  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
    marginTop: 12,
    textAlign: "center",
  },
  // Input bar
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: Colors.BACKGROUND,
    borderTopWidth: 1,
    borderTopColor: Colors.BORDER,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    color: Colors.TEXT,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#B0B0B0",
  },
});

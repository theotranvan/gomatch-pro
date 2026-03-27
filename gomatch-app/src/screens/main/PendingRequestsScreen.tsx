import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";
import { connectionsService } from "../../services/connections";
import { LoadingScreen } from "../../components/LoadingScreen";
import { EmptyState } from "../../components/EmptyState";
import { getInitials } from "../../utils/helpers";
import type { Connection } from "../../types";

export function PendingRequestsScreen() {
  const [requests, setRequests] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const data = await connectionsService.getPendingRequests();
      setRequests(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const handleAccept = async (conn: Connection) => {
    setActionLoading(conn.id);
    try {
      await connectionsService.accept(conn.id);
      setRequests((prev) => prev.filter((c) => c.id !== conn.id));
    } catch {
      // silently fail
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (conn: Connection) => {
    setActionLoading(conn.id);
    try {
      await connectionsService.decline(conn.id);
      setRequests((prev) => prev.filter((c) => c.id !== conn.id));
    } catch {
      // silently fail
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <LoadingScreen message="Chargement…" />;

  const renderItem = ({ item }: { item: Connection }) => {
    const player = item.requester;
    const initials = getInitials(player.first_name, player.last_name);
    const displayName = player.username
      ? `@${player.username}`
      : `${player.first_name} ${player.last_name}`.trim();
    const isLoading = actionLoading === item.id;

    return (
      <View style={styles.row}>
        {player.avatar_url ? (
          <Image source={{ uri: player.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>
          {player.city ? (
            <Text style={styles.city}>{player.city}</Text>
          ) : null}
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={() => handleAccept(item)}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.declineBtn}
            onPress={() => handleDecline(item)}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={20} color={Colors.ERROR} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <FlatList
      data={requests}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={requests.length === 0 ? styles.emptyContainer : styles.list}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.NAVY}
          colors={[Colors.NAVY]}
        />
      }
      ListEmptyComponent={
        <EmptyState
          icon="mail-open-outline"
          title="Aucune demande"
          subtitle="Tu n'as pas de demande de connexion en attente."
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingVertical: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.BACKGROUND,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.TEXT,
  },
  city: {
    fontSize: 13,
    color: Colors.TEXT_SECONDARY,
    marginTop: 2,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  acceptBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.SUCCESS,
    alignItems: "center",
    justifyContent: "center",
  },
  declineBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.ERROR + "15",
    alignItems: "center",
    justifyContent: "center",
  },
});

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";
import { connectionsService } from "../../services/connections";
import { useAuth } from "../../hooks/useAuth";
import { LoadingScreen } from "../../components/LoadingScreen";
import { EmptyState } from "../../components/EmptyState";
import { getInitials } from "../../utils/helpers";
import type { Connection, ConnectionPlayer } from "../../types";

export function ConnectionsListScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConnections = useCallback(async () => {
    try {
      const data = await connectionsService.getConnections();
      setConnections(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchConnections();
    setRefreshing(false);
  }, [fetchConnections]);

  const handleRemove = (conn: Connection) => {
    Alert.alert(
      "Retirer la connexion",
      "Voulez-vous vraiment retirer cette connexion ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Retirer",
          style: "destructive",
          onPress: async () => {
            try {
              await connectionsService.remove(conn.id);
              setConnections((prev) => prev.filter((c) => c.id !== conn.id));
            } catch {
              Alert.alert("Erreur", "Impossible de retirer la connexion.");
            }
          },
        },
      ],
    );
  };

  /** Return the "other" player in the connection (not me). */
  const getOtherPlayer = (conn: Connection): ConnectionPlayer => {
    return conn.requester.id === user?.profile.id
      ? conn.receiver
      : conn.requester;
  };

  if (loading) return <LoadingScreen message="Chargement…" />;

  const renderItem = ({ item }: { item: Connection }) => {
    const player = getOtherPlayer(item);
    const initials = getInitials(player.first_name, player.last_name);
    const displayName = player.username
      ? `@${player.username}`
      : `${player.first_name} ${player.last_name}`.trim();

    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.7}
        onPress={() => navigation.navigate("PlayerProfile", { playerId: player.id })}
      >
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
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={() => handleRemove(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close-circle-outline" size={22} color={Colors.ERROR} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={connections}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={connections.length === 0 ? styles.emptyContainer : styles.list}
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
          icon="people-outline"
          title="Aucune connexion"
          subtitle="Connecte-toi avec des joueurs pour les retrouver ici."
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
  removeBtn: {
    padding: 4,
  },
});

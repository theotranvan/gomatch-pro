import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";
import { playersService } from "../../services/players";
import { connectionsService } from "../../services/connections";
import { useAuth } from "../../hooks/useAuth";
import { getInitials } from "../../utils/helpers";
import { LoadingScreen } from "../../components/LoadingScreen";
import { NetworkError } from "../../components/NetworkError";
import { ErrorState } from "../../components/ErrorState";
import { isNetworkError } from "../../utils/network";
import type { PlayerProfile, Ranking, ConnectionStatusResult } from "../../types";
import type { HomeStackParamList } from "../../navigation/HomeStack";

// ── Labels ───────────────────────────────────────────────────────────────────
const LEVEL_LABELS: Record<string, string> = {
  beginner: "Débutant",
  intermediate: "Intermédiaire",
  advanced: "Avancé",
};

const MODE_LABELS: Record<string, string> = {
  friendly: "Amical",
  competitive: "Compétition",
  both: "Les deux",
};

// ── Component ────────────────────────────────────────────────────────────────
export function PlayerProfileScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<HomeStackParamList, "PlayerProfile">>();
  const { playerId } = route.params;

  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [connStatus, setConnStatus] = useState<ConnectionStatusResult>({ status: null, connection_id: null, direction: null });
  const [connLoading, setConnLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const isOwnProfile = user?.profile.id === playerId;

  const fetchData = useCallback(async () => {
    try {
      const [playerRes, rankingsRes] = await Promise.allSettled([
        playersService.getPlayer(playerId),
        playersService.getPlayerRankings(playerId),
      ]);

      if (playerRes.status === "fulfilled") {
        setPlayer(playerRes.value);
      }

      if (rankingsRes.status === "fulfilled") {
        setRankings(rankingsRes.value);
      }

      // Fetch connection status (only if not own profile)
      if (!isOwnProfile) {
        try {
          const cs = await connectionsService.getConnectionStatus(playerId);
          setConnStatus(cs);
        } catch {
          // ignore
        }
      }

      if (playerRes.status === "rejected") {
        setError(playerRes.reason);
      } else {
        setError(null);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [playerId, isOwnProfile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  // ── Loading ─────────────────────────────────────────────────────────────
  if (loading) {
    return <LoadingScreen message="Chargement du profil…" />;
  }

  if (error && !player) {
    if (isNetworkError(error)) {
      return <NetworkError onRetry={() => { setLoading(true); fetchData(); }} />;
    }
    return <ErrorState message="Joueur introuvable" onRetry={() => { setLoading(true); fetchData(); }} />;
  }

  if (!player) {
    return <ErrorState message="Joueur introuvable" />;
  }

  // Stats computation
  const totalWins = rankings.reduce((s, r) => s + r.wins, 0);
  const totalLosses = rankings.reduce((s, r) => s + r.losses, 0);
  const totalMatches = totalWins + totalLosses;
  const winRate =
    totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;

  // ── Connection handler ──────────────────────────────────────────────────
  async function handleConnect() {
    setConnLoading(true);
    try {
      if (connStatus.status === null) {
        // No connection yet → send request
        const conn = await connectionsService.sendRequest(playerId);
        setConnStatus({ status: "pending", connection_id: conn.id, direction: "sent" });
      } else if (connStatus.status === "pending" && connStatus.direction === "received") {
        // They sent us a request → accept
        await connectionsService.accept(connStatus.connection_id!);
        setConnStatus({ ...connStatus, status: "accepted" });
      }
    } catch {
      // silently fail
    } finally {
      setConnLoading(false);
    }
  }

  function renderConnectionButton() {
    if (connLoading) {
      return (
        <View style={styles.connBtn}>
          <ActivityIndicator size="small" color={Colors.NAVY} />
        </View>
      );
    }

    if (connStatus.status === "accepted") {
      return (
        <View style={[styles.connBtn, styles.connBtnAccepted]}>
          <Ionicons name="checkmark-circle" size={18} color={Colors.SUCCESS} />
          <Text style={[styles.connBtnText, { color: Colors.SUCCESS }]}>Connecté</Text>
        </View>
      );
    }

    if (connStatus.status === "pending") {
      if (connStatus.direction === "sent") {
        return (
          <View style={[styles.connBtn, styles.connBtnPending]}>
            <Ionicons name="time-outline" size={18} color={Colors.TEXT_SECONDARY} />
            <Text style={[styles.connBtnText, { color: Colors.TEXT_SECONDARY }]}>En attente</Text>
          </View>
        );
      }
      // direction === "received" → show accept button
      return (
        <TouchableOpacity
          style={[styles.connBtn, styles.connBtnPrimary]}
          onPress={handleConnect}
          activeOpacity={0.7}
        >
          <Ionicons name="checkmark" size={18} color="#FFFFFF" />
          <Text style={[styles.connBtnText, { color: "#FFFFFF" }]}>Accepter</Text>
        </TouchableOpacity>
      );
    }

    // No connection or declined → show "Se connecter"
    return (
      <TouchableOpacity
        style={[styles.connBtn, styles.connBtnPrimary]}
        onPress={handleConnect}
        activeOpacity={0.7}
      >
        <Ionicons name="person-add" size={18} color="#FFFFFF" />
        <Text style={[styles.connBtnText, { color: "#FFFFFF" }]}>Se connecter</Text>
      </TouchableOpacity>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[Colors.NAVY]}
          tintColor={Colors.NAVY}
        />
      }
    >
      {/* Header / Avatar */}
      <View style={styles.header}>
        {player.avatar_url ? (
          <Image source={{ uri: player.avatar_url }} style={styles.avatarLarge} />
        ) : (
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>
              {getInitials(player.first_name, player.last_name)}
            </Text>
          </View>
        )}
        <Text style={styles.name}>
          {player.first_name} {player.last_name}
        </Text>
        {player.username ? (
          <Text style={styles.username}>@{player.username}</Text>
        ) : null}
        {player.city ? (
          <View style={styles.cityRow}>
            <Ionicons
              name="location-outline"
              size={14}
              color={Colors.TEXT_SECONDARY}
            />
            <Text style={styles.cityText}>{player.city}</Text>
          </View>
        ) : null}

        {/* Connection Button */}
        {!isOwnProfile && renderConnectionButton()}
      </View>

      {/* Sports & Levels */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sports & Niveaux</Text>
        <View style={styles.badgeRow}>
          {player.level_tennis && (
            <View style={styles.sportBadge}>
              <Text style={styles.sportBadgeText}>
                🎾 Tennis · {LEVEL_LABELS[player.level_tennis]}
              </Text>
            </View>
          )}
          {player.level_padel && (
            <View style={styles.sportBadge}>
              <Text style={styles.sportBadgeText}>
                🏓 Padel · {LEVEL_LABELS[player.level_padel]}
              </Text>
            </View>
          )}
          {!player.level_tennis && !player.level_padel && (
            <Text style={styles.placeholder}>Aucun sport renseigné</Text>
          )}
        </View>
      </View>

      {/* Preferred mode */}
      {player.preferred_play_mode && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mode préféré</Text>
          <View style={styles.infoRow}>
            <Ionicons name="game-controller-outline" size={18} color={Colors.NAVY} />
            <Text style={styles.infoText}>
              {MODE_LABELS[player.preferred_play_mode]}
            </Text>
          </View>
        </View>
      )}

      {/* Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Statistiques</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{totalMatches}</Text>
            <Text style={styles.statLabel}>Matchs</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: Colors.SUCCESS }]}>
              {totalWins}
            </Text>
            <Text style={styles.statLabel}>Victoires</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: Colors.ERROR }]}>
              {totalLosses}
            </Text>
            <Text style={styles.statLabel}>Défaites</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{winRate}%</Text>
            <Text style={styles.statLabel}>Ratio</Text>
          </View>
        </View>
      </View>

      {/* Rankings by sport */}
      {rankings.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Classement</Text>
          {rankings.map((rk) => (
            <View key={rk.id} style={styles.rankRow}>
              <View style={styles.rankIcon}>
                <Ionicons name="trophy" size={18} color="#FFD700" />
              </View>
              <View style={styles.rankInfo}>
                <Text style={styles.rankSport}>
                  {rk.sport === "tennis" ? "🎾 Tennis" : "🏓 Padel"}
                </Text>
                <Text style={styles.rankDetail}>
                  #{rk.rank_position} · {rk.points} pts · {rk.wins}V / {rk.losses}D
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Bio */}
      {player.bio ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bio</Text>
          <Text style={styles.bioText}>{player.bio}</Text>
        </View>
      ) : null}

      {/* CTA — Proposer un match */}
      <TouchableOpacity
        style={styles.ctaButton}
        activeOpacity={0.8}
        onPress={() =>
          navigation.navigate("CreateMatch", {
            screen: "CreateOpenMatchMain",
            params: {
              invitePlayerId: playerId,
              invitePlayerName: `${player.first_name} ${player.last_name}`,
              prefilledSport: player.level_padel ? "padel" : player.level_tennis ? "tennis" : undefined,
            },
          })
        }
      >
        <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
        <Text style={styles.ctaText}>Proposer un match</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BACKGROUND,
  },
  content: {
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.BACKGROUND,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.TEXT,
    marginTop: 16,
  },

  // Header
  header: {
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarLargeText: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "bold",
  },
  name: {
    fontSize: 22,
    fontWeight: "bold",
    color: Colors.TEXT,
  },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  cityText: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
    marginLeft: 4,
  },
  username: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
    marginTop: 2,
  },

  // Sections
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.TEXT,
    marginBottom: 10,
  },

  // Sport badges
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sportBadge: {
    backgroundColor: "#E8F8EF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sportBadgeText: {
    fontSize: 14,
    color: Colors.NAVY,
    fontWeight: "600",
  },
  placeholder: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
    fontStyle: "italic",
  },

  // Info row
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoText: {
    fontSize: 15,
    color: Colors.TEXT,
  },

  // Stats grid
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    marginHorizontal: 3,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.TEXT,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.TEXT_SECONDARY,
    marginTop: 2,
  },

  // Ranking rows
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FAF5",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#D1F0E0",
  },
  rankIcon: {
    marginRight: 10,
  },
  rankInfo: {
    flex: 1,
  },
  rankSport: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.TEXT,
  },
  rankDetail: {
    fontSize: 13,
    color: Colors.TEXT_SECONDARY,
    marginTop: 2,
  },

  // Bio
  bioText: {
    fontSize: 14,
    color: Colors.TEXT,
    lineHeight: 20,
  },

  // CTA button
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.NAVY,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 28,
    paddingVertical: 14,
    gap: 8,
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  // Connection button
  connBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
  },
  connBtnPrimary: {
    backgroundColor: Colors.NAVY,
  },
  connBtnAccepted: {
    borderWidth: 1.5,
    borderColor: Colors.SUCCESS,
  },
  connBtnPending: {
    borderWidth: 1.5,
    borderColor: Colors.BORDER,
  },
  connBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
});

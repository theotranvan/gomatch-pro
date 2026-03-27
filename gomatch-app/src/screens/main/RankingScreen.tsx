import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../hooks/useAuth";
import { Colors } from "../../constants/colors";
import { FONT_SIZES, CARD_RADIUS, SECTION_SPACING } from "../../constants/theme";
import { Avatar } from "../../components/Avatar";
import { scoringService } from "../../services/scoring";
import { LoadingScreen } from "../../components/LoadingScreen";
import { EmptyState } from "../../components/EmptyState";
import { NetworkError } from "../../components/NetworkError";
import { ErrorState } from "../../components/ErrorState";
import { isNetworkError } from "../../utils/network";
import type { Ranking, Sport } from "../../types";

const SPORTS: { key: Sport; label: string; icon: keyof typeof Ionicons.glyphMap; bg: string }[] = [
  { key: "tennis", label: "Tennis", icon: "tennisball", bg: Colors.BLUE },
  { key: "padel", label: "Padel", icon: "tennisball-outline", bg: Colors.ORANGE },
];

const MEDAL_EMOJI: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export function RankingScreen() {
  const { profile } = useAuth();
  const myPlayerId = profile?.id;

  const [sport, setSport] = useState<Sport>("tennis");
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [myRanking, setMyRanking] = useState<Ranking | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const fetchRankings = useCallback(async () => {
    try {
      const [all, mine] = await Promise.allSettled([
        scoringService.getRankings(sport),
        scoringService.getMyRankings(),
      ]);
      if (all.status === "fulfilled") setRankings(all.value.slice(0, 50));
      if (mine.status === "fulfilled") {
        setMyRanking(mine.value.find((r) => r.sport === sport) ?? null);
      } else {
        setMyRanking(null);
      }
      setError(all.status === "rejected" ? all.reason : null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sport]);

  useEffect(() => {
    setLoading(true);
    fetchRankings();
  }, [fetchRankings]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRankings();
  }, [fetchRankings]);

  const ratio = (w: number, l: number) => {
    const total = w + l;
    return total === 0 ? "—" : `${Math.round((w / total) * 100)}%`;
  };

  // ── Sport pills ──
  function renderSportPills() {
    return (
      <View style={styles.pillRow}>
        {SPORTS.map((s) => {
          const active = sport === s.key;
          return (
            <TouchableOpacity
              key={s.key}
              style={[styles.pill, active && { backgroundColor: s.bg }]}
              onPress={() => setSport(s.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={s.icon}
                size={16}
                color={active ? "#FFF" : Colors.TEXT_SECONDARY}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.pillText, active && styles.pillTextActive]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  // ── My ranking highlight card (navy bg) ──
  function renderMyRankCard() {
    if (!myRanking) return null;
    return (
      <View style={styles.myCard}>
        <Text style={styles.myCardLabel}>MON CLASSEMENT</Text>
        <View style={styles.myCardRow}>
          <Avatar name={myRanking.player_name} size="md" />
          <View style={styles.myCardInfo}>
            <Text style={styles.myCardName} numberOfLines={1}>
              {myRanking.player_name}
            </Text>
            <Text style={styles.myCardStats}>
              {myRanking.wins}V / {myRanking.losses}D · {ratio(myRanking.wins, myRanking.losses)}
            </Text>
          </View>
          <View style={styles.myCardRight}>
            <Text style={styles.myCardPosition}>#{myRanking.rank_position}</Text>
            <Text style={styles.myCardPoints}>{myRanking.points} pts</Text>
          </View>
        </View>
      </View>
    );
  }

  // ── Ranking row ──
  function renderRow({ item, index }: { item: Ranking; index: number }) {
    const pos = item.rank_position;
    const isMe = item.player === myPlayerId;
    const medal = MEDAL_EMOJI[pos];
    const isEven = index % 2 === 0;

    return (
      <View style={[styles.row, isEven && styles.rowEven, isMe && styles.rowMe]}>
        {/* Position / medal */}
        <View style={styles.posCol}>
          {medal ? (
            <Text style={styles.medalEmoji}>{medal}</Text>
          ) : (
            <Text style={styles.posText}>{pos}</Text>
          )}
        </View>

        {/* Avatar */}
        <Avatar name={item.player_name} size="sm" />

        {/* Info */}
        <View style={styles.infoCol}>
          <Text style={[styles.playerName, isMe && styles.playerNameMe]} numberOfLines={1}>
            {item.player_name}
            {isMe ? " (moi)" : ""}
          </Text>
          <Text style={styles.statsText}>
            {item.wins}V / {item.losses}D · {ratio(item.wins, item.losses)}
          </Text>
        </View>

        {/* Points */}
        <View style={styles.ptsCol}>
          <Text style={[styles.ptsValue, isMe && styles.ptsValueMe]}>{item.points}</Text>
          <Text style={styles.ptsLabel}>pts</Text>
        </View>
      </View>
    );
  }

  // ── Error / empty checks ──
  if (!loading && rankings.length === 0 && !myRanking) {
    if (error) {
      return (
        <View style={styles.container}>
          {renderSportPills()}
          {isNetworkError(error)
            ? <NetworkError onRetry={() => { setLoading(true); fetchRankings(); }} />
            : <ErrorState message="Impossible de charger le classement" onRetry={() => { setLoading(true); fetchRankings(); }} />}
        </View>
      );
    }
    return (
      <View style={styles.container}>
        {renderSportPills()}
        <EmptyState
          icon="trophy-outline"
          title="Pas encore de classement"
          subtitle="Joue ton premier match compétition !"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderSportPills()}

      {loading ? (
        <LoadingScreen message="Chargement du classement…" />
      ) : (
        <FlatList
          data={rankings}
          keyExtractor={(item) => item.id}
          renderItem={renderRow}
          ListHeaderComponent={
            <>
              {renderMyRankCard()}
              <Text style={styles.sectionTitle}>Top 50</Text>
            </>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.BLUE}
              colors={[Colors.BLUE]}
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.BACKGROUND },

  // ── Sport pills ──
  pillRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 12,
  },
  pill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: Colors.CARD_BG,
  },
  pillText: { fontSize: FONT_SIZES.body, fontWeight: "600", color: Colors.TEXT_SECONDARY },
  pillTextActive: { color: "#FFFFFF", fontWeight: "700" },

  // ── List ──
  listContent: { paddingHorizontal: 20, paddingBottom: 32 },
  sectionTitle: {
    fontSize: FONT_SIZES.h3,
    fontWeight: "700",
    color: Colors.TEXT,
    marginTop: 20,
    marginBottom: 12,
  },

  // ═══════════════════════════
  // My ranking card (navy bg)
  // ═══════════════════════════
  myCard: {
    backgroundColor: Colors.NAVY,
    borderRadius: CARD_RADIUS,
    padding: 18,
    marginTop: 8,
  },
  myCardLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.6)",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  myCardRow: { flexDirection: "row", alignItems: "center" },
  myCardInfo: { flex: 1, marginLeft: 14 },
  myCardName: { fontSize: FONT_SIZES.h3, fontWeight: "700", color: "#FFFFFF" },
  myCardStats: { fontSize: FONT_SIZES.caption, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  myCardRight: { alignItems: "flex-end" },
  myCardPosition: { fontSize: FONT_SIZES.h2, fontWeight: "800", color: "#FFFFFF" },
  myCardPoints: { fontSize: FONT_SIZES.caption, color: "rgba(255,255,255,0.7)", marginTop: 2 },

  // ═══════════════════════════
  // Ranking rows
  // ═══════════════════════════
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 2,
  },
  rowEven: { backgroundColor: Colors.SURFACE },
  rowMe: { backgroundColor: "#EFF6FF" },

  posCol: { width: 36, alignItems: "center" },
  medalEmoji: { fontSize: 20 },
  posText: { fontSize: FONT_SIZES.body, fontWeight: "700", color: Colors.TEXT_SECONDARY },

  infoCol: { flex: 1, marginLeft: 12, marginRight: 8 },
  playerName: { fontSize: FONT_SIZES.body, fontWeight: "600", color: Colors.TEXT },
  playerNameMe: { color: Colors.BLUE, fontWeight: "700" },
  statsText: { fontSize: FONT_SIZES.caption, color: Colors.TEXT_SECONDARY, marginTop: 2 },

  ptsCol: { alignItems: "center", minWidth: 48 },
  ptsValue: { fontSize: FONT_SIZES.h2, fontWeight: "800", color: Colors.TEXT },
  ptsValueMe: { color: Colors.BLUE },
  ptsLabel: { fontSize: 10, color: Colors.TEXT_SECONDARY, fontWeight: "500" },
});

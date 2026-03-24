import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../hooks/useAuth";
import { Colors } from "../../constants/colors";
import { scoringService } from "../../services/scoring";
import type { Ranking, Sport } from "../../types";

const SPORTS: { key: Sport; label: string }[] = [
  { key: "tennis", label: "Tennis" },
  { key: "padel", label: "Padel" },
];

const MEDAL_COLORS: Record<number, string> = {
  1: "#FFD700",
  2: "#C0C0C0",
  3: "#CD7F32",
};

export function RankingScreen() {
  const { profile } = useAuth();
  const myPlayerId = profile?.id;

  const [sport, setSport] = useState<Sport>("tennis");
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [myRanking, setMyRanking] = useState<Ranking | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRankings = useCallback(async () => {
    try {
      const [all, mine] = await Promise.allSettled([
        scoringService.getRankings(sport),
        scoringService.getMyRankings(),
      ]);

      if (all.status === "fulfilled") {
        setRankings(all.value.slice(0, 50));
      }

      if (mine.status === "fulfilled") {
        const myRank = mine.value.find((r) => r.sport === sport) ?? null;
        setMyRanking(myRank);
      } else {
        setMyRanking(null);
      }
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

  const getInitials = (name: string) => {
    const parts = name.split(" ");
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  };

  const ratio = (w: number, l: number) => {
    const total = w + l;
    return total === 0 ? "—" : `${Math.round((w / total) * 100)}%`;
  };

  // ── Empty state ──
  if (!loading && rankings.length === 0 && !myRanking) {
    return (
      <View style={styles.container}>
        {renderTabs()}
        <View style={styles.emptyContainer}>
          <Ionicons name="trophy-outline" size={64} color={Colors.BORDER} />
          <Text style={styles.emptyTitle}>Pas encore de classement</Text>
          <Text style={styles.emptySubtitle}>
            Joue ton premier match compétition !
          </Text>
        </View>
      </View>
    );
  }

  // ── Tabs ──
  function renderTabs() {
    return (
      <View style={styles.tabsContainer}>
        {SPORTS.map((s) => (
          <TouchableOpacity
            key={s.key}
            style={[styles.tab, sport === s.key && styles.tabActive]}
            onPress={() => setSport(s.key)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={s.key === "tennis" ? "tennisball-outline" : "football-outline"}
              size={16}
              color={sport === s.key ? "#FFF" : Colors.TEXT_SECONDARY}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[styles.tabText, sport === s.key && styles.tabTextActive]}
            >
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  // ── Row ──
  function renderRow(item: Ranking, isMe: boolean) {
    const pos = item.rank_position;
    const medal = MEDAL_COLORS[pos];

    return (
      <View style={[styles.row, isMe && styles.rowHighlighted]}>
        {/* Position */}
        <View style={styles.positionContainer}>
          {medal ? (
            <View style={[styles.medalBadge, { backgroundColor: medal }]}>
              <Text style={styles.medalText}>{pos}</Text>
            </View>
          ) : (
            <Text style={styles.positionText}>{pos}</Text>
          )}
        </View>

        {/* Avatar */}
        <View
          style={[
            styles.avatar,
            isMe && { borderColor: Colors.PRIMARY, borderWidth: 2 },
          ]}
        >
          <Text style={styles.avatarText}>{getInitials(item.player_name)}</Text>
        </View>

        {/* Info */}
        <View style={styles.infoContainer}>
          <Text style={[styles.playerName, isMe && styles.playerNameMe]} numberOfLines={1}>
            {item.player_name}
            {isMe ? " (moi)" : ""}
          </Text>
          <Text style={styles.statsText}>
            {item.wins}V / {item.losses}D · {ratio(item.wins, item.losses)}
          </Text>
        </View>

        {/* Points */}
        <View style={styles.pointsContainer}>
          <Text style={[styles.pointsValue, isMe && styles.pointsValueMe]}>
            {item.points}
          </Text>
          <Text style={styles.pointsLabel}>pts</Text>
        </View>
      </View>
    );
  }

  // ── Header (my ranking) ──
  function renderHeader() {
    return (
      <View>
        {myRanking && (
          <>
            <View style={styles.myRankCard}>
              <Text style={styles.myRankTitle}>Mon classement</Text>
              {renderRow(myRanking, true)}
            </View>
            <View style={styles.separator} />
          </>
        )}
        <Text style={styles.sectionTitle}>Top 50</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderTabs()}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.PRIMARY} />
        </View>
      ) : (
        <FlatList
          data={rankings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) =>
            renderRow(item, item.player === myPlayerId)
          }
          ListHeaderComponent={renderHeader}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.PRIMARY}
              colors={[Colors.PRIMARY]}
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
  container: {
    flex: 1,
    backgroundColor: Colors.BACKGROUND,
  },

  // ── Tabs ──
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
  },
  tabActive: {
    backgroundColor: Colors.PRIMARY,
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.TEXT_SECONDARY,
  },
  tabTextActive: {
    color: "#FFF",
  },

  // ── Loading ──
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // ── List ──
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },

  // ── My rank card ──
  myRankCard: {
    backgroundColor: "#F0FAF5",
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#D1F0E0",
  },
  myRankTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.PRIMARY,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },

  // ── Separator ──
  separator: {
    height: 1,
    backgroundColor: Colors.BORDER,
    marginVertical: 16,
  },

  // ── Section title ──
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.TEXT,
    marginBottom: 12,
  },

  // ── Row ──
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: 4,
  },
  rowHighlighted: {
    backgroundColor: "#E8F8EF",
  },

  // ── Position ──
  positionContainer: {
    width: 36,
    alignItems: "center",
  },
  positionText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.TEXT_SECONDARY,
  },
  medalBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  medalText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFF",
  },

  // ── Avatar ──
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8E8E8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.TEXT_SECONDARY,
  },

  // ── Info ──
  infoContainer: {
    flex: 1,
    marginRight: 8,
  },
  playerName: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.TEXT,
  },
  playerNameMe: {
    color: Colors.PRIMARY,
    fontWeight: "700",
  },
  statsText: {
    fontSize: 12,
    color: Colors.TEXT_SECONDARY,
    marginTop: 2,
  },

  // ── Points ──
  pointsContainer: {
    alignItems: "center",
    minWidth: 50,
  },
  pointsValue: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.TEXT,
  },
  pointsValueMe: {
    color: Colors.PRIMARY,
  },
  pointsLabel: {
    fontSize: 11,
    color: Colors.TEXT_SECONDARY,
    fontWeight: "500",
  },

  // ── Empty ──
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.TEXT,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
    textAlign: "center",
    marginTop: 8,
  },
});

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Colors } from "../../constants/colors";
import { MatchCard } from "../../components/MatchCard";
import { LoadingScreen } from "../../components/LoadingScreen";
import { EmptyState } from "../../components/EmptyState";
import { NetworkError } from "../../components/NetworkError";
import { ErrorState } from "../../components/ErrorState";
import { matchesService } from "../../services/matches";
import { isNetworkError } from "../../utils/network";
import type { MatchListItem, Sport } from "../../types";
import type { HomeStackParamList } from "../../navigation/HomeStack";

type Nav = NativeStackNavigationProp<HomeStackParamList>;

type TabKey = "upcoming" | "past" | "all";

const TABS: { key: TabKey; label: string }[] = [
  { key: "upcoming", label: "À venir" },
  { key: "past", label: "Passés" },
  { key: "all", label: "Tous" },
];

const SPORT_FILTERS: { value: Sport | null; label: string }[] = [
  { value: null, label: "Tous" },
  { value: "tennis", label: "🎾 Tennis" },
  { value: "padel", label: "🏓 Padel" },
];

export function MatchListScreen() {
  const navigation = useNavigation<Nav>();
  const [tab, setTab] = useState<TabKey>("upcoming");
  const [sportFilter, setSportFilter] = useState<Sport | null>(null);
  const [matches, setMatches] = useState<MatchListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const fetchMatches = useCallback(async () => {
    try {
      const res = await matchesService.getMyMatches();
      setMatches(res.results);
      setError(null);
    } catch (err) {
      setError(err);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchMatches().finally(() => setLoading(false));
  }, [fetchMatches]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMatches();
    setRefreshing(false);
  }, [fetchMatches]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filtered = matches.filter((m) => {
    // Sport filter
    if (sportFilter && m.sport !== sportFilter) return false;

    // Tab filter
    const matchDate = new Date(m.scheduled_date);
    if (tab === "upcoming") {
      return (
        matchDate >= today &&
        m.status !== "completed" &&
        m.status !== "cancelled"
      );
    }
    if (tab === "past") {
      return m.status === "completed" || m.status === "cancelled" || matchDate < today;
    }
    return true; // "all"
  });

  // Sort: upcoming ascending, past descending, all descending
  const sorted = [...filtered].sort((a, b) => {
    const da = new Date(a.scheduled_date + "T" + a.scheduled_time);
    const db = new Date(b.scheduled_date + "T" + b.scheduled_time);
    return tab === "upcoming"
      ? da.getTime() - db.getTime()
      : db.getTime() - da.getTime();
  });

  if (loading) {
    return <LoadingScreen message="Chargement des matchs…" />;
  }

  if (error && matches.length === 0) {
    if (isNetworkError(error)) {
      return <NetworkError onRetry={() => { setLoading(true); fetchMatches().finally(() => setLoading(false)); }} />;
    }
    return <ErrorState message="Impossible de charger les matchs" onRetry={() => { setLoading(true); fetchMatches().finally(() => setLoading(false)); }} />;
  }

  return (
    <View style={styles.container}>
      {/* ── Tabs ── */}
      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Sport filter ── */}
      <View style={styles.filterRow}>
        {SPORT_FILTERS.map((sf) => (
          <TouchableOpacity
            key={sf.label}
            style={[
              styles.filterChip,
              sportFilter === sf.value && styles.filterChipActive,
            ]}
            onPress={() => setSportFilter(sf.value)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterText,
                sportFilter === sf.value && styles.filterTextActive,
              ]}
            >
              {sf.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── List ── */}
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.PRIMARY}
            colors={[Colors.PRIMARY]}
          />
        }
        renderItem={({ item }) => (
          <MatchCard
            match={item}
            onPress={() => navigation.navigate("MatchDetail", { matchId: item.id })}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="tennisball-outline"
            title="Aucun match"
            subtitle={
              tab === "upcoming"
                ? "Tu n'as pas de match à venir."
                : tab === "past"
                  ? "Aucun match passé pour le moment."
                  : "Aucun match trouvé."
            }
            actionLabel={tab === "upcoming" ? "Créer un match" : undefined}
            onAction={tab === "upcoming" ? () => navigation.getParent()?.navigate("CreateMatch") : undefined}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },

  // ── Tabs ──
  tabBar: {
    flexDirection: "row",
    backgroundColor: Colors.BACKGROUND,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: Colors.PRIMARY,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.TEXT_SECONDARY,
  },
  tabTextActive: {
    color: Colors.PRIMARY,
  },

  // ── Filters ──
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: Colors.BACKGROUND,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.BORDER,
    backgroundColor: "#FAFAFA",
  },
  filterChipActive: {
    borderColor: Colors.PRIMARY,
    backgroundColor: "#E8F5EE",
  },
  filterText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.TEXT_SECONDARY,
  },
  filterTextActive: {
    color: Colors.PRIMARY,
  },

  // ── List ──
  list: {
    padding: 16,
    paddingBottom: 40,
  },

  // ── Empty ──
  empty: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.TEXT,
    marginTop: 16,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
    textAlign: "center",
    lineHeight: 20,
  },
});

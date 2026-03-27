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
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { Colors } from "../../constants/colors";
import { openMatchesService } from "../../services/openMatches";
import { formatDate, formatTime } from "../../utils/helpers";
import { LoadingScreen } from "../../components/LoadingScreen";
import { EmptyState } from "../../components/EmptyState";
import { NetworkError } from "../../components/NetworkError";
import { ErrorState } from "../../components/ErrorState";
import { isNetworkError } from "../../utils/network";
import { AppHeader } from "../../components/AppHeader";
import type { OpenMatchListItem, Sport, SkillLevel } from "../../types";

const LEVEL_LABELS: Record<SkillLevel, string> = {
  beginner: "Débutant",
  intermediate: "Intermédiaire",
  advanced: "Avancé",
};

const LEVEL_SHORT: Record<SkillLevel, string> = {
  beginner: "Déb.",
  intermediate: "Inter.",
  advanced: "Avancé",
};

const SPORT_FILTERS: { value: Sport | null; label: string }[] = [
  { value: null, label: "Tous" },
  { value: "tennis", label: "🎾 Tennis" },
  { value: "padel", label: "🏓 Padel" },
];

const LEVEL_FILTERS: { value: SkillLevel | null; label: string }[] = [
  { value: null, label: "Tous niveaux" },
  { value: "beginner", label: "Débutant" },
  { value: "intermediate", label: "Inter." },
  { value: "advanced", label: "Avancé" },
];

export function OpenMatchesScreen() {
  const navigation = useNavigation<any>();
  const [matches, setMatches] = useState<OpenMatchListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sportFilter, setSportFilter] = useState<Sport | null>(null);
  const [levelFilter, setLevelFilter] = useState<SkillLevel | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);

  const fetchMatches = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (sportFilter) params.sport = sportFilter;
      if (levelFilter) params.required_level_min = levelFilter;
      const res = await openMatchesService.getOpenMatches(params as any);
      setMatches(res.results);
      setError(null);
    } catch (err) {
      setError(err);
    }
  }, [sportFilter, levelFilter]);

  useEffect(() => {
    setLoading(true);
    fetchMatches().finally(() => setLoading(false));
  }, [fetchMatches]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMatches();
    setRefreshing(false);
  }, [fetchMatches]);

  const handleJoin = async (match: OpenMatchListItem) => {
    setJoiningId(match.id);
    try {
      await openMatchesService.joinOpenMatch(match.id);
      Toast.show({ type: "success", text1: "Rejoint !", text2: "Tu as rejoint la session." });
      await fetchMatches();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Impossible de rejoindre.";
      Toast.show({ type: "error", text1: "Erreur", text2: msg });
    } finally {
      setJoiningId(null);
    }
  };

  const renderCard = ({ item }: { item: OpenMatchListItem }) => {
    const isFull = item.spots_left <= 0;
    const levelLabel =
      item.required_level_min && item.required_level_max
        ? `${LEVEL_SHORT[item.required_level_min]} – ${LEVEL_SHORT[item.required_level_max]}`
        : item.required_level_min
          ? LEVEL_SHORT[item.required_level_min] + "+"
          : "Tous niveaux";

    return (
      <View style={[styles.card, isFull && styles.cardFull]}>
        <View style={styles.cardHeader}>
          <View style={styles.sportBadge}>
            <Text style={styles.sportEmoji}>
              {item.sport === "tennis" ? "🎾" : "🏓"}
            </Text>
          </View>

          <View style={styles.cardInfo}>
            <Text style={styles.cardCreator} numberOfLines={1}>
              {item.created_by_name}
            </Text>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>{levelLabel}</Text>
            </View>
          </View>

          {isFull ? (
            <View style={styles.fullBadge}>
              <Text style={styles.fullBadgeText}>COMPLET</Text>
            </View>
          ) : (
            <View style={styles.spotsContainer}>
              <Text style={[styles.spotsCount, item.spots_left === 1 && styles.spotsUrgent]}>
                {item.max_participants - item.spots_left}/{item.max_participants}
              </Text>
              <Text style={styles.spotsLabel}>joueurs</Text>
            </View>
          )}
        </View>

        {item.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={14} color={Colors.TEXT_SECONDARY} />
            <Text style={styles.metaText}>{formatDate(item.scheduled_date)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color={Colors.TEXT_SECONDARY} />
            <Text style={styles.metaText}>{formatTime(item.scheduled_time)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={14} color={Colors.TEXT_SECONDARY} />
            <Text style={[styles.metaText, item.spots_left === 1 && styles.spotsUrgent]}>
              {item.spots_left} place{item.spots_left !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>

        {!isFull && (
          <TouchableOpacity
            style={styles.joinBtn}
            onPress={() => handleJoin(item)}
            disabled={joiningId === item.id}
            activeOpacity={0.8}
          >
            {joiningId === item.id ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Ionicons name="enter-outline" size={18} color="#FFF" />
                <Text style={styles.joinBtnText}>Rejoindre</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading && matches.length === 0) {
    return <LoadingScreen message="Chargement des sessions…" />;
  }

  if (error && matches.length === 0) {
    if (isNetworkError(error)) {
      return <NetworkError onRetry={() => { setLoading(true); fetchMatches().finally(() => setLoading(false)); }} />;
    }
    return <ErrorState message="Impossible de charger les sessions" onRetry={() => { setLoading(true); fetchMatches().finally(() => setLoading(false)); }} />;
  }

  return (
    <View style={styles.container}>
      <AppHeader />
      {/* ── Filters ── */}
      <View style={styles.filtersContainer}>
        <View style={styles.filterRow}>
          {SPORT_FILTERS.map((sf) => (
            <TouchableOpacity
              key={sf.label}
              style={[styles.filterChip, sportFilter === sf.value && styles.filterChipActive]}
              onPress={() => setSportFilter(sf.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterText, sportFilter === sf.value && styles.filterTextActive]}>
                {sf.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.filterRow}>
          {LEVEL_FILTERS.map((lf) => (
            <TouchableOpacity
              key={lf.label}
              style={[styles.filterChip, levelFilter === lf.value && styles.filterChipActive]}
              onPress={() => setLevelFilter(lf.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterText, levelFilter === lf.value && styles.filterTextActive]}>
                {lf.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── List ── */}
      <FlatList
        data={matches}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.NAVY}
            colors={[Colors.NAVY]}
          />
        }
        renderItem={renderCard}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="search-outline"
              title="Aucune session ouverte"
              subtitle="Personne n'a publié de session pour le moment."
              actionLabel="Publier une session"
              onAction={() => navigation.navigate("CreateOpenMatch")}
            />
          ) : null
        }
      />

      {/* ── FAB ── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("CreateOpenMatch")}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },

  // ── Filters ──
  filtersContainer: {
    backgroundColor: Colors.BACKGROUND,
    paddingBottom: 8,
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 8,
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
    borderColor: Colors.NAVY,
    backgroundColor: "#E8F5EE",
  },
  filterText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.TEXT_SECONDARY,
  },
  filterTextActive: {
    color: Colors.NAVY,
  },

  // ── List ──
  list: {
    padding: 16,
    paddingBottom: 40,
  },

  // ── Card ──
  card: {
    backgroundColor: Colors.BACKGROUND,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cardFull: {
    opacity: 0.55,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  sportBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.NAVY + "12",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  sportEmoji: {
    fontSize: 22,
  },
  cardInfo: {
    flex: 1,
  },
  cardCreator: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.TEXT,
    marginBottom: 4,
  },
  levelBadge: {
    alignSelf: "flex-start",
    backgroundColor: Colors.NAVY + "15",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  levelText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.NAVY,
  },
  spotsContainer: {
    alignItems: "center",
  },
  spotsCount: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.TEXT,
  },
  spotsUrgent: {
    color: Colors.ERROR,
    fontWeight: "700",
  },
  spotsLabel: {
    fontSize: 11,
    color: Colors.TEXT_SECONDARY,
  },
  fullBadge: {
    backgroundColor: Colors.TEXT_SECONDARY + "20",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  fullBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.TEXT_SECONDARY,
  },

  description: {
    fontSize: 13,
    color: Colors.TEXT_SECONDARY,
    marginTop: 10,
    fontStyle: "italic",
    lineHeight: 18,
  },

  cardMeta: {
    flexDirection: "row",
    marginTop: 12,
    gap: 16,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: Colors.TEXT_SECONDARY,
    fontWeight: "500",
  },

  // ── Join button ──
  joinBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.NAVY,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 14,
  },
  joinBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
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
    marginBottom: 16,
  },
  emptyBtn: {
    backgroundColor: Colors.NAVY,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  // ── FAB ──
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.NAVY,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.NAVY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
});

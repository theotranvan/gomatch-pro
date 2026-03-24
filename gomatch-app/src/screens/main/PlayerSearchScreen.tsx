import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";
import { playersService, PlayerFilters } from "../../services/players";
import { getInitials } from "../../utils/helpers";
import type { PlayerProfile, Sport, SkillLevel, PlayMode } from "../../types";

// ── Filter options ───────────────────────────────────────────────────────────
type Option<T> = { value: T | null; label: string };

const SPORTS: Option<Sport>[] = [
  { value: null, label: "Tous" },
  { value: "tennis", label: "🎾 Tennis" },
  { value: "padel", label: "🏓 Padel" },
];

const LEVELS: Option<SkillLevel>[] = [
  { value: null, label: "Tous" },
  { value: "beginner", label: "Débutant" },
  { value: "intermediate", label: "Inter." },
  { value: "advanced", label: "Avancé" },
];

const MODES: Option<PlayMode>[] = [
  { value: null, label: "Tous" },
  { value: "friendly", label: "Amical" },
  { value: "competitive", label: "Compétition" },
  { value: "both", label: "Les deux" },
];

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
export function PlayerSearchScreen() {
  const navigation = useNavigation<any>();

  // Search & Filters
  const [search, setSearch] = useState("");
  const [sport, setSport] = useState<Sport | null>(null);
  const [level, setLevel] = useState<SkillLevel | null>(null);
  const [city, setCity] = useState("");
  const [playMode, setPlayMode] = useState<PlayMode | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Data
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchPlayers = useCallback(
    async (pageNum: number, append = false) => {
      try {
        const filters: PlayerFilters = { page: pageNum };
        if (search.trim()) filters.search = search.trim();
        if (sport) filters.sport = sport;
        if (city.trim()) filters.city = city.trim();
        if (playMode) filters.preferred_play_mode = playMode;

        // Map generic level to the correct sport-specific field
        if (level) {
          if (sport === "tennis") filters.level_tennis = level;
          else if (sport === "padel") filters.level_padel = level;
          else {
            // No sport filter → search both
            filters.level_tennis = level;
          }
        }

        const data = await playersService.getPlayers(filters);
        setPlayers(append ? (prev) => [...prev, ...data.results] : data.results);
        setHasMore(data.next !== null);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [search, sport, level, city, playMode]
  );

  // Debounced search trigger
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      setLoading(true);
      fetchPlayers(1);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchPlayers]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    fetchPlayers(1);
  }, [fetchPlayers]);

  const onEndReached = useCallback(() => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    const next = page + 1;
    setPage(next);
    fetchPlayers(next, true);
  }, [hasMore, loadingMore, page, fetchPlayers]);

  // ── Filter pills (inline row) ───────────────────────────────────────────
  function renderPills<T>(
    options: Option<T>[],
    value: T | null,
    onSelect: (v: T | null) => void
  ) {
    return (
      <View style={styles.pillRow}>
        {options.map((opt) => {
          const active =
            opt.value === value || (opt.value === null && value === null);
          return (
            <TouchableOpacity
              key={String(opt.value ?? "all")}
              style={[styles.pill, active && styles.pillActive]}
              onPress={() => onSelect(opt.value)}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  // ── Player row ──────────────────────────────────────────────────────────
  function renderPlayer({ item }: { item: PlayerProfile }) {
    const badges: string[] = [];
    if (item.level_tennis)
      badges.push(`🎾 ${LEVEL_LABELS[item.level_tennis] ?? item.level_tennis}`);
    if (item.level_padel)
      badges.push(`🏓 ${LEVEL_LABELS[item.level_padel] ?? item.level_padel}`);

    return (
      <TouchableOpacity
        style={styles.playerRow}
        activeOpacity={0.7}
        onPress={() => navigation.navigate("PlayerProfile", { playerId: item.id })}
      >
        {/* Avatar */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {getInitials(item.first_name, item.last_name)}
          </Text>
        </View>

        {/* Info */}
        <View style={styles.playerInfo}>
          <Text style={styles.playerName} numberOfLines={1}>
            {item.first_name} {item.last_name}
          </Text>

          {item.city ? (
            <Text style={styles.playerCity} numberOfLines={1}>
              <Ionicons name="location-outline" size={12} color={Colors.TEXT_SECONDARY} />{" "}
              {item.city}
            </Text>
          ) : null}

          {/* Sport badges */}
          {badges.length > 0 && (
            <View style={styles.badgeRow}>
              {badges.map((b) => (
                <View key={b} style={styles.badge}>
                  <Text style={styles.badgeText}>{b}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Preferred mode */}
          {item.preferred_play_mode && (
            <Text style={styles.modeText}>
              {MODE_LABELS[item.preferred_play_mode] ?? item.preferred_play_mode}
            </Text>
          )}
        </View>

        <Ionicons name="chevron-forward" size={20} color={Colors.BORDER} />
      </TouchableOpacity>
    );
  }

  // ── Empty state ─────────────────────────────────────────────────────────
  function renderEmpty() {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={64} color={Colors.BORDER} />
        <Text style={styles.emptyTitle}>Aucun joueur trouvé</Text>
        <Text style={styles.emptySubtitle}>
          Essaie avec d'autres critères de recherche
        </Text>
      </View>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons
          name="search"
          size={18}
          color={Colors.TEXT_SECONDARY}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un joueur…"
          placeholderTextColor={Colors.TEXT_SECONDARY}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color={Colors.TEXT_SECONDARY} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.filterToggle}
          onPress={() => setShowFilters((v) => !v)}
        >
          <Ionicons
            name={showFilters ? "options" : "options-outline"}
            size={22}
            color={showFilters ? Colors.PRIMARY : Colors.TEXT_SECONDARY}
          />
        </TouchableOpacity>
      </View>

      {/* Filters panel */}
      {showFilters && (
        <View style={styles.filtersPanel}>
          <Text style={styles.filterLabel}>Sport</Text>
          {renderPills(SPORTS, sport, setSport)}

          <Text style={styles.filterLabel}>Niveau{sport ? "" : " (tennis)"}</Text>
          {renderPills(LEVELS, level, setLevel)}

          <Text style={styles.filterLabel}>Mode préféré</Text>
          {renderPills(MODES, playMode, setPlayMode)}

          <Text style={styles.filterLabel}>Ville</Text>
          <TextInput
            style={styles.cityInput}
            placeholder="Ex : Lausanne"
            placeholderTextColor={Colors.TEXT_SECONDARY}
            value={city}
            onChangeText={setCity}
            autoCapitalize="words"
          />
        </View>
      )}

      {/* Loading */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color={Colors.PRIMARY}
          style={styles.loader}
        />
      ) : (
        <FlatList
          data={players}
          keyExtractor={(item) => item.id}
          renderItem={renderPlayer}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.PRIMARY]}
              tintColor={Colors.PRIMARY}
            />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                color={Colors.PRIMARY}
                style={{ marginVertical: 16 }}
              />
            ) : null
          }
          contentContainerStyle={
            players.length === 0 ? styles.emptyList : styles.listContent
          }
        />
      )}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BACKGROUND,
  },

  // Search bar
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.TEXT,
    height: 44,
  },
  filterToggle: {
    marginLeft: 8,
    padding: 4,
  },

  // Filters panel
  filtersPanel: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.TEXT_SECONDARY,
    marginTop: 8,
    marginBottom: 4,
  },
  cityInput: {
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 36,
    fontSize: 14,
    color: Colors.TEXT,
  },

  // Pills
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F0F0F0",
  },
  pillActive: {
    backgroundColor: Colors.PRIMARY,
  },
  pillText: {
    fontSize: 13,
    color: Colors.TEXT,
  },
  pillTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },

  // Player row
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.TEXT,
  },
  playerCity: {
    fontSize: 13,
    color: Colors.TEXT_SECONDARY,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  badge: {
    backgroundColor: "#E8F8EF",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 12,
    color: Colors.PRIMARY,
    fontWeight: "500",
  },
  modeText: {
    fontSize: 12,
    color: Colors.TEXT_SECONDARY,
    marginTop: 3,
  },

  // Empty / Loading
  loader: {
    marginTop: 40,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.TEXT,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
    marginTop: 4,
  },
  emptyList: {
    flexGrow: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
});

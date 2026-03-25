import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";
import { venuesService } from "../../services/venues";
import { LoadingScreen } from "../../components/LoadingScreen";
import { EmptyState } from "../../components/EmptyState";
import { NetworkError } from "../../components/NetworkError";
import { ErrorState } from "../../components/ErrorState";
import { isNetworkError } from "../../utils/network";
import type { VenueListItem, Sport } from "../../types";

const SPORT_FILTERS: { value: Sport | null; label: string }[] = [
  { value: null, label: "Tous" },
  { value: "tennis", label: "🎾 Tennis" },
  { value: "padel", label: "🏓 Padel" },
];

const PLACEHOLDER_COLORS = [
  "#E8F5EE",
  "#E3F2FD",
  "#FFF3E0",
  "#F3E5F5",
  "#E0F2F1",
  "#FBE9E7",
];

function getPlaceholderColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PLACEHOLDER_COLORS[Math.abs(hash) % PLACEHOLDER_COLORS.length];
}

export function VenueListScreen() {
  const navigation = useNavigation<any>();
  const [venues, setVenues] = useState<VenueListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [sportFilter, setSportFilter] = useState<Sport | null>(null);
  const [error, setError] = useState<unknown>(null);

  const fetchVenues = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (search.trim()) params.city = search.trim();
      if (sportFilter) params.sport = sportFilter;
      const res = await venuesService.getVenues(params as any);
      setVenues(res.results);
      setError(null);
    } catch (err) {
      setError(err);
    }
  }, [search, sportFilter]);

  useEffect(() => {
    setLoading(true);
    fetchVenues().finally(() => setLoading(false));
  }, [fetchVenues]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchVenues();
    setRefreshing(false);
  }, [fetchVenues]);

  const renderCard = ({ item }: { item: VenueListItem }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate("VenueDetail", { venueId: item.id })}
      activeOpacity={0.85}
    >
      {/* ── Image ── */}
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.cardImage} />
      ) : (
        <View
          style={[
            styles.cardImage,
            styles.placeholder,
            { backgroundColor: getPlaceholderColor(item.id) },
          ]}
        >
          <Ionicons name="business-outline" size={36} color={Colors.PRIMARY} />
        </View>
      )}

      {/* ── Info ── */}
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>
          {item.name}
        </Text>

        <View style={styles.cardRow}>
          <Ionicons
            name="location-outline"
            size={14}
            color={Colors.TEXT_SECONDARY}
          />
          <Text style={styles.cardCity}>{item.city}</Text>
        </View>

        <View style={styles.cardRow}>
          <Ionicons
            name="tennisball-outline"
            size={14}
            color={Colors.PRIMARY}
          />
          <Text style={styles.cardCourts}>
            {item.court_count} terrain{item.court_count !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      <Ionicons
        name="chevron-forward"
        size={20}
        color={Colors.BORDER}
        style={styles.chevron}
      />
    </TouchableOpacity>
  );

  if (loading && venues.length === 0) {
    return <LoadingScreen message="Chargement des clubs…" />;
  }

  if (error && venues.length === 0) {
    if (isNetworkError(error)) {
      return <NetworkError onRetry={() => { setLoading(true); fetchVenues().finally(() => setLoading(false)); }} />;
    }
    return <ErrorState message="Impossible de charger les clubs" onRetry={() => { setLoading(true); fetchVenues().finally(() => setLoading(false)); }} />;
  }

  return (
    <View style={styles.container}>
      {/* ── Search ── */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons
            name="search"
            size={18}
            color={Colors.TEXT_SECONDARY}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une ville…"
            placeholderTextColor={Colors.TEXT_SECONDARY}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons
                name="close-circle"
                size={18}
                color={Colors.TEXT_SECONDARY}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Sport filter chips ── */}
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
      </View>

      {/* ── List ── */}
      <FlatList
        data={venues}
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
        renderItem={renderCard}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="location-outline"
              title="Aucun club trouvé"
              subtitle="Essaie une autre ville ou un autre sport."
            />
          ) : null
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

  // ── Search ──
  searchContainer: {
    backgroundColor: Colors.BACKGROUND,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: "#F0F0F0",
    borderRadius: 12,
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
    paddingVertical: 0,
  },

  // ── Filters ──
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 10,
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

  // ── Card (Google Maps style) ──
  card: {
    flexDirection: "row",
    backgroundColor: Colors.BACKGROUND,
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cardImage: {
    width: 100,
    height: 100,
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    flex: 1,
    padding: 12,
    justifyContent: "center",
  },
  cardName: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.TEXT,
    marginBottom: 6,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 3,
  },
  cardCity: {
    fontSize: 13,
    color: Colors.TEXT_SECONDARY,
    fontWeight: "500",
  },
  cardCourts: {
    fontSize: 13,
    color: Colors.PRIMARY,
    fontWeight: "600",
  },
  chevron: {
    alignSelf: "center",
    marginRight: 12,
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

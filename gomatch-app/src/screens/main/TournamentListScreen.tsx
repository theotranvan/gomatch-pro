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
import { TournamentCard } from "../../components/TournamentCard";
import { LoadingScreen } from "../../components/LoadingScreen";
import { EmptyState } from "../../components/EmptyState";
import { NetworkError } from "../../components/NetworkError";
import { ErrorState } from "../../components/ErrorState";
import { tournamentsService } from "../../services/tournaments";
import { isNetworkError } from "../../utils/network";
import type { TournamentListItem, Sport, TournamentStatus } from "../../types";
import type { TournamentsStackParamList } from "../../navigation/TournamentsStack";

type Nav = NativeStackNavigationProp<TournamentsStackParamList>;

type StatusTab = TournamentStatus | "all";

const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "registration", label: "Inscriptions" },
  { key: "in_progress", label: "En cours" },
  { key: "completed", label: "Terminés" },
];

const SPORT_FILTERS: { value: Sport | null; label: string }[] = [
  { value: null, label: "Tous" },
  { value: "tennis", label: "🎾 Tennis" },
  { value: "padel", label: "🏓 Padel" },
];

export function TournamentListScreen() {
  const navigation = useNavigation<Nav>();
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [sportFilter, setSportFilter] = useState<Sport | null>(null);
  const [tournaments, setTournaments] = useState<TournamentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const fetchTournaments = useCallback(async () => {
    try {
      const res = await tournamentsService.getTournaments();
      setTournaments(res.results);
      setError(null);
    } catch (err) {
      setError(err);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchTournaments().finally(() => setLoading(false));
  }, [fetchTournaments]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTournaments();
    setRefreshing(false);
  }, [fetchTournaments]);

  const filtered = tournaments.filter((t) => {
    if (sportFilter && t.sport !== sportFilter) return false;
    if (statusTab !== "all" && t.status !== statusTab) return false;
    return true;
  });

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
  );

  if (loading) {
    return <LoadingScreen message="Chargement des tournois…" />;
  }

  if (error && tournaments.length === 0) {
    if (isNetworkError(error)) {
      return (
        <NetworkError
          onRetry={() => {
            setLoading(true);
            fetchTournaments().finally(() => setLoading(false));
          }}
        />
      );
    }
    return (
      <ErrorState
        message="Impossible de charger les tournois"
        onRetry={() => {
          setLoading(true);
          fetchTournaments().finally(() => setLoading(false));
        }}
      />
    );
  }

  return (
    <View style={s.container}>
      {/* Status tabs */}
      <View style={s.tabBar}>
        {STATUS_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tab, statusTab === tab.key && s.tabActive]}
            onPress={() => setStatusTab(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[s.tabText, statusTab === tab.key && s.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sport filter chips */}
      <View style={s.filterRow}>
        {SPORT_FILTERS.map((sf) => (
          <TouchableOpacity
            key={sf.label}
            style={[s.filterChip, sportFilter === sf.value && s.filterChipActive]}
            onPress={() => setSportFilter(sf.value)}
            activeOpacity={0.7}
          >
            <Text
              style={[s.filterText, sportFilter === sf.value && s.filterTextActive]}
            >
              {sf.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.PRIMARY}
            colors={[Colors.PRIMARY]}
          />
        }
        renderItem={({ item }) => (
          <TournamentCard
            tournament={item}
            onPress={() =>
              navigation.navigate("TournamentDetail", { tournamentId: item.id })
            }
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="trophy-outline"
            title="Aucun tournoi"
            subtitle="Aucun tournoi trouvé pour ce filtre."
          />
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
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
    fontSize: 13,
    fontWeight: "600",
    color: Colors.TEXT_SECONDARY,
  },
  tabTextActive: {
    color: Colors.PRIMARY,
  },
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
  list: {
    padding: 16,
    paddingBottom: 40,
  },
});

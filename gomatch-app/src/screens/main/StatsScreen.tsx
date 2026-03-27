import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from "react-native";
import { useRoute, RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LineChart, BarChart } from "react-native-chart-kit";
import { Colors } from "../../constants/colors";
import { statsService } from "../../services/stats";
import { LoadingScreen } from "../../components/LoadingScreen";
import { NetworkError } from "../../components/NetworkError";
import { ErrorState } from "../../components/ErrorState";
import { isNetworkError } from "../../utils/network";
import type { PlayerStats, Sport } from "../../types";
import type { ProfileStackParamList } from "../../navigation/ProfileStack";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CHART_WIDTH = SCREEN_WIDTH - 48;

const SPORT_LABELS: Record<string, string> = {
  tennis: "Tennis",
  padel: "Padel",
};

const MONTH_SHORT: Record<string, string> = {
  "01": "Jan",
  "02": "Fév",
  "03": "Mar",
  "04": "Avr",
  "05": "Mai",
  "06": "Jun",
  "07": "Jul",
  "08": "Aoû",
  "09": "Sep",
  "10": "Oct",
  "11": "Nov",
  "12": "Déc",
};

const chartConfig = {
  backgroundColor: Colors.BACKGROUND,
  backgroundGradientFrom: Colors.BACKGROUND,
  backgroundGradientTo: Colors.BACKGROUND,
  decimalCount: 0,
  color: (opacity = 1) => `rgba(27, 107, 74, ${opacity})`,
  labelColor: () => Colors.TEXT_SECONDARY,
  propsForDots: { r: "5", strokeWidth: "2", stroke: Colors.NAVY },
  propsForBackgroundLines: { stroke: Colors.BORDER },
};

export function StatsScreen() {
  const route = useRoute<RouteProp<ProfileStackParamList, "PlayerStats">>();
  const playerId = route.params?.playerId;

  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [selectedSport, setSelectedSport] = useState<Sport>("tennis");

  const fetchStats = useCallback(async () => {
    try {
      setError(null);
      const data = playerId
        ? await statsService.getPlayerStats(playerId)
        : await statsService.getMyStats();
      setStats(data);
      // Auto-select first available sport
      const availableSports = Object.keys(data.sports);
      if (availableSports.length > 0 && !data.sports[selectedSport]) {
        setSelectedSport(availableSports[0] as Sport);
      }
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  }, [fetchStats]);

  if (loading) return <LoadingScreen />;
  if (error && isNetworkError(error)) return <NetworkError onRetry={fetchStats} />;
  if (error) return <ErrorState message="Impossible de charger les statistiques" onRetry={fetchStats} />;
  if (!stats) return <ErrorState message="Aucune donnée" onRetry={fetchStats} />;

  const sportStats = stats.sports[selectedSport];
  const availableSports = Object.keys(stats.sports) as Sport[];

  // ── Chart data ──
  const mpmLabels = stats.matches_per_month.map((m) => {
    const parts = m.month.split("-");
    return MONTH_SHORT[parts[1]] || parts[1];
  });
  const mpmData = stats.matches_per_month.map((m) => m.count);

  const pointsData = stats.points_evolution[selectedSport] || [];
  const hasLineChart = pointsData.length > 1;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.NAVY}
          colors={[Colors.NAVY]}
        />
      }
    >
      {/* ── Sport Toggle ── */}
      <View style={styles.toggleRow}>
        {(["tennis", "padel"] as Sport[]).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.toggleBtn, selectedSport === s && styles.toggleBtnActive]}
            onPress={() => setSelectedSport(s)}
            activeOpacity={0.7}
          >
            <Text style={[styles.toggleText, selectedSport === s && styles.toggleTextActive]}>
              {s === "tennis" ? "🎾 Tennis" : "🏓 Padel"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Global cards ── */}
      <View style={styles.statsRow}>
        <StatCard
          icon="trophy-outline"
          value={stats.matches_won}
          label="Victoires"
          color={Colors.SUCCESS}
        />
        <StatCard
          icon="close-circle-outline"
          value={stats.matches_lost}
          label="Défaites"
          color={Colors.ERROR}
        />
        <StatCard
          icon="tennisball-outline"
          value={stats.matches_played}
          label="Matchs"
          color={Colors.NAVY}
        />
      </View>

      {/* ── Win rate ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Taux de victoire global</Text>
        <View style={styles.winRateContainer}>
          <View style={styles.winRateBarBg}>
            <View
              style={[
                styles.winRateBarFill,
                { width: `${Math.min(stats.win_rate, 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.winRateText}>{stats.win_rate}%</Text>
        </View>
      </View>

      {/* ── Sport detail ── */}
      {sportStats ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {SPORT_LABELS[selectedSport] || selectedSport}
          </Text>
          <View style={styles.sportGrid}>
            <View style={styles.sportItem}>
              <Text style={styles.sportValue}>{sportStats.matches_played}</Text>
              <Text style={styles.sportLabel}>Matchs</Text>
            </View>
            <View style={styles.sportItem}>
              <Text style={[styles.sportValue, { color: Colors.SUCCESS }]}>
                {sportStats.matches_won}
              </Text>
              <Text style={styles.sportLabel}>Victoires</Text>
            </View>
            <View style={styles.sportItem}>
              <Text style={[styles.sportValue, { color: Colors.ERROR }]}>
                {sportStats.matches_lost}
              </Text>
              <Text style={styles.sportLabel}>Défaites</Text>
            </View>
            <View style={styles.sportItem}>
              <Text style={styles.sportValue}>{sportStats.win_rate}%</Text>
              <Text style={styles.sportLabel}>Win rate</Text>
            </View>
            <View style={styles.sportItem}>
              <Text style={[styles.sportValue, { color: Colors.SUCCESS }]}>
                {sportStats.sets_won}
              </Text>
              <Text style={styles.sportLabel}>Sets gagnés</Text>
            </View>
            <View style={styles.sportItem}>
              <Text style={[styles.sportValue, { color: Colors.ERROR }]}>
                {sportStats.sets_lost}
              </Text>
              <Text style={styles.sportLabel}>Sets perdus</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.emptyText}>
            Aucun match de {SPORT_LABELS[selectedSport]?.toLowerCase() || selectedSport} joué
          </Text>
        </View>
      )}

      {/* ── Streaks ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Séries</Text>
        <View style={styles.streakRow}>
          <View style={styles.streakItem}>
            <Ionicons name="flame" size={28} color="#F59E0B" />
            <Text style={styles.streakValue}>{stats.current_streak}</Text>
            <Text style={styles.streakLabel}>Série actuelle</Text>
          </View>
          <View style={styles.streakDivider} />
          <View style={styles.streakItem}>
            <Ionicons name="star" size={28} color="#F59E0B" />
            <Text style={styles.streakValue}>{stats.best_streak}</Text>
            <Text style={styles.streakLabel}>Meilleure série</Text>
          </View>
        </View>
      </View>

      {/* ── Favorite venue ── */}
      {stats.favorite_venue && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Lieu favori</Text>
          <View style={styles.venueRow}>
            <Ionicons name="location" size={22} color={Colors.NAVY} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={styles.venueName}>{stats.favorite_venue.name}</Text>
              <Text style={styles.venueCount}>
                {stats.favorite_venue.matches_count} match
                {stats.favorite_venue.matches_count > 1 ? "s" : ""}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* ── Bar chart: Matches per month ── */}
      {mpmData.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Matchs par mois</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <BarChart
              data={{
                labels: mpmLabels,
                datasets: [{ data: mpmData }],
              }}
              width={Math.max(CHART_WIDTH, mpmLabels.length * 60)}
              height={200}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={{
                ...chartConfig,
                barPercentage: 0.6,
              }}
              fromZero
              showValuesOnTopOfBars
              style={styles.chart}
            />
          </ScrollView>
        </View>
      )}

      {/* ── Line chart: Points evolution ── */}
      {hasLineChart && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Évolution des points ({SPORT_LABELS[selectedSport] || selectedSport})
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <LineChart
              data={{
                labels: pointsData.map((p) => {
                  const parts = p.date.split("-");
                  return `${parts[2]}/${parts[1]}`;
                }),
                datasets: [{ data: pointsData.map((p) => p.points) }],
              }}
              width={Math.max(CHART_WIDTH, pointsData.length * 70)}
              height={220}
              yAxisSuffix=" pts"
              yAxisLabel=""
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          </ScrollView>
        </View>
      )}

      {/* Single point → show as text */}
      {!hasLineChart && pointsData.length === 1 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Points ({SPORT_LABELS[selectedSport] || selectedSport})
          </Text>
          <Text style={styles.bigNumber}>{pointsData[0].points}</Text>
          <Text style={styles.pointsSubtitle}>points actuels</Text>
        </View>
      )}
    </ScrollView>
  );
}

// ── Small stat card component ──
function StatCard({
  icon,
  value,
  label,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.statCardValue, { color }]}>{value}</Text>
      <Text style={styles.statCardLabel}>{label}</Text>
    </View>
  );
}

// ── Styles ──
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },

  // Toggle
  toggleRow: {
    flexDirection: "row",
    backgroundColor: Colors.BACKGROUND,
    borderRadius: 12,
    marginBottom: 16,
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  toggleBtnActive: {
    backgroundColor: Colors.NAVY,
  },
  toggleText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.TEXT_SECONDARY,
  },
  toggleTextActive: {
    color: "#FFFFFF",
  },

  // Stat cards row
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.BACKGROUND,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    gap: 4,
  },
  statCardValue: {
    fontSize: 22,
    fontWeight: "700",
  },
  statCardLabel: {
    fontSize: 12,
    color: Colors.TEXT_SECONDARY,
  },

  // Card
  card: {
    backgroundColor: Colors.BACKGROUND,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.TEXT,
    marginBottom: 12,
  },

  // Win rate
  winRateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  winRateBarBg: {
    flex: 1,
    height: 10,
    backgroundColor: Colors.BORDER,
    borderRadius: 5,
    overflow: "hidden",
  },
  winRateBarFill: {
    height: "100%",
    backgroundColor: Colors.NAVY,
    borderRadius: 5,
  },
  winRateText: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.NAVY,
    width: 52,
    textAlign: "right",
  },

  // Sport grid
  sportGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sportItem: {
    width: "30%",
    alignItems: "center",
    paddingVertical: 10,
    backgroundColor: "#F9F9F9",
    borderRadius: 10,
  },
  sportValue: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.TEXT,
  },
  sportLabel: {
    fontSize: 11,
    color: Colors.TEXT_SECONDARY,
    marginTop: 2,
  },

  // Streaks
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  streakItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  streakValue: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.TEXT,
  },
  streakLabel: {
    fontSize: 12,
    color: Colors.TEXT_SECONDARY,
  },
  streakDivider: {
    width: 1,
    height: 50,
    backgroundColor: Colors.BORDER,
  },

  // Venue
  venueRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  venueName: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.TEXT,
  },
  venueCount: {
    fontSize: 13,
    color: Colors.TEXT_SECONDARY,
    marginTop: 2,
  },

  // Charts
  chart: {
    borderRadius: 12,
    marginTop: 4,
  },

  // Points text fallback
  bigNumber: {
    fontSize: 36,
    fontWeight: "700",
    color: Colors.NAVY,
    textAlign: "center",
  },
  pointsSubtitle: {
    fontSize: 13,
    color: Colors.TEXT_SECONDARY,
    textAlign: "center",
    marginTop: 4,
  },

  emptyText: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
    textAlign: "center",
    paddingVertical: 12,
  },
});

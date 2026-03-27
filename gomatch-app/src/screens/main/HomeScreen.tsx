import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../hooks/useAuth";
import { Colors } from "../../constants/colors";
import {
  CARD_RADIUS,
  CARD_SHADOW,
  BUTTON_RADIUS,
  SECTION_SPACING,
  FONT_SIZES,
} from "../../constants/theme";
import { AppHeader } from "../../components/AppHeader";
import { Avatar } from "../../components/Avatar";
import { TournamentCard } from "../../components/TournamentCard";
import { LoadingScreen } from "../../components/LoadingScreen";
import { NetworkError } from "../../components/NetworkError";
import { ErrorState } from "../../components/ErrorState";
import { matchesService } from "../../services/matches";
import { tournamentsService } from "../../services/tournaments";
import { isNetworkError } from "../../utils/network";
import { formatDate, formatTime } from "../../utils/helpers";
import type { MatchListItem, TournamentListItem, Sport } from "../../types";
import type { HomeStackParamList } from "../../navigation/HomeStack";

type Nav = NativeStackNavigationProp<HomeStackParamList>;

export function HomeScreen() {
  const { user, profile } = useAuth();
  const navigation = useNavigation<Nav>();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [myMatches, setMyMatches] = useState<MatchListItem[]>([]);
  const [tournaments, setTournaments] = useState<TournamentListItem[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const [matchRes, tournRes] = await Promise.allSettled([
        matchesService.getMyMatches(),
        tournamentsService.getTournaments({ status: "registration" }),
      ]);

      if (matchRes.status === "fulfilled") {
        setMyMatches(
          matchRes.value.results
            .filter((m) => m.status !== "completed" && m.status !== "cancelled")
            .slice(0, 10),
        );
      }
      if (tournRes.status === "fulfilled") {
        setTournaments(tournRes.value.results.slice(0, 10));
      }

      if (matchRes.status === "rejected" && tournRes.status === "rejected") {
        throw matchRes.reason;
      }
      setError(null);
    } catch (err) {
      setError(err);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  // ── Error / Loading states ──

  if (loading) return <LoadingScreen message="Chargement…" />;

  if (error && myMatches.length === 0 && tournaments.length === 0) {
    if (isNetworkError(error)) {
      return (
        <NetworkError
          onRetry={() => {
            setLoading(true);
            fetchData().finally(() => setLoading(false));
          }}
        />
      );
    }
    return (
      <ErrorState
        message="Impossible de charger les données"
        onRetry={() => {
          setLoading(true);
          fetchData().finally(() => setLoading(false));
        }}
      />
    );
  }

  // ── Helpers ──

  function sectionHeader(title: string, onSeeAll?: () => void) {
    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {onSeeAll && (
          <TouchableOpacity onPress={onSeeAll} hitSlop={8}>
            <Text style={styles.seeAll}>Voir tout</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  function formatSessionDate(date: string, time: string): string {
    const d = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dDate = new Date(d);
    dDate.setHours(0, 0, 0, 0);

    let label: string;
    if (dDate.getTime() === today.getTime()) label = "Aujourd'hui";
    else if (dDate.getTime() === tomorrow.getTime()) label = "Demain";
    else label = formatDate(date);

    return `${label} ${formatTime(time)}`;
  }

  return (
    <View style={styles.root}>
      <AppHeader />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.NAVY}
            colors={[Colors.NAVY]}
          />
        }
      >
        {/* ── SECTION 1 — Greeting + Search ── */}
        <View style={styles.greetingSection}>
          <Text style={styles.greeting}>
            Bienvenue, {profile?.first_name || "Joueur"} !
          </Text>
          <TouchableOpacity
            style={styles.searchBar}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("PlayerSearch")}
          >
            <Ionicons name="search-outline" size={20} color={Colors.TEXT_SECONDARY} />
            <Text style={styles.searchPlaceholder}>
              Rechercher une partie ou un joueur...
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── SECTION 2 — Hero Banner ── */}
        <View style={styles.heroPadding}>
          <LinearGradient
            colors={["#2E8B57", "#1A3A5C"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBanner}
          >
            <Text style={styles.heroTitle}>Joue dès aujourd'hui !</Text>
            <Text style={styles.heroSubtitle}>
              Trouve une partie près de chez toi
            </Text>
            <View style={styles.heroButtons}>
              <TouchableOpacity
                style={[styles.heroBtn, { backgroundColor: Colors.ORANGE }]}
                activeOpacity={0.8}
                onPress={() =>
                  navigation.getParent()?.navigate("Activities")
                }
              >
                <Ionicons name="tennisball" size={16} color="#FFF" />
                <Text style={styles.heroBtnText}>Padel &gt;</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.heroBtn, { backgroundColor: Colors.BLUE }]}
                activeOpacity={0.8}
                onPress={() =>
                  navigation.getParent()?.navigate("Activities")
                }
              >
                <Ionicons name="tennisball-outline" size={16} color="#FFF" />
                <Text style={styles.heroBtnText}>Tennis &gt;</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* ── SECTION 3 — Prochaines Sessions ── */}
        {sectionHeader("Prochaines Sessions", () =>
          navigation.navigate("MatchList"),
        )}

        {myMatches.length > 0 ? (
          <FlatList
            data={myMatches}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
            keyExtractor={(item) => item.id}
            nestedScrollEnabled
            renderItem={({ item }) => {
              const isPadel = item.sport === "padel";
              const gradientColors: [string, string] = isPadel
                ? ["#F59E0B", "#EA580C"]
                : ["#3B82F6", "#1A3A5C"];

              return (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() =>
                    navigation.navigate("MatchDetail", { matchId: item.id })
                  }
                >
                  <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.sessionCard}
                  >
                    <Text style={styles.sessionTitle} numberOfLines={1}>
                      {item.match_type === "doubles" ? "Double" : "Simple"}{" "}
                      {isPadel ? "Padel" : "Tennis"}
                    </Text>
                    <Text style={styles.sessionMeta}>
                      {isPadel ? "🏓 Padel" : "🎾 Tennis"} •{" "}
                      {formatSessionDate(item.scheduled_date, item.scheduled_time)}
                    </Text>
                    <View style={styles.sessionBottom}>
                      <View style={styles.avatarStack}>
                        <Avatar name={item.created_by_name} size="sm" />
                        {item.current_participants_count > 1 && (
                          <View style={styles.avatarOverlap}>
                            <Avatar
                              name={`+${item.current_participants_count - 1}`}
                              size="sm"
                            />
                          </View>
                        )}
                      </View>
                      <Text style={styles.sessionPlayers}>
                        {item.current_participants_count}/{item.max_participants}
                      </Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              );
            }}
          />
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🎾</Text>
            <Text style={styles.emptyText}>Aucune session à venir</Text>
          </View>
        )}

        {/* ── SECTION 4 — Quick Actions ── */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickBtn}
            activeOpacity={0.7}
            onPress={() => navigation.getParent()?.navigate("Matches", { screen: "CreateMatch" })}
          >
            <Ionicons name="calendar-outline" size={24} color={Colors.NAVY} />
            <Text style={styles.quickBtnText}>Créer une Partie</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickBtn}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("EventList")}
          >
            <Ionicons name="trophy-outline" size={24} color={Colors.NAVY} />
            <Text style={styles.quickBtnText}>Voir Tournois</Text>
          </TouchableOpacity>
        </View>

        {/* ── SECTION 5 — Tournois à venir ── */}
        {sectionHeader("Tournois à venir", () =>
          navigation.navigate("EventList"),
        )}

        {tournaments.length > 0 ? (
          <FlatList
            data={tournaments}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
            keyExtractor={(item) => item.id}
            nestedScrollEnabled
            renderItem={({ item }) => (
              <TournamentCard tournament={item} />
            )}
          />
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🏆</Text>
            <Text style={styles.emptyText}>Aucun tournoi à venir</Text>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.SURFACE,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // ── Section 1 — Greeting + Search ──
  greetingSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  greeting: {
    fontSize: FONT_SIZES.h1,
    fontWeight: "800",
    color: Colors.NAVY,
    marginBottom: 14,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.CARD_BG,
    borderRadius: CARD_RADIUS,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  searchPlaceholder: {
    fontSize: FONT_SIZES.body,
    color: Colors.TEXT_SECONDARY,
    flex: 1,
  },

  // ── Section 2 — Hero Banner ──
  heroPadding: {
    paddingHorizontal: 20,
    marginTop: SECTION_SPACING,
  },
  heroBanner: {
    borderRadius: CARD_RADIUS,
    padding: 24,
    minHeight: 180,
    justifyContent: "center",
    ...CARD_SHADOW,
  },
  heroTitle: {
    fontSize: FONT_SIZES.h2,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: FONT_SIZES.body,
    color: "rgba(255,255,255,0.85)",
    marginBottom: 20,
  },
  heroButtons: {
    flexDirection: "row",
    gap: 12,
  },
  heroBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: BUTTON_RADIUS,
    gap: 6,
  },
  heroBtnText: {
    color: "#FFFFFF",
    fontSize: FONT_SIZES.body,
    fontWeight: "700",
  },

  // ── Section generic ──
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: SECTION_SPACING,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.NAVY,
  },
  seeAll: {
    fontSize: FONT_SIZES.body,
    fontWeight: "600",
    color: Colors.BLUE,
  },
  horizontalList: {
    paddingLeft: 20,
    paddingRight: 8,
  },

  // ── Section 3 — Session cards ──
  sessionCard: {
    width: 220,
    height: 140,
    borderRadius: CARD_RADIUS,
    padding: 16,
    marginRight: 12,
    justifyContent: "space-between",
  },
  sessionTitle: {
    fontSize: FONT_SIZES.h3,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  sessionMeta: {
    fontSize: FONT_SIZES.caption,
    color: "rgba(255,255,255,0.85)",
  },
  sessionBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  avatarStack: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarOverlap: {
    marginLeft: -10,
  },
  sessionPlayers: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "700",
    color: "rgba(255,255,255,0.9)",
  },

  // ── Section 4 — Quick Actions ──
  quickActions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    marginTop: SECTION_SPACING,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: Colors.BACKGROUND,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    borderRadius: CARD_RADIUS,
    paddingVertical: 18,
    alignItems: "center",
    gap: 8,
  },
  quickBtnText: {
    fontSize: FONT_SIZES.body,
    fontWeight: "600",
    color: Colors.NAVY,
  },

  // ── Empty state ──
  emptyCard: {
    backgroundColor: Colors.BACKGROUND,
    borderRadius: CARD_RADIUS,
    padding: 24,
    marginHorizontal: 20,
    alignItems: "center",
    ...CARD_SHADOW,
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: FONT_SIZES.body,
    color: Colors.TEXT_SECONDARY,
    textAlign: "center",
  },
});

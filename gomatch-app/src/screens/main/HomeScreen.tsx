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
import { useAuth } from "../../hooks/useAuth";
import { Colors } from "../../constants/colors";
import { MatchCard } from "../../components/MatchCard";
import { OpenMatchCard } from "../../components/OpenMatchCard";
import { matchesService } from "../../services/matches";
import { openMatchesService } from "../../services/openMatches";
import { scoringService } from "../../services/scoring";
import type { MatchListItem, OpenMatchListItem, Ranking, Sport } from "../../types";
import type { HomeStackParamList } from "../../navigation/HomeStack";

type Nav = NativeStackNavigationProp<HomeStackParamList>;

export function HomeScreen() {
  const { user, profile } = useAuth();
  const navigation = useNavigation<Nav>();

  const [refreshing, setRefreshing] = useState(false);
  const [openMatches, setOpenMatches] = useState<OpenMatchListItem[]>([]);
  const [myMatches, setMyMatches] = useState<MatchListItem[]>([]);
  const [topRankings, setTopRankings] = useState<Ranking[]>([]);
  const [primarySport, setPrimarySport] = useState<Sport>("tennis");

  const fetchData = useCallback(async () => {
    // Determine primary sport
    const sport: Sport = profile?.level_padel && !profile?.level_tennis ? "padel" : "tennis";
    setPrimarySport(sport);

    const [openRes, myRes, rankRes] = await Promise.allSettled([
      openMatchesService.getOpenMatches({ sport }),
      matchesService.getMyMatches(),
      scoringService.getRankings(sport),
    ]);

    if (openRes.status === "fulfilled") {
      setOpenMatches(openRes.value.results.slice(0, 5));
    }
    if (myRes.status === "fulfilled") {
      // Only upcoming (not completed/cancelled)
      setMyMatches(
        myRes.value.results.filter(
          (m) => m.status !== "completed" && m.status !== "cancelled",
        ),
      );
    }
    if (rankRes.status === "fulfilled") {
      setTopRankings(rankRes.value.slice(0, 3));
    }
  }, [profile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  // ── Render helpers ──

  function renderSectionHeader(title: string, onSeeAll?: () => void) {
    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {onSeeAll && (
          <TouchableOpacity onPress={onSeeAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.seeAll}>Voir tout</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  function renderEmptyState(emoji: string, message: string, cta?: string, onPress?: () => void) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyEmoji}>{emoji}</Text>
        <Text style={styles.emptyText}>{message}</Text>
        {cta && onPress && (
          <TouchableOpacity style={styles.emptyCta} onPress={onPress}>
            <Text style={styles.emptyCtaText}>{cta}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.PRIMARY}
          colors={[Colors.PRIMARY]}
        />
      }
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            Bonjour, {profile?.first_name || "Joueur"} 👋
          </Text>
          {profile?.city ? (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color={Colors.TEXT_SECONDARY} />
              <Text style={styles.locationText}>{profile.city}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* ── Open Matches ── */}
      {renderSectionHeader("Open Matches près de toi", () =>
        navigation.getParent()?.navigate("OpenMatches"),
      )}

      {openMatches.length > 0 ? (
        <FlatList
          data={openMatches}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <OpenMatchCard
              match={item}
              horizontal
              onPress={() => navigation.navigate("MatchDetail", { matchId: item.id })}
            />
          )}
          scrollEnabled
          nestedScrollEnabled
        />
      ) : (
        renderEmptyState(
          "🔍",
          "Pas encore d'open matches",
          "Crée le premier !",
          () => navigation.getParent()?.navigate("CreateMatch"),
        )
      )}

      {/* ── Mes prochains matchs ── */}
      {renderSectionHeader("Mes prochains matchs", () =>
        navigation.navigate("MatchList"),
      )}

      {myMatches.length > 0 ? (
        myMatches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            onPress={() => navigation.navigate("MatchDetail", { matchId: match.id })}
          />
        ))
      ) : (
        renderEmptyState(
          "🎾",
          "Aucun match à venir",
          "Crée ton premier match !",
          () => navigation.getParent()?.navigate("CreateMatch"),
        )
      )}

      {/* ── Classement ── */}
      {renderSectionHeader(
        `Top ${primarySport === "tennis" ? "Tennis 🎾" : "Padel 🏓"}`,
        () => navigation.navigate("Ranking"),
      )}

      {topRankings.length > 0 ? (
        <View style={styles.rankingCard}>
          {topRankings.map((r, idx) => {
            const medals = ["🥇", "🥈", "🥉"];
            return (
              <View
                key={r.id}
                style={[styles.rankRow, idx < topRankings.length - 1 && styles.rankRowBorder]}
              >
                <Text style={styles.rankMedal}>{medals[idx] ?? `#${idx + 1}`}</Text>
                <Text style={styles.rankName} numberOfLines={1}>
                  {r.player_name}
                </Text>
                <Text style={styles.rankPoints}>{r.points} pts</Text>
                <Text style={styles.rankRecord}>
                  {r.wins}V / {r.losses}D
                </Text>
              </View>
            );
          })}
        </View>
      ) : (
        renderEmptyState("🏆", "Pas encore de classement\nJoue un match compétitif pour apparaître !")
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  content: {
    paddingBottom: 20,
  },
  // ── Header ──
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.TEXT,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  locationText: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
    marginLeft: 4,
  },
  // ── Section ──
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.TEXT,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.PRIMARY,
  },
  // ── Horizontal list ──
  horizontalList: {
    paddingLeft: 20,
    paddingRight: 8,
  },
  // ── Empty state ──
  emptyCard: {
    backgroundColor: Colors.BACKGROUND,
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyCta: {
    marginTop: 12,
    backgroundColor: Colors.PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyCtaText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  // ── My matches (vertical) ──
  // uses MatchCard padding from component
  // ── Ranking ──
  rankingCard: {
    backgroundColor: Colors.BACKGROUND,
    borderRadius: 16,
    marginHorizontal: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  rankRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  rankMedal: {
    fontSize: 18,
    width: 30,
  },
  rankName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: Colors.TEXT,
  },
  rankPoints: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.PRIMARY,
    marginRight: 10,
  },
  rankRecord: {
    fontSize: 12,
    color: Colors.TEXT_SECONDARY,
    width: 55,
    textAlign: "right",
  },
  bottomSpacer: {
    height: 10,
  },
});

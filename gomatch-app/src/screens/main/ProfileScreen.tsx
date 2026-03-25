import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../hooks/useAuth";
import { Colors } from "../../constants/colors";
import { Button } from "../../components/Button";
import { NetworkError } from "../../components/NetworkError";
import { ErrorState } from "../../components/ErrorState";
import { isNetworkError } from "../../utils/network";
import api from "../../services/api";
import type { Ranking, SkillLevel, PlayMode } from "../../types";
import type { ProfileStackParamList } from "../../navigation/ProfileStack";

const LEVEL_LABELS: Record<SkillLevel, string> = {
  beginner: "Débutant",
  intermediate: "Intermédiaire",
  advanced: "Avancé",
};

const PLAY_MODE_LABELS: Record<PlayMode, string> = {
  friendly: "Amical",
  competitive: "Compétition",
  both: "Les deux",
};

export function ProfileScreen() {
  const { user, profile, logout, refreshUser } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const [refreshing, setRefreshing] = useState(false);
  const [rankings, setRankings] = useState<Ranking[]>([]);

  const fetchRankings = useCallback(async () => {
    try {
      const { data } = await api.get<Ranking[]>("/rankings/me/");
      setRankings(data);
    } catch {
      // pas de rankings encore
    }
  }, []);

  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshUser(), fetchRankings()]);
    setRefreshing(false);
  }, [refreshUser, fetchRankings]);

  const handleLogout = () => {
    Alert.alert("Déconnexion", "Voulez-vous vraiment vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Déconnexion", style: "destructive", onPress: logout },
    ]);
  };

  const initials =
    (profile?.first_name?.[0] ?? "") + (profile?.last_name?.[0] ?? "");

  const totalWins = rankings.reduce((s, r) => s + r.wins, 0);
  const totalLosses = rankings.reduce((s, r) => s + r.losses, 0);
  const totalMatches = totalWins + totalLosses;

  const sports: string[] = [];
  if (profile?.level_tennis) sports.push("🎾 Tennis");
  if (profile?.level_padel) sports.push("🏓 Padel");

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
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
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitials}>{initials.toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.name}>
          {profile?.first_name} {profile?.last_name}
        </Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      {/* ── Infos ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Informations</Text>

        {profile?.city ? (
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={18} color={Colors.TEXT_SECONDARY} />
            <Text style={styles.infoText}>{profile.city}</Text>
          </View>
        ) : null}

        {sports.length > 0 && (
          <View style={styles.infoRow}>
            <Ionicons name="tennisball-outline" size={18} color={Colors.TEXT_SECONDARY} />
            <Text style={styles.infoText}>{sports.join("  ·  ")}</Text>
          </View>
        )}

        {profile?.level_tennis && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tennis :</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{LEVEL_LABELS[profile.level_tennis]}</Text>
            </View>
          </View>
        )}

        {profile?.level_padel && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Padel :</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{LEVEL_LABELS[profile.level_padel]}</Text>
            </View>
          </View>
        )}

        {profile?.preferred_play_mode && (
          <View style={styles.infoRow}>
            <Ionicons name="flame-outline" size={18} color={Colors.TEXT_SECONDARY} />
            <Text style={styles.infoText}>
              {PLAY_MODE_LABELS[profile.preferred_play_mode]}
            </Text>
          </View>
        )}
      </View>

      {/* ── Stats ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Statistiques</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{totalMatches}</Text>
            <Text style={styles.statLabel}>Matchs</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: Colors.SUCCESS }]}>{totalWins}</Text>
            <Text style={styles.statLabel}>Victoires</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: Colors.ERROR }]}>{totalLosses}</Text>
            <Text style={styles.statLabel}>Défaites</Text>
          </View>
        </View>

        {rankings.map((r) => (
          <View key={r.id} style={styles.rankingRow}>
            <Text style={styles.rankingSport}>
              {r.sport === "tennis" ? "🎾" : "🏓"} {r.sport === "tennis" ? "Tennis" : "Padel"}
            </Text>
            <Text style={styles.rankingPoints}>{r.points} pts</Text>
            <Text style={styles.rankingPosition}>#{r.rank_position}</Text>
          </View>
        ))}
      </View>

      {/* ── Actions ── */}
      <Button
        title="Modifier le profil"
        onPress={() => navigation.navigate("EditProfile")}
        variant="outline"
        style={styles.editButton}
      />

      <Button
        title="Déconnexion"
        onPress={handleLogout}
        variant="danger"
        style={styles.logoutButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  // ── Header ──
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 12,
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.TEXT,
  },
  email: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
    marginTop: 2,
  },
  // ── Card ──
  card: {
    backgroundColor: Colors.BACKGROUND,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.TEXT,
    marginBottom: 14,
  },
  // ── Info rows ──
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  infoText: {
    fontSize: 15,
    color: Colors.TEXT,
    marginLeft: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
    marginRight: 8,
  },
  badge: {
    backgroundColor: Colors.PRIMARY + "15",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.PRIMARY,
  },
  // ── Stats ──
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  statBox: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.TEXT,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.TEXT_SECONDARY,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.BORDER,
  },
  // ── Rankings ──
  rankingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.BORDER,
  },
  rankingSport: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: Colors.TEXT,
  },
  rankingPoints: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.PRIMARY,
    marginRight: 12,
  },
  rankingPosition: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.TEXT_SECONDARY,
  },
  // ── Buttons ──
  editButton: {
    marginBottom: 12,
  },
  logoutButton: {
    marginBottom: 0,
  },
});

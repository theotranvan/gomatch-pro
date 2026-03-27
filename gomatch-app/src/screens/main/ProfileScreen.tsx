import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../hooks/useAuth";
import { Colors } from "../../constants/colors";
import {
  CARD_RADIUS,
  CARD_SHADOW,
  FONT_SIZES,
  SECTION_SPACING,
} from "../../constants/theme";
import { Button } from "../../components/Button";
import api from "../../services/api";
import { connectionsService } from "../../services/connections";
import type { Ranking } from "../../types";
import type { ProfileStackParamList } from "../../navigation/ProfileStack";

// ── Level helpers ──
const POINTS_PER_LEVEL = 200;
const computeLevel = (pts: number) => Math.floor(pts / POINTS_PER_LEVEL);
const computeProgress = (pts: number) => (pts % POINTS_PER_LEVEL) / POINTS_PER_LEVEL;

export function ProfileScreen() {
  const { user, profile, logout, refreshUser, uploadAvatar } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const [refreshing, setRefreshing] = useState(false);
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [changingAvatar, setChangingAvatar] = useState(false);
  const [connectionsCount, setConnectionsCount] = useState(0);

  // ── Fetchers ──
  const fetchRankings = useCallback(async () => {
    try {
      const { data } = await api.get<Ranking[]>("/rankings/me/");
      setRankings(data);
    } catch {}
  }, []);

  const fetchConnectionsCount = useCallback(async () => {
    try {
      const count = await connectionsService.getCount();
      setConnectionsCount(count);
    } catch {}
  }, []);

  useEffect(() => {
    fetchRankings();
    fetchConnectionsCount();
  }, [fetchRankings, fetchConnectionsCount]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshUser(), fetchRankings(), fetchConnectionsCount()]);
    setRefreshing(false);
  }, [refreshUser, fetchRankings, fetchConnectionsCount]);

  // ── Handlers ──
  const handleLogout = () => {
    Alert.alert("Déconnexion", "Voulez-vous vraiment vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Déconnexion", style: "destructive", onPress: logout },
    ]);
  };

  const handleChangeAvatar = () => {
    Alert.alert("Changer la photo", undefined, [
      {
        text: "Galerie",
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) return;
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
          });
          if (!result.canceled && result.assets[0]) {
            setChangingAvatar(true);
            try {
              await uploadAvatar(result.assets[0].uri);
            } catch {}
            setChangingAvatar(false);
          }
        },
      },
      {
        text: "Caméra",
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) return;
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
          });
          if (!result.canceled && result.assets[0]) {
            setChangingAvatar(true);
            try {
              await uploadAvatar(result.assets[0].uri);
            } catch {}
            setChangingAvatar(false);
          }
        },
      },
      { text: "Annuler", style: "cancel" },
    ]);
  };

  // ── Derived data ──
  const initials =
    (profile?.first_name?.[0] ?? "") + (profile?.last_name?.[0] ?? "");
  const totalPoints = rankings.reduce((s, r) => s + r.points, 0);
  const totalWins = rankings.reduce((s, r) => s + r.wins, 0);
  const totalLosses = rankings.reduce((s, r) => s + r.losses, 0);
  const totalMatches = totalWins + totalLosses;
  const level = computeLevel(totalPoints);
  const progress = computeProgress(totalPoints);

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
      {/* ── 1. Header profil ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleChangeAvatar} activeOpacity={0.7}>
          {changingAvatar ? (
            <View style={styles.avatarCircle}>
              <ActivityIndicator size="small" color="#FFFFFF" />
            </View>
          ) : profile?.avatar_url ? (
            <Image
              source={{ uri: profile.avatar_url }}
              style={styles.avatarCircle}
            />
          ) : (
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>
                {initials.toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.cameraBadge}>
            <Ionicons name="camera" size={14} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {profile?.username ? (
          <Text style={styles.pseudo}>@{profile.username}</Text>
        ) : null}

        <Text style={styles.nameCity}>
          {profile?.first_name}
          {profile?.city ? ` · ${profile.city}` : ""}
        </Text>

        <TouchableOpacity
          onPress={() => navigation.navigate("ConnectionsList" as any)}
          activeOpacity={0.7}
        >
          <Text style={styles.connectionsText}>
            {connectionsCount} connexion{connectionsCount !== 1 ? "s" : ""}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── 2. Ta Progression ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ta Progression</Text>

        {/* Level bar */}
        <View style={styles.levelBar}>
          <View style={styles.levelBarTop}>
            <Text style={styles.levelBarLabel}>★ Niveau {level} ★</Text>
            <Text style={styles.levelBarPoints}>{totalPoints} Points</Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]}
            />
          </View>
        </View>

        {/* 3 placeholder icons */}
        <View style={styles.progressIcons}>
          <View style={styles.progressIcon}>
            <View style={styles.progressIconCircle}>
              <Ionicons name="trophy" size={22} color={Colors.ORANGE} />
            </View>
            <Text style={styles.progressIconLabel}>Badges</Text>
          </View>
          <View style={styles.progressIcon}>
            <View style={styles.progressIconCircle}>
              <Ionicons name="shield" size={22} color={Colors.BLUE} />
            </View>
            <Text style={styles.progressIconLabel}>Défis</Text>
          </View>
          <View style={styles.progressIcon}>
            <View style={styles.progressIconCircle}>
              <Ionicons name="star" size={22} color={Colors.GREEN} />
            </View>
            <Text style={styles.progressIconLabel}>Récompenses</Text>
          </View>
        </View>
      </View>

      {/* ── 3. Stats rapides ── */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalMatches}</Text>
          <Text style={styles.statLabel}>Matchs</Text>
        </View>
        <View style={[styles.statCard, styles.statCardSuccess]}>
          <Text style={[styles.statValue, { color: Colors.SUCCESS }]}>
            {totalWins}
          </Text>
          <Text style={styles.statLabel}>Victoires</Text>
        </View>
        <View style={[styles.statCard, styles.statCardError]}>
          <Text style={[styles.statValue, { color: Colors.ERROR }]}>
            {totalLosses}
          </Text>
          <Text style={styles.statLabel}>Défaites</Text>
        </View>
      </View>

      {/* ── 4. Modifier le profil ── */}
      <Button
        title="Modifier le profil"
        onPress={() => navigation.navigate("EditProfile")}
        variant="outline"
        style={styles.actionBtn}
      />

      {/* ── 5. Voir mes stats détaillées ── */}
      <TouchableOpacity
        style={styles.statsDetailBtn}
        onPress={() => navigation.navigate("PlayerStats", {})}
        activeOpacity={0.7}
      >
        <Ionicons name="stats-chart" size={18} color={Colors.NAVY} />
        <Text style={styles.statsDetailText}>Voir mes stats détaillées</Text>
        <Ionicons name="chevron-forward" size={18} color={Colors.TEXT_SECONDARY} />
      </TouchableOpacity>

      {/* ── 6. Déconnexion ── */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={handleLogout}
        activeOpacity={0.7}
      >
        <Ionicons name="log-out-outline" size={18} color={Colors.ERROR} />
        <Text style={styles.logoutText}>Déconnexion</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.SURFACE },
  content: { paddingBottom: 40 },

  // ── 1. Header ──
  header: {
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: SECTION_SPACING,
    backgroundColor: Colors.BACKGROUND,
    ...CARD_SHADOW,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.NAVY,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    overflow: "hidden",
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cameraBadge: {
    position: "absolute",
    bottom: 12,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.NAVY,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.SURFACE,
  },
  pseudo: {
    fontSize: FONT_SIZES.h2,
    fontWeight: "700",
    color: Colors.NAVY,
  },
  nameCity: {
    fontSize: FONT_SIZES.body,
    color: Colors.TEXT_SECONDARY,
    marginTop: 2,
  },
  connectionsText: {
    fontSize: FONT_SIZES.body,
    fontWeight: "600",
    color: Colors.BLUE,
    marginTop: 6,
  },

  // ── Card generic ──
  card: {
    backgroundColor: Colors.BACKGROUND,
    borderRadius: CARD_RADIUS,
    padding: 20,
    marginHorizontal: 20,
    marginTop: SECTION_SPACING,
    ...CARD_SHADOW,
  },
  cardTitle: {
    fontSize: FONT_SIZES.h3,
    fontWeight: "700",
    color: Colors.NAVY,
    marginBottom: 16,
  },

  // ── 2. Level bar ──
  levelBar: {
    backgroundColor: Colors.NAVY,
    borderRadius: 12,
    padding: 14,
  },
  levelBarTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  levelBarLabel: {
    fontSize: FONT_SIZES.body,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  levelBarPoints: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
  },
  progressTrack: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: 8,
    backgroundColor: Colors.ORANGE,
    borderRadius: 4,
  },

  // ── Progression icons ──
  progressIcons: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 20,
  },
  progressIcon: { alignItems: "center", gap: 6 },
  progressIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.SURFACE,
    alignItems: "center",
    justifyContent: "center",
  },
  progressIconLabel: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "600",
    color: Colors.TEXT_SECONDARY,
  },

  // ── 3. Stats rapides ──
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 20,
    marginTop: SECTION_SPACING,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.BACKGROUND,
    borderRadius: CARD_RADIUS,
    paddingVertical: 16,
    alignItems: "center",
    ...CARD_SHADOW,
  },
  statCardSuccess: { borderBottomWidth: 3, borderBottomColor: Colors.SUCCESS },
  statCardError: { borderBottomWidth: 3, borderBottomColor: Colors.ERROR },
  statValue: {
    fontSize: FONT_SIZES.h1,
    fontWeight: "700",
    color: Colors.NAVY,
  },
  statLabel: {
    fontSize: FONT_SIZES.caption,
    color: Colors.TEXT_SECONDARY,
    marginTop: 2,
  },

  // ── 4. Actions ──
  actionBtn: {
    marginHorizontal: 20,
    marginTop: SECTION_SPACING,
  },

  // ── 5. Stats détaillées ──
  statsDetailBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.BACKGROUND,
    borderRadius: CARD_RADIUS,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 12,
    gap: 10,
    ...CARD_SHADOW,
  },
  statsDetailText: {
    flex: 1,
    fontSize: FONT_SIZES.body,
    fontWeight: "600",
    color: Colors.NAVY,
  },

  // ── 6. Déconnexion ──
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: SECTION_SPACING,
    paddingVertical: 14,
  },
  logoutText: {
    fontSize: FONT_SIZES.body,
    fontWeight: "600",
    color: Colors.ERROR,
  },
});

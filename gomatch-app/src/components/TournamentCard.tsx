import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { CARD_RADIUS, CARD_SHADOW, FONT_SIZES } from "../constants/theme";
import { formatDate } from "../utils/helpers";
import type { TournamentListItem } from "../types";

interface TournamentCardProps {
  tournament: TournamentListItem;
  onPress?: () => void;
}

export function TournamentCard({ tournament, onPress }: TournamentCardProps) {
  const isPadel = tournament.sport === "padel";

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      disabled={!onPress}
    >
      <LinearGradient
        colors={["#1A6B4A", "#0F4C35"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <Text style={styles.title} numberOfLines={2}>
          {tournament.name}
        </Text>
        <Text style={styles.meta}>
          {isPadel ? "🏓 Padel" : "🎾 Tennis"} • {formatDate(tournament.start_date)}
        </Text>
        <View style={styles.badge}>
          <Ionicons name="trophy" size={14} color="#FFFFFF" />
          <Text style={styles.badgeText}>
            {tournament.current_participants_count} Participants &gt;
          </Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 200,
    minHeight: 120,
    borderRadius: CARD_RADIUS,
    padding: 16,
    marginRight: 12,
    justifyContent: "space-between",
    ...CARD_SHADOW,
  },
  title: {
    fontSize: FONT_SIZES.h3,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  meta: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    marginBottom: 10,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  badgeText: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

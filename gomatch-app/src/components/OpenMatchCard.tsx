import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/colors";
import type { OpenMatchListItem, SkillLevel } from "../types";
import { formatDate, formatTime } from "../utils/helpers";

const LEVEL_SHORT: Record<SkillLevel, string> = {
  beginner: "Déb.",
  intermediate: "Inter.",
  advanced: "Avancé",
};

interface OpenMatchCardProps {
  match: OpenMatchListItem;
  onPress?: () => void;
  horizontal?: boolean;
}

export function OpenMatchCard({ match, onPress, horizontal }: OpenMatchCardProps) {
  const levelLabel =
    match.required_level_min && match.required_level_max
      ? `${LEVEL_SHORT[match.required_level_min]} – ${LEVEL_SHORT[match.required_level_max]}`
      : match.required_level_min
        ? LEVEL_SHORT[match.required_level_min] + "+"
        : "Tous niveaux";

  return (
    <TouchableOpacity
      style={[styles.card, horizontal && styles.cardHorizontal]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Sport icon */}
      <View style={styles.sportBadge}>
        <Text style={styles.sportEmoji}>
          {match.sport === "tennis" ? "🎾" : "🏓"}
        </Text>
      </View>

      {/* Level */}
      <View style={styles.levelBadge}>
        <Text style={styles.levelText}>{levelLabel}</Text>
      </View>

      {/* Creator */}
      <Text style={styles.creator} numberOfLines={1}>
        {match.created_by_name}
      </Text>

      {/* Date & time */}
      <View style={styles.row}>
        <Ionicons name="calendar-outline" size={13} color={Colors.TEXT_SECONDARY} />
        <Text style={styles.meta}>
          {formatDate(match.scheduled_date)} · {formatTime(match.scheduled_time)}
        </Text>
      </View>

      {/* Spots */}
      <View style={styles.row}>
        <Ionicons name="people-outline" size={13} color={Colors.TEXT_SECONDARY} />
        <Text style={[styles.meta, match.spots_left <= 1 && styles.metaUrgent]}>
          {match.spots_left} place{match.spots_left > 1 ? "s" : ""} restante{match.spots_left > 1 ? "s" : ""}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.BACKGROUND,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHorizontal: {
    width: 180,
    marginRight: 12,
  },
  sportBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.PRIMARY + "12",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  sportEmoji: {
    fontSize: 20,
  },
  levelBadge: {
    alignSelf: "flex-start",
    backgroundColor: Colors.PRIMARY + "15",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  levelText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.PRIMARY,
  },
  creator: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.TEXT,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },
  meta: {
    fontSize: 12,
    color: Colors.TEXT_SECONDARY,
    marginLeft: 5,
  },
  metaUrgent: {
    color: Colors.ERROR,
    fontWeight: "600",
  },
});

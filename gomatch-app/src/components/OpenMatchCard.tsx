import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Avatar } from "./Avatar";
import { Colors } from "../constants/colors";
import { CARD_RADIUS, CARD_SHADOW, FONT_SIZES } from "../constants/theme";
import type { OpenMatchListItem, SkillLevel } from "../types";
import { formatDate, formatTime } from "../utils/helpers";

const LEVEL_LABELS: Record<SkillLevel, string> = {
  beginner: "Débutant",
  intermediate: "Intermédiaire",
  advanced: "Avancé",
};

interface OpenMatchCardProps {
  match: OpenMatchListItem;
  onPress?: () => void;
  horizontal?: boolean;
}

function sessionDate(date: string, time: string): string {
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

export function OpenMatchCard({ match, onPress, horizontal }: OpenMatchCardProps) {
  const isPadel = match.sport === "padel";
  const isFriendly = match.play_mode === "friendly";
  const gradientColors: [string, string] = isFriendly
    ? ["#2E8B57", "#1A3A5C"]
    : ["#3B82F6", "#1A3A5C"];

  const levelLabel = match.required_level_min
    ? LEVEL_LABELS[match.required_level_min]
    : "Tous niveaux";
  const filled = match.max_participants - match.spots_left;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      disabled={!onPress}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, horizontal && styles.cardHorizontal]}
      >
        {/* Badge "Ouvert" */}
        <View style={styles.openBadge}>
          <Text style={styles.openBadgeText}>Ouvert</Text>
        </View>

        <Text style={styles.title}>
          {isFriendly ? "Match Amical" : "Match Compétition"}
        </Text>
        <Text style={styles.meta}>
          {isPadel ? "🏓 Padel" : "🎾 Tennis"} •{" "}
          {sessionDate(match.scheduled_date, match.scheduled_time)}
        </Text>

        <View style={styles.bottom}>
          <View style={styles.avatarRow}>
            <Avatar name={match.created_by_name} size="sm" />
            {filled > 1 && (
              <View style={styles.avatarOverlap}>
                <Avatar name={`P${filled}`} size="sm" />
              </View>
            )}
          </View>
          <Text style={styles.players}>
            {filled}/{match.max_participants} joueurs
          </Text>
        </View>

        {/* Level badge */}
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>{levelLabel}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 280,
    height: 160,
    borderRadius: CARD_RADIUS,
    padding: 16,
    justifyContent: "space-between",
    marginBottom: 10,
    ...CARD_SHADOW,
  },
  cardHorizontal: {
    marginRight: 12,
  },
  openBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: Colors.SUCCESS,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  openBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  title: {
    fontSize: FONT_SIZES.h3,
    fontWeight: "700",
    color: "#FFFFFF",
    marginRight: 70,
  },
  meta: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
  },
  bottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarOverlap: {
    marginLeft: -8,
  },
  players: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "700",
    color: "rgba(255,255,255,0.9)",
  },
  levelBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  levelText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

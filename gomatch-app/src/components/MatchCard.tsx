import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Avatar } from "./Avatar";
import { CARD_RADIUS, CARD_SHADOW, FONT_SIZES } from "../constants/theme";
import type { MatchListItem } from "../types";
import { formatDate, formatTime } from "../utils/helpers";

interface MatchCardProps {
  match: MatchListItem;
  onPress?: () => void;
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

export function MatchCard({ match, onPress }: MatchCardProps) {
  const isFriendly = match.play_mode === "friendly";
  const isPadel = match.sport === "padel";
  const gradientColors: [string, string] = isFriendly
    ? ["#2E8B57", "#1A3A5C"]
    : ["#3B82F6", "#1A3A5C"];
  const spotsLeft = match.max_participants - match.current_participants_count;

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
        style={styles.card}
      >
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
            {match.current_participants_count > 1 && (
              <View style={styles.avatarOverlap}>
                <Avatar
                  name={`P${match.current_participants_count}`}
                  size="sm"
                />
              </View>
            )}
            {spotsLeft > 0 && (
              <View style={styles.plusBadge}>
                <Text style={styles.plusText}>+{spotsLeft}</Text>
              </View>
            )}
          </View>
          <Text style={styles.players}>
            {match.current_participants_count}/{match.max_participants}
          </Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 280,
    height: 140,
    borderRadius: CARD_RADIUS,
    padding: 16,
    justifyContent: "space-between",
    marginRight: 12,
    marginBottom: 10,
    ...CARD_SHADOW,
  },
  title: {
    fontSize: FONT_SIZES.h3,
    fontWeight: "700",
    color: "#FFFFFF",
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
  plusBadge: {
    marginLeft: -8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  plusText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  players: {
    fontSize: FONT_SIZES.caption,
    fontWeight: "700",
    color: "rgba(255,255,255,0.9)",
  },
});

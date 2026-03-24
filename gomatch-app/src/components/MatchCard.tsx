import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/colors";
import type { MatchListItem, MatchStatus } from "../types";
import { formatDate, formatTime } from "../utils/helpers";

const STATUS_CONFIG: Record<MatchStatus, { label: string; color: string }> = {
  draft: { label: "Brouillon", color: Colors.TEXT_SECONDARY },
  open: { label: "Ouvert", color: "#2563EB" },
  confirmed: { label: "Confirmé", color: Colors.PRIMARY },
  in_progress: { label: "En cours", color: "#F59E0B" },
  completed: { label: "Terminé", color: Colors.SUCCESS },
  cancelled: { label: "Annulé", color: Colors.ERROR },
};

interface MatchCardProps {
  match: MatchListItem;
  onPress?: () => void;
}

export function MatchCard({ match, onPress }: MatchCardProps) {
  const statusCfg = STATUS_CONFIG[match.status];

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      {/* Left: sport icon */}
      <View style={styles.sportBadge}>
        <Text style={styles.sportEmoji}>
          {match.sport === "tennis" ? "🎾" : "🏓"}
        </Text>
      </View>

      {/* Center: info */}
      <View style={styles.info}>
        <View style={styles.topRow}>
          <Text style={styles.title} numberOfLines={1}>
            {match.match_type === "singles" ? "Simple" : "Double"} · {match.created_by_name}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.color + "18" }]}>
            <Text style={[styles.statusText, { color: statusCfg.color }]}>
              {statusCfg.label}
            </Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={13} color={Colors.TEXT_SECONDARY} />
          <Text style={styles.meta}>
            {formatDate(match.scheduled_date)} · {formatTime(match.scheduled_time)}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="people-outline" size={13} color={Colors.TEXT_SECONDARY} />
          <Text style={styles.meta}>
            {match.current_participants_count}/{match.max_participants} joueurs
          </Text>
        </View>
      </View>

      {/* Right: chevron */}
      {onPress && (
        <Ionicons name="chevron-forward" size={18} color={Colors.BORDER} style={styles.chevron} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.BACKGROUND,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sportBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.PRIMARY + "12",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  sportEmoji: {
    fontSize: 22,
  },
  info: {
    flex: 1,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.TEXT,
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  meta: {
    fontSize: 12,
    color: Colors.TEXT_SECONDARY,
    marginLeft: 5,
  },
  chevron: {
    marginLeft: 4,
  },
});

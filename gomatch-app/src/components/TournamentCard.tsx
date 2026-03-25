import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/colors";
import { formatDate } from "../utils/helpers";
import type { TournamentListItem, TournamentStatus } from "../types";

const STATUS_CONFIG: Record<TournamentStatus, { label: string; color: string }> = {
  registration: { label: "Inscriptions ouvertes", color: Colors.SUCCESS },
  in_progress: { label: "En cours", color: "#F59E0B" },
  completed: { label: "Terminé", color: Colors.TEXT_SECONDARY },
  cancelled: { label: "Annulé", color: Colors.ERROR },
};

const FORMAT_LABELS: Record<string, string> = {
  single_elimination: "Élimination directe",
  round_robin: "Poules",
};

interface TournamentCardProps {
  tournament: TournamentListItem;
  onPress?: () => void;
}

export function TournamentCard({ tournament, onPress }: TournamentCardProps) {
  const statusCfg = STATUS_CONFIG[tournament.status];
  const spotsLeft = tournament.max_participants - tournament.current_participants_count;

  return (
    <TouchableOpacity
      style={s.card}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      {/* Badge inscription ouverte */}
      {tournament.status === "registration" && (
        <View style={s.openBadge}>
          <Text style={s.openBadgeText}>INSCRIPTIONS OUVERTES</Text>
        </View>
      )}

      {/* Header */}
      <View style={s.header}>
        <View style={s.sportBadge}>
          <Text style={s.sportEmoji}>
            {tournament.sport === "tennis" ? "🎾" : "🏓"}
          </Text>
        </View>
        <View style={s.headerInfo}>
          <Text style={s.name} numberOfLines={1}>
            {tournament.name}
          </Text>
          <Text style={s.format}>
            {FORMAT_LABELS[tournament.format] || tournament.format} ·{" "}
            {tournament.match_type === "singles" ? "Simple" : "Double"}
          </Text>
        </View>
        <View style={[s.statusBadge, { backgroundColor: statusCfg.color + "18" }]}>
          <Text style={[s.statusText, { color: statusCfg.color }]}>
            {statusCfg.label}
          </Text>
        </View>
      </View>

      {/* Meta */}
      <View style={s.metaSection}>
        <View style={s.metaRow}>
          <Ionicons name="calendar-outline" size={14} color={Colors.TEXT_SECONDARY} />
          <Text style={s.metaText}>{formatDate(tournament.start_date)}</Text>
        </View>
        <View style={s.metaRow}>
          <Ionicons name="people-outline" size={14} color={Colors.TEXT_SECONDARY} />
          <Text style={s.metaText}>
            {tournament.current_participants_count}/{tournament.max_participants}{" "}
            {spotsLeft > 0 ? `(${spotsLeft} place${spotsLeft > 1 ? "s" : ""})` : "(complet)"}
          </Text>
        </View>
        {tournament.entry_fee && parseFloat(tournament.entry_fee) > 0 && (
          <View style={s.metaRow}>
            <Ionicons name="cash-outline" size={14} color={Colors.TEXT_SECONDARY} />
            <Text style={s.metaText}>{tournament.entry_fee} CHF</Text>
          </View>
        )}
        {tournament.venue_name && (
          <View style={s.metaRow}>
            <Ionicons name="location-outline" size={14} color={Colors.TEXT_SECONDARY} />
            <Text style={s.metaText} numberOfLines={1}>{tournament.venue_name}</Text>
          </View>
        )}
      </View>

      {/* Chevron */}
      {onPress && (
        <View style={s.chevronWrap}>
          <Ionicons name="chevron-forward" size={18} color={Colors.BORDER} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: Colors.BACKGROUND,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  openBadge: {
    alignSelf: "flex-start",
    backgroundColor: Colors.SUCCESS + "18",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  openBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.SUCCESS,
    letterSpacing: 0.5,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  sportBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.PRIMARY + "12",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  sportEmoji: {
    fontSize: 22,
  },
  headerInfo: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.TEXT,
  },
  format: {
    fontSize: 12,
    color: Colors.TEXT_SECONDARY,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  metaSection: {
    gap: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    fontSize: 12,
    color: Colors.TEXT_SECONDARY,
    marginLeft: 6,
  },
  chevronWrap: {
    position: "absolute",
    right: 14,
    top: "50%",
  },
});

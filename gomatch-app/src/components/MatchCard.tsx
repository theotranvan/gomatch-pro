import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Card } from "./Card";
import { Colors } from "../constants/colors";
import type { MatchListItem } from "../types";
import { formatDate } from "../utils/helpers";

interface MatchCardProps {
  match: MatchListItem;
  onPress?: () => void;
}

export function MatchCard({ match, onPress }: MatchCardProps) {
  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress}>
      <Card>
        <View style={styles.header}>
          <Text style={styles.sport}>
            {match.sport === "tennis" ? "🎾" : "🏓"}{" "}
            {match.sport.charAt(0).toUpperCase() + match.sport.slice(1)}
          </Text>
          <Text style={styles.status}>{match.status}</Text>
        </View>
        <Text style={styles.type}>
          {match.match_type === "singles" ? "Simple" : "Double"}
        </Text>
        {match.scheduled_date && (
          <Text style={styles.date}>
            {formatDate(match.scheduled_date)}
            {match.scheduled_time ? ` à ${match.scheduled_time.slice(0, 5)}` : ""}
          </Text>
        )}
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sport: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.TEXT,
  },
  status: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.PRIMARY,
    textTransform: "capitalize",
  },
  type: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
    marginBottom: 4,
  },
  date: {
    fontSize: 13,
    color: Colors.TEXT_SECONDARY,
  },
});

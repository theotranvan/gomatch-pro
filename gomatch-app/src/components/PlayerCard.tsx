import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Card } from "./Card";
import { Colors } from "../constants/colors";
import type { PlayerProfile } from "../types";
import { getInitials } from "../utils/helpers";

interface PlayerCardProps {
  player: PlayerProfile;
  onPress?: () => void;
}

export function PlayerCard({ player, onPress }: PlayerCardProps) {
  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress}>
      <Card>
        <View style={styles.row}>
          <View style={styles.avatar}>
            <Text style={styles.initials}>
              {player.username
                ? player.username.slice(0, 2).toUpperCase()
                : getInitials(player.first_name, player.last_name)}
            </Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>
              {player.username ? `@${player.username}` : `${player.first_name} ${player.last_name}`}
            </Text>
            {player.city && (
              <Text style={styles.detail}>{player.city}</Text>
            )}
            {player.level_tennis && (
              <Text style={styles.detail}>🎾 Tennis · {player.level_tennis}</Text>
            )}
            {player.level_padel && (
              <Text style={styles.detail}>🏓 Padel · {player.level_padel}</Text>
            )}
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  initials: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.TEXT,
  },
  detail: {
    fontSize: 13,
    color: Colors.TEXT_SECONDARY,
    marginTop: 2,
  },
});

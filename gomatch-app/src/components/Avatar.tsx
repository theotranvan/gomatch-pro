import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { AVATAR_SIZE_SM, AVATAR_SIZE_MD, AVATAR_SIZE_LG } from "../constants/theme";

const AVATAR_COLORS = [
  "#8B5CF6",
  "#F97316",
  "#EF4444",
  "#3B82F6",
  "#10B981",
  "#EC4899",
];

function colorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const SIZE_MAP = { sm: AVATAR_SIZE_SM, md: AVATAR_SIZE_MD, lg: AVATAR_SIZE_LG } as const;

interface AvatarProps {
  imageUrl?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
}

export function Avatar({ imageUrl, name, size = "sm" }: AvatarProps) {
  const px = SIZE_MAP[size];
  const initial = (name.charAt(0) || "?").toUpperCase();

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[styles.image, { width: px, height: px, borderRadius: px / 2 }]}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        { width: px, height: px, borderRadius: px / 2, backgroundColor: colorFromName(name) },
      ]}
    >
      <Text style={[styles.initial, { fontSize: px * 0.44 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    resizeMode: "cover",
  },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  initial: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});

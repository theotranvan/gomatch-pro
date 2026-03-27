import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";
import { FONT_SIZES } from "../../constants/theme";

export function NotificationsScreen() {
  return (
    <View style={styles.container}>
      <Ionicons name="notifications-outline" size={64} color={Colors.TEXT_SECONDARY} />
      <Text style={styles.title}>Notifications</Text>
      <Text style={styles.subtitle}>Aucune notification pour le moment</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BACKGROUND,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  title: {
    fontSize: FONT_SIZES.h1,
    fontWeight: "700",
    color: Colors.TEXT,
    marginTop: 16,
  },
  subtitle: {
    fontSize: FONT_SIZES.body,
    color: Colors.TEXT_SECONDARY,
    marginTop: 8,
    textAlign: "center",
  },
});

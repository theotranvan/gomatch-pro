import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../../constants/colors";

export function RankingScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Classement</Text>
      <Text style={styles.subtitle}>Le classement complet arrive bientôt.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BACKGROUND,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.TEXT,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
  },
});

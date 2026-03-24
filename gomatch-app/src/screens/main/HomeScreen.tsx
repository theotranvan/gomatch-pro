import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAuth } from "../../hooks/useAuth";
import { Colors } from "../../constants/colors";

export function HomeScreen() {
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>
        Bonjour {user?.profile.first_name || "Joueur"} 👋
      </Text>
      <Text style={styles.subtitle}>Prêt pour un match ?</Text>
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
  greeting: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.TEXT,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.TEXT_SECONDARY,
    marginTop: 4,
  },
});

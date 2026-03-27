import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../hooks/useAuth";
import { Colors } from "../constants/colors";
import { FONT_SIZES } from "../constants/theme";
import { Avatar } from "./Avatar";

const HEADER_HEIGHT = 56;

export function AppHeader() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const displayName = user?.profile?.first_name || user?.email || "?";

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        {/* ── Logo ── */}
        <View style={styles.logoContainer}>
          <Ionicons name="tennisball" size={22} color={Colors.GREEN} />
          <Text style={styles.logoText}>GoMatch</Text>
        </View>

        {/* ── Right actions ── */}
        <View style={styles.rightActions}>
          <TouchableOpacity
            onPress={() => navigation.navigate("Notifications")}
            hitSlop={8}
            style={styles.bellButton}
          >
            <Ionicons name="notifications-outline" size={24} color={Colors.NAVY} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate("Profile")}
            hitSlop={8}
          >
            <Avatar
              imageUrl={user?.profile?.avatar_url}
              name={displayName}
              size="sm"
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.BACKGROUND,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    zIndex: 10,
  },
  row: {
    height: HEADER_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  logoText: {
    fontSize: FONT_SIZES.h2,
    fontWeight: "800",
    color: Colors.NAVY,
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bellButton: {
    position: "relative",
  },
});

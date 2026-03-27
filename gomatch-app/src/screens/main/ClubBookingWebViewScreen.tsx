import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  SafeAreaView,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";

export function ClubBookingWebViewScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();

  const { venueName, bookingUrl } = route.params as {
    venueId: string;
    venueName: string;
    bookingUrl: string;
  };

  const [loading, setLoading] = useState(true);

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.TEXT} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {venueName}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            Réservation
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => Linking.openURL(bookingUrl)}
          style={styles.externalButton}
          activeOpacity={0.7}
        >
          <Ionicons name="open-outline" size={22} color={Colors.NAVY} />
        </TouchableOpacity>
      </View>

      {/* ── WebView ── */}
      <View style={styles.webViewContainer}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={Colors.NAVY} />
            <Text style={styles.loadingText}>Chargement…</Text>
          </View>
        )}
        <WebView
          source={{ uri: bookingUrl }}
          style={styles.webView}
          onLoadEnd={() => setLoading(false)}
          startInLoadingState={false}
          javaScriptEnabled
          domStorageEnabled
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BACKGROUND,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
    backgroundColor: Colors.BACKGROUND,
  },
  backButton: {
    padding: 6,
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.TEXT,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.TEXT_SECONDARY,
    marginTop: 1,
  },
  externalButton: {
    padding: 6,
  },
  webViewContainer: {
    flex: 1,
  },
  webView: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.BACKGROUND,
    zIndex: 10,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
    marginTop: 10,
  },
});

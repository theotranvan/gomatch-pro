import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";
import { venuesService } from "../../services/venues";
import type { Venue, Court } from "../../types";

const SURFACE_LABELS: Record<string, string> = {
  clay: "Terre battue",
  hard: "Dur",
  grass: "Gazon",
  artificial: "Synthétique",
};

const PLACEHOLDER_COLORS = [
  "#E8F5EE",
  "#E3F2FD",
  "#FFF3E0",
  "#F3E5F5",
  "#E0F2F1",
  "#FBE9E7",
];

function getPlaceholderColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PLACEHOLDER_COLORS[Math.abs(hash) % PLACEHOLDER_COLORS.length];
}

export function VenueDetailScreen() {
  const route = useRoute<any>();
  const venueId: string = route.params?.venueId;

  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    venuesService
      .getVenue(venueId)
      .then(setVenue)
      .finally(() => setLoading(false));
  }, [venueId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.PRIMARY} />
      </View>
    );
  }

  if (!venue) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.BORDER} />
        <Text style={styles.errorText}>Club introuvable</Text>
      </View>
    );
  }

  const tennisCourts = venue.courts.filter((c) => c.sport === "tennis");
  const padelCourts = venue.courts.filter((c) => c.sport === "padel");

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ── Hero image ── */}
      {venue.image_url ? (
        <Image source={{ uri: venue.image_url }} style={styles.heroImage} />
      ) : (
        <View
          style={[
            styles.heroImage,
            styles.heroPlaceholder,
            { backgroundColor: getPlaceholderColor(venue.id) },
          ]}
        >
          <Ionicons name="business" size={56} color={Colors.PRIMARY} />
        </View>
      )}

      {/* ── Info section ── */}
      <View style={styles.infoSection}>
        <Text style={styles.name}>{venue.name}</Text>

        <View style={styles.infoRow}>
          <Ionicons
            name="location-outline"
            size={18}
            color={Colors.TEXT_SECONDARY}
          />
          <Text style={styles.infoText}>
            {venue.address}, {venue.city}
          </Text>
        </View>

        {venue.phone ? (
          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => Linking.openURL(`tel:${venue.phone}`)}
            activeOpacity={0.7}
          >
            <Ionicons name="call-outline" size={18} color={Colors.PRIMARY} />
            <Text style={[styles.infoText, styles.linkText]}>
              {venue.phone}
            </Text>
          </TouchableOpacity>
        ) : null}

        {venue.website_url ? (
          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => Linking.openURL(venue.website_url!)}
            activeOpacity={0.7}
          >
            <Ionicons name="globe-outline" size={18} color={Colors.PRIMARY} />
            <Text style={[styles.infoText, styles.linkText]} numberOfLines={1}>
              {venue.website_url.replace(/^https?:\/\//, "")}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* ── Courts section ── */}
      <View style={styles.courtsSection}>
        <Text style={styles.sectionTitle}>
          Terrains ({venue.courts.length})
        </Text>

        {tennisCourts.length > 0 && (
          <>
            <View style={styles.sportHeader}>
              <Text style={styles.sportEmoji}>🎾</Text>
              <Text style={styles.sportLabel}>Tennis</Text>
              <View style={styles.sportBadge}>
                <Text style={styles.sportBadgeText}>
                  {tennisCourts.length}
                </Text>
              </View>
            </View>
            {tennisCourts.map((court) => (
              <CourtCard key={court.id} court={court} />
            ))}
          </>
        )}

        {padelCourts.length > 0 && (
          <>
            <View style={styles.sportHeader}>
              <Text style={styles.sportEmoji}>🏓</Text>
              <Text style={styles.sportLabel}>Padel</Text>
              <View style={styles.sportBadge}>
                <Text style={styles.sportBadgeText}>
                  {padelCourts.length}
                </Text>
              </View>
            </View>
            {padelCourts.map((court) => (
              <CourtCard key={court.id} court={court} />
            ))}
          </>
        )}

        {venue.courts.length === 0 && (
          <View style={styles.noCourts}>
            <Text style={styles.noCourtsText}>
              Aucun terrain enregistré pour ce club.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function CourtCard({ court }: { court: Court }) {
  return (
    <View style={styles.courtCard}>
      <View style={styles.courtHeader}>
        <Text style={styles.courtName}>{court.name}</Text>
        <View
          style={[
            styles.indoorBadge,
            court.is_indoor ? styles.indoorBadgeBlue : styles.outdoorBadgeGreen,
          ]}
        >
          <Ionicons
            name={court.is_indoor ? "home-outline" : "sunny-outline"}
            size={12}
            color={court.is_indoor ? "#1565C0" : "#2E7D32"}
          />
          <Text
            style={[
              styles.indoorText,
              court.is_indoor
                ? { color: "#1565C0" }
                : { color: "#2E7D32" },
            ]}
          >
            {court.is_indoor ? "Indoor" : "Outdoor"}
          </Text>
        </View>
      </View>

      <View style={styles.courtMeta}>
        <View style={styles.courtChip}>
          <Ionicons
            name="layers-outline"
            size={13}
            color={Colors.TEXT_SECONDARY}
          />
          <Text style={styles.courtChipText}>
            {SURFACE_LABELS[court.surface] ?? court.surface}
          </Text>
        </View>

        <View style={[styles.courtChip, styles.priceChip]}>
          <Text style={styles.priceText}>
            CHF {parseFloat(court.hourly_rate).toFixed(0)}.-/h
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  content: {
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.BACKGROUND,
  },
  errorText: {
    fontSize: 16,
    color: Colors.TEXT_SECONDARY,
    marginTop: 12,
  },

  // ── Hero ──
  heroImage: {
    width: "100%",
    height: 220,
  },
  heroPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Info ──
  infoSection: {
    backgroundColor: Colors.BACKGROUND,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  name: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.TEXT,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 15,
    color: Colors.TEXT_SECONDARY,
    flex: 1,
  },
  linkText: {
    color: Colors.PRIMARY,
    fontWeight: "600",
  },

  // ── Courts section ──
  courtsSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.TEXT,
    marginBottom: 16,
  },
  sportHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
    marginTop: 4,
  },
  sportEmoji: {
    fontSize: 18,
  },
  sportLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.TEXT,
  },
  sportBadge: {
    backgroundColor: Colors.PRIMARY + "15",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sportBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.PRIMARY,
  },

  // ── Court card ──
  courtCard: {
    backgroundColor: Colors.BACKGROUND,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  courtHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  courtName: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.TEXT,
  },
  indoorBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  indoorBadgeBlue: {
    backgroundColor: "#E3F2FD",
  },
  outdoorBadgeGreen: {
    backgroundColor: "#E8F5E9",
  },
  indoorText: {
    fontSize: 11,
    fontWeight: "700",
  },
  courtMeta: {
    flexDirection: "row",
    gap: 10,
  },
  courtChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  courtChipText: {
    fontSize: 12,
    color: Colors.TEXT_SECONDARY,
    fontWeight: "600",
  },
  priceChip: {
    backgroundColor: Colors.PRIMARY + "12",
  },
  priceText: {
    fontSize: 13,
    color: Colors.PRIMARY,
    fontWeight: "700",
  },

  // ── No courts ──
  noCourts: {
    paddingVertical: 24,
    alignItems: "center",
  },
  noCourtsText: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
  },
});

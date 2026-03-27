import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { Colors } from "../../constants/colors";
import { Button } from "../../components/Button";
import { LoadingScreen } from "../../components/LoadingScreen";
import { ErrorState } from "../../components/ErrorState";
import { bookingsService } from "../../services/bookings";
import type { Booking, BookingStatus } from "../../types";

const STATUS_CONFIG: Record<BookingStatus, { label: string; color: string; icon: string }> = {
  pending: { label: "En attente", color: "#F59E0B", icon: "time-outline" },
  confirmed: { label: "Confirmée", color: Colors.SUCCESS, icon: "checkmark-circle-outline" },
  cancelled: { label: "Annulée", color: Colors.ERROR, icon: "close-circle-outline" },
};

export function BookingDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { bookingId } = route.params as { bookingId: string };

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBooking = useCallback(async () => {
    try {
      const data = await bookingsService.getBookingDetail(bookingId);
      setBooking(data);
      setError(null);
    } catch {
      setError("Impossible de charger la réservation");
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBooking();
    setRefreshing(false);
  }, [fetchBooking]);

  const handleCancel = () => {
    Alert.alert(
      "Annuler la réservation",
      "Es-tu sûr de vouloir annuler cette réservation ?",
      [
        { text: "Non", style: "cancel" },
        {
          text: "Oui, annuler",
          style: "destructive",
          onPress: async () => {
            setCancelling(true);
            try {
              const updated = await bookingsService.cancelBooking(bookingId);
              setBooking(updated);
              Toast.show({ type: "success", text1: "Réservation annulée" });
            } catch {
              Toast.show({ type: "error", text1: "Erreur", text2: "Impossible d'annuler la réservation" });
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
    );
  };

  if (loading) return <LoadingScreen />;
  if (error || !booking) {
    return (
      <ErrorState
        message={error ?? "Réservation introuvable"}
        onRetry={fetchBooking}
      />
    );
  }

  const cfg = STATUS_CONFIG[booking.status];
  const canCancel = booking.status !== "cancelled";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.NAVY}
          colors={[Colors.NAVY]}
        />
      }
    >
      {/* Status badge */}
      <View style={[styles.statusBadge, { backgroundColor: cfg.color + "15" }]}>
        <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
        <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
      </View>

      {/* Details card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Détails</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Montant total</Text>
          <Text style={styles.value}>CHF {booking.total_amount}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Par joueur</Text>
          <Text style={styles.value}>CHF {booking.per_player_amount}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Créée le</Text>
          <Text style={styles.value}>
            {new Date(booking.created_at).toLocaleDateString("fr-CH")}
          </Text>
        </View>

        {booking.cancelled_at && (
          <View style={styles.row}>
            <Text style={styles.label}>Annulée le</Text>
            <Text style={[styles.value, { color: Colors.ERROR }]}>
              {new Date(booking.cancelled_at).toLocaleDateString("fr-CH")}
            </Text>
          </View>
        )}
      </View>

      {/* Cancel button */}
      {canCancel && (
        <Button
          title={cancelling ? "Annulation..." : "Annuler la réservation"}
          onPress={handleCancel}
          variant="danger"
          disabled={cancelling}
          style={styles.cancelBtn}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  statusText: {
    fontSize: 15,
    fontWeight: "700",
  },
  card: {
    backgroundColor: Colors.BACKGROUND,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.TEXT,
    marginBottom: 14,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  label: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
  },
  value: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.TEXT,
  },
  cancelBtn: {
    marginTop: 8,
  },
});

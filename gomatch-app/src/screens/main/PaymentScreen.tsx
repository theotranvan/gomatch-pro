import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { CardField, useConfirmPayment } from "@stripe/stripe-react-native";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { Colors } from "../../constants/colors";
import { paymentsService } from "../../services/payments";
import type { HomeStackParamList } from "../../navigation/HomeStack";

type PaymentScreenRoute = RouteProp<HomeStackParamList, "Payment">;

export function PaymentScreen() {
  const route = useRoute<PaymentScreenRoute>();
  const navigation = useNavigation<any>();
  const { confirmPayment } = useConfirmPayment();

  const {
    bookingId,
    matchId,
    courtName,
    venueName,
    date,
    time,
    pricePerPlayer,
  } = route.params;

  const [cardComplete, setCardComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePay = async () => {
    if (!cardComplete) {
      setError("Complète les informations de ta carte");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // 1. Create payment intent on backend
      const intent = await paymentsService.createPaymentIntent(bookingId);

      // 2. Confirm payment with Stripe SDK
      const { error: stripeError } = await confirmPayment(intent.client_secret, {
        paymentMethodType: "Card",
      });

      if (stripeError) {
        setError(stripeError.message);
        return;
      }

      // 3. Success
      Toast.show({
        type: "success",
        text1: "Paiement réussi !",
        text2: `CHF ${pricePerPlayer.toFixed(2)} payé avec succès.`,
      });

      // 4. Navigate to match detail
      navigation.navigate("Home", {
        screen: "MatchDetail",
        params: { matchId },
      });
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        "Erreur lors du paiement";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Recap ── */}
      <View style={styles.recapCard}>
        <Text style={styles.recapTitle}>Récapitulatif</Text>

        <View style={styles.recapRow}>
          <Ionicons name="business-outline" size={18} color={Colors.TEXT_SECONDARY} />
          <Text style={styles.recapLabel}>{venueName}</Text>
        </View>

        <View style={styles.recapRow}>
          <Ionicons name="tennisball-outline" size={18} color={Colors.TEXT_SECONDARY} />
          <Text style={styles.recapLabel}>{courtName}</Text>
        </View>

        <View style={styles.recapRow}>
          <Ionicons name="calendar-outline" size={18} color={Colors.TEXT_SECONDARY} />
          <Text style={styles.recapLabel}>{date}</Text>
        </View>

        <View style={styles.recapRow}>
          <Ionicons name="time-outline" size={18} color={Colors.TEXT_SECONDARY} />
          <Text style={styles.recapLabel}>{time}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Ta part</Text>
          <Text style={styles.priceValue}>CHF {pricePerPlayer.toFixed(2)}</Text>
        </View>
      </View>

      {/* ── Card input ── */}
      <Text style={styles.sectionTitle}>Carte bancaire</Text>
      <View style={styles.cardContainer}>
        <CardField
          postalCodeEnabled={false}
          placeholders={{ number: "4242 4242 4242 4242" }}
          cardStyle={{
            backgroundColor: Colors.BACKGROUND,
            textColor: Colors.TEXT,
            placeholderColor: Colors.TEXT_SECONDARY,
            borderColor: Colors.BORDER,
            borderWidth: 1,
            borderRadius: 12,
            fontSize: 16,
          }}
          style={styles.cardField}
          onCardChange={(details: { complete: boolean }) => {
            setCardComplete(details.complete);
            if (error) setError(null);
          }}
        />
      </View>

      {/* ── Error ── */}
      {error && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={18} color={Colors.ERROR} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* ── Pay button ── */}
      <TouchableOpacity
        style={[
          styles.payBtn,
          (!cardComplete || loading) && styles.payBtnDisabled,
        ]}
        onPress={handlePay}
        disabled={!cardComplete || loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <>
            <Ionicons name="card-outline" size={22} color="#FFF" />
            <Text style={styles.payBtnText}>
              Payer CHF {pricePerPlayer.toFixed(2)}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* ── Secure notice ── */}
      <View style={styles.secureRow}>
        <Ionicons name="lock-closed-outline" size={14} color={Colors.TEXT_SECONDARY} />
        <Text style={styles.secureText}>Paiement sécurisé par Stripe</Text>
      </View>
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

  // ── Recap card ──
  recapCard: {
    backgroundColor: Colors.BACKGROUND,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  recapTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.TEXT,
    marginBottom: 16,
  },
  recapRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  recapLabel: {
    fontSize: 15,
    color: Colors.TEXT,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.BORDER,
    marginVertical: 14,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.TEXT,
  },
  priceValue: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.NAVY,
  },

  // ── Section ──
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.TEXT,
    marginTop: 24,
    marginBottom: 12,
  },

  // ── Card field ──
  cardContainer: {
    backgroundColor: Colors.BACKGROUND,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardField: {
    width: "100%",
    height: 50,
  },

  // ── Error ──
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.ERROR + "10",
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: Colors.ERROR,
    fontWeight: "500",
    flex: 1,
  },

  // ── Pay button ──
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.NAVY,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 24,
    shadowColor: Colors.NAVY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  payBtnDisabled: {
    opacity: 0.5,
  },
  payBtnText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFF",
  },

  // ── Secure ──
  secureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 16,
  },
  secureText: {
    fontSize: 12,
    color: Colors.TEXT_SECONDARY,
  },
});

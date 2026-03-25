import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { Colors } from "../../constants/colors";
import { matchesService, CreateMatchData } from "../../services/matches";
import { venuesService } from "../../services/venues";
import { bookingsService } from "../../services/bookings";
import type { Sport, MatchType, PlayMode, VenueListItem, Venue, Court, TimeSlot } from "../../types";

type OptionItem<T> = { value: T; label: string; icon?: string };

const SPORTS: OptionItem<Sport>[] = [
  { value: "tennis", label: "Tennis", icon: "🎾" },
  { value: "padel", label: "Padel", icon: "🏓" },
];

const TYPES: OptionItem<MatchType>[] = [
  { value: "singles", label: "Simple" },
  { value: "doubles", label: "Double" },
];

const MODES: OptionItem<PlayMode>[] = [
  { value: "friendly", label: "Amical" },
  { value: "competitive", label: "Compétition" },
];

export function CreateMatchScreen() {
  const navigation = useNavigation<any>();

  const [sport, setSport] = useState<Sport | null>(null);
  const [matchType, setMatchType] = useState<MatchType | null>(null);
  const [playMode, setPlayMode] = useState<PlayMode | null>(null);

  const isPadel = sport === "padel";
  const availableTypes = isPadel
    ? TYPES.filter((t) => t.value !== "singles")
    : TYPES;

  const handleSportChange = (s: Sport) => {
    setSport(s);
    if (s === "padel") {
      setMatchType("doubles");
    }
  };
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Venue / Court / Slot state ──
  const [showVenueStep, setShowVenueStep] = useState(false);
  const [venues, setVenues] = useState<VenueListItem[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [venueLoading, setVenueLoading] = useState(false);
  const [skippedVenue, setSkippedVenue] = useState(false);

  const scheduledDate =
    day && month && year
      ? `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
      : null;

  // Fetch venues when sport is selected
  useEffect(() => {
    if (!sport) return;
    (async () => {
      try {
        const res = await venuesService.getVenues({ sport });
        setVenues(res.results);
      } catch {
        // silently fail
      }
    })();
  }, [sport]);

  // Fetch slots when court + date are ready
  useEffect(() => {
    if (!selectedVenue || !selectedCourt || !scheduledDate) {
      setSlots([]);
      setSelectedSlot(null);
      return;
    }
    (async () => {
      setVenueLoading(true);
      try {
        const data = await bookingsService.getSlots(
          selectedVenue.id,
          selectedCourt.id,
          scheduledDate,
        );
        setSlots(data.filter((s) => s.status === "available"));
      } catch {
        setSlots([]);
      } finally {
        setVenueLoading(false);
      }
    })();
  }, [selectedVenue?.id, selectedCourt?.id, scheduledDate]);

  const handleSelectVenue = async (v: VenueListItem) => {
    setVenueLoading(true);
    setSelectedCourt(null);
    setSelectedSlot(null);
    try {
      const full = await venuesService.getVenue(v.id);
      setSelectedVenue(full);
    } catch {
      setError("Impossible de charger le centre");
    } finally {
      setVenueLoading(false);
    }
  };

  const filteredCourts = selectedVenue
    ? selectedVenue.courts.filter((c) => c.sport === sport && c.is_active)
    : [];

  const validate = (): string | null => {
    if (!sport) return "Choisis un sport";
    if (!matchType) return "Choisis le type de match";
    if (!playMode) return "Choisis le mode de jeu";

    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    if (!day || !month || !year || isNaN(d) || isNaN(m) || isNaN(y)) {
      return "Date invalide";
    }
    if (d < 1 || d > 31 || m < 1 || m > 12 || y < 2025 || y > new Date().getFullYear() + 1) {
      return "Date invalide";
    }
    const date = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return "La date ne peut pas être dans le passé";

    const h = parseInt(hour, 10);
    const min = parseInt(minute, 10);
    if (!hour || isNaN(h) || h < 0 || h > 23) return "Heure invalide";
    if (!minute || isNaN(min) || min < 0 || min > 59) return "Minutes invalides";

    return null;
  };

  const handleCreate = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setLoading(true);

    const matchDate = `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    const scheduledTime = `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}:00`;

    const data: CreateMatchData = {
      sport: sport!,
      match_type: matchType!,
      play_mode: playMode!,
      scheduled_date: matchDate,
      scheduled_time: scheduledTime,
      max_participants: matchType === "doubles" ? 4 : 2,
    };

    try {
      const match = await matchesService.createMatch(data);

      // If a slot was selected, create booking linked to the match
      if (selectedSlot && selectedCourt && selectedVenue) {
        try {
          await bookingsService.holdSlot(selectedCourt.id, selectedSlot.id);
          const booking = await bookingsService.createBooking(selectedSlot.id, match.id);

          // Navigate to payment screen
          const perPlayer = parseFloat(booking.per_player_amount);
          Toast.show({ type: "success", text1: "Match créé !", text2: "Procède au paiement." });
          navigation.navigate("Home", {
            screen: "Payment",
            params: {
              bookingId: booking.id,
              matchId: match.id,
              courtName: selectedCourt.name,
              venueName: selectedVenue.name,
              date: matchDate,
              time: `${selectedSlot.start_time.slice(0, 5)} – ${selectedSlot.end_time.slice(0, 5)}`,
              pricePerPlayer: perPlayer,
            },
          });
          return;
        } catch {
          // Match created but booking failed — inform user
          Toast.show({
            type: "info",
            text1: "Match créé",
            text2: "La réservation du terrain a échoué, tu peux réessayer plus tard.",
          });
          navigation.navigate("Home", {
            screen: "MatchDetail",
            params: { matchId: match.id },
          });
          return;
        }
      }

      Toast.show({ type: "success", text1: "Match créé !", text2: "Ton match a bien été créé." });
      navigation.navigate("Home", {
        screen: "MatchDetail",
        params: { matchId: match.id },
      });
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Erreur lors de la création du match";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  const isFormComplete =
    sport && matchType && playMode && day && month && year && hour && minute;

  function renderPicker<T extends string>(
    items: OptionItem<T>[],
    selected: T | null,
    onSelect: (v: T) => void,
  ) {
    return (
      <View style={styles.pickerRow}>
        {items.map((item) => {
          const active = selected === item.value;
          return (
            <TouchableOpacity
              key={item.value}
              style={[styles.pickerBtn, active && styles.pickerBtnActive]}
              onPress={() => onSelect(item.value)}
              activeOpacity={0.7}
            >
              {item.icon && <Text style={styles.pickerIcon}>{item.icon}</Text>}
              <Text
                style={[
                  styles.pickerLabel,
                  active && styles.pickerLabelActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Sport ─────────────────────── */}
        <Text style={styles.sectionTitle}>Sport</Text>
        {renderPicker(SPORTS, sport, handleSportChange)}

        {/* ── Type ──────────────────────── */}
        <Text style={styles.sectionTitle}>Type de match</Text>
        {renderPicker(availableTypes, matchType, setMatchType)}
        {isPadel && (
          <Text style={styles.padelHint}>
            Le padel se joue toujours à 4 joueurs (double)
          </Text>
        )}

        {/* ── Mode ──────────────────────── */}
        <Text style={styles.sectionTitle}>Mode de jeu</Text>
        {renderPicker(MODES, playMode, setPlayMode)}

        {/* ── Date ──────────────────────── */}
        <Text style={styles.sectionTitle}>Date</Text>
        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <Text style={styles.dateLabel}>Jour</Text>
            <TextInput
              style={styles.dateInput}
              value={day}
              onChangeText={(t) => setDay(t.replace(/[^0-9]/g, "").slice(0, 2))}
              keyboardType="number-pad"
              placeholder="JJ"
              placeholderTextColor={Colors.TEXT_SECONDARY}
              maxLength={2}
            />
          </View>
          <Text style={styles.dateSep}>/</Text>
          <View style={styles.dateField}>
            <Text style={styles.dateLabel}>Mois</Text>
            <TextInput
              style={styles.dateInput}
              value={month}
              onChangeText={(t) => setMonth(t.replace(/[^0-9]/g, "").slice(0, 2))}
              keyboardType="number-pad"
              placeholder="MM"
              placeholderTextColor={Colors.TEXT_SECONDARY}
              maxLength={2}
            />
          </View>
          <Text style={styles.dateSep}>/</Text>
          <View style={styles.dateField}>
            <Text style={styles.dateLabel}>Année</Text>
            <TextInput
              style={styles.dateInput}
              value={year}
              onChangeText={(t) => setYear(t.replace(/[^0-9]/g, "").slice(0, 4))}
              keyboardType="number-pad"
              placeholder="AAAA"
              placeholderTextColor={Colors.TEXT_SECONDARY}
              maxLength={4}
            />
          </View>
        </View>

        {/* ── Heure ─────────────────────── */}
        <Text style={styles.sectionTitle}>Heure</Text>
        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <Text style={styles.dateLabel}>Heures</Text>
            <TextInput
              style={styles.dateInput}
              value={hour}
              onChangeText={(t) => setHour(t.replace(/[^0-9]/g, "").slice(0, 2))}
              keyboardType="number-pad"
              placeholder="HH"
              placeholderTextColor={Colors.TEXT_SECONDARY}
              maxLength={2}
            />
          </View>
          <Text style={styles.dateSep}>:</Text>
          <View style={styles.dateField}>
            <Text style={styles.dateLabel}>Minutes</Text>
            <TextInput
              style={styles.dateInput}
              value={minute}
              onChangeText={(t) => setMinute(t.replace(/[^0-9]/g, "").slice(0, 2))}
              keyboardType="number-pad"
              placeholder="MM"
              placeholderTextColor={Colors.TEXT_SECONDARY}
              maxLength={2}
            />
          </View>
        </View>

        {/* ── Terrain (optional) ────────── */}
        {sport && day && month && year && (
          <>
            <Text style={styles.sectionTitle}>Réserver un terrain</Text>

            {!showVenueStep && !skippedVenue && (
              <View style={styles.venueChoiceRow}>
                <TouchableOpacity
                  style={styles.venueChoiceBtn}
                  onPress={() => setShowVenueStep(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="location-outline" size={20} color={Colors.PRIMARY} />
                  <Text style={styles.venueChoiceBtnText}>Choisir un terrain</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.venueSkipBtn}
                  onPress={() => setSkippedVenue(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.venueSkipBtnText}>On décidera plus tard</Text>
                </TouchableOpacity>
              </View>
            )}

            {skippedVenue && (
              <View style={styles.venueSkipped}>
                <Ionicons name="time-outline" size={18} color={Colors.TEXT_SECONDARY} />
                <Text style={styles.venueSkippedText}>Terrain non réservé</Text>
                <TouchableOpacity onPress={() => { setSkippedVenue(false); setShowVenueStep(true); }}>
                  <Text style={styles.venueChangeLink}>Modifier</Text>
                </TouchableOpacity>
              </View>
            )}

            {showVenueStep && (
              <>
                {/* Venue selection */}
                {!selectedVenue && (
                  <>
                    <Text style={styles.subLabel}>Centre</Text>
                    {venues.length === 0 ? (
                      <Text style={styles.emptyText}>Aucun centre disponible pour ce sport</Text>
                    ) : (
                      venues.map((v) => (
                        <TouchableOpacity
                          key={v.id}
                          style={styles.listItem}
                          onPress={() => handleSelectVenue(v)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.listItemLeft}>
                            <Ionicons name="business-outline" size={20} color={Colors.PRIMARY} />
                            <View>
                              <Text style={styles.listItemTitle}>{v.name}</Text>
                              <Text style={styles.listItemSub}>{v.city} · {v.court_count} terrain{v.court_count > 1 ? "s" : ""}</Text>
                            </View>
                          </View>
                          <Ionicons name="chevron-forward" size={18} color={Colors.TEXT_SECONDARY} />
                        </TouchableOpacity>
                      ))
                    )}
                  </>
                )}

                {/* Court selection */}
                {selectedVenue && !selectedCourt && (
                  <>
                    <View style={styles.breadcrumb}>
                      <TouchableOpacity onPress={() => { setSelectedVenue(null); setSelectedCourt(null); setSelectedSlot(null); }}>
                        <Text style={styles.breadcrumbLink}>{selectedVenue.name}</Text>
                      </TouchableOpacity>
                      <Ionicons name="chevron-forward" size={14} color={Colors.TEXT_SECONDARY} />
                      <Text style={styles.breadcrumbCurrent}>Court</Text>
                    </View>
                    <Text style={styles.subLabel}>Terrain</Text>
                    {filteredCourts.length === 0 ? (
                      <Text style={styles.emptyText}>Aucun terrain {sport} disponible</Text>
                    ) : (
                      filteredCourts.map((c) => (
                        <TouchableOpacity
                          key={c.id}
                          style={styles.listItem}
                          onPress={() => { setSelectedCourt(c); setSelectedSlot(null); }}
                          activeOpacity={0.7}
                        >
                          <View style={styles.listItemLeft}>
                            <Ionicons name="tennisball-outline" size={20} color={Colors.PRIMARY} />
                            <View>
                              <Text style={styles.listItemTitle}>{c.name}</Text>
                              <Text style={styles.listItemSub}>
                                {c.surface} · {c.is_indoor ? "Couvert" : "Extérieur"} · CHF {c.hourly_rate}/h
                              </Text>
                            </View>
                          </View>
                          <Ionicons name="chevron-forward" size={18} color={Colors.TEXT_SECONDARY} />
                        </TouchableOpacity>
                      ))
                    )}
                  </>
                )}

                {/* Slot selection */}
                {selectedVenue && selectedCourt && (
                  <>
                    <View style={styles.breadcrumb}>
                      <TouchableOpacity onPress={() => { setSelectedVenue(null); setSelectedCourt(null); setSelectedSlot(null); }}>
                        <Text style={styles.breadcrumbLink}>{selectedVenue.name}</Text>
                      </TouchableOpacity>
                      <Ionicons name="chevron-forward" size={14} color={Colors.TEXT_SECONDARY} />
                      <TouchableOpacity onPress={() => { setSelectedCourt(null); setSelectedSlot(null); }}>
                        <Text style={styles.breadcrumbLink}>{selectedCourt.name}</Text>
                      </TouchableOpacity>
                      <Ionicons name="chevron-forward" size={14} color={Colors.TEXT_SECONDARY} />
                      <Text style={styles.breadcrumbCurrent}>Créneau</Text>
                    </View>

                    <Text style={styles.subLabel}>Créneau disponible</Text>
                    {venueLoading ? (
                      <ActivityIndicator color={Colors.PRIMARY} style={{ marginVertical: 16 }} />
                    ) : slots.length === 0 ? (
                      <Text style={styles.emptyText}>Aucun créneau disponible à cette date</Text>
                    ) : (
                      <View style={styles.slotsGrid}>
                        {slots.map((s) => {
                          const active = selectedSlot?.id === s.id;
                          return (
                            <TouchableOpacity
                              key={s.id}
                              style={[styles.slotBtn, active && styles.slotBtnActive]}
                              onPress={() => setSelectedSlot(active ? null : s)}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.slotText, active && styles.slotTextActive]}>
                                {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}

                    {/* Recap */}
                    {selectedSlot && (
                      <View style={styles.recapBox}>
                        <Ionicons name="checkmark-circle" size={20} color={Colors.SUCCESS} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.recapTitle}>
                            {selectedCourt.name} · {selectedSlot.start_time.slice(0, 5)} – {selectedSlot.end_time.slice(0, 5)}
                          </Text>
                          <Text style={styles.recapPrice}>
                            CHF {selectedCourt.hourly_rate}
                            {matchType === "doubles"
                              ? ` (CHF ${(parseFloat(selectedCourt.hourly_rate) / 4).toFixed(2)} par joueur)`
                              : ` (CHF ${(parseFloat(selectedCourt.hourly_rate) / 2).toFixed(2)} par joueur)`}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Cancel venue choice */}
                    <TouchableOpacity
                      style={styles.venueResetBtn}
                      onPress={() => {
                        setShowVenueStep(false);
                        setSelectedVenue(null);
                        setSelectedCourt(null);
                        setSelectedSlot(null);
                      }}
                    >
                      <Text style={styles.venueResetText}>Annuler la réservation</Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* ── Error ─────────────────────── */}
        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={Colors.ERROR} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* ── Submit ────────────────────── */}
        <TouchableOpacity
          style={[
            styles.createBtn,
            (!isFormComplete || loading) && styles.createBtnDisabled,
          ]}
          onPress={handleCreate}
          disabled={loading || !isFormComplete}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="add-circle-outline" size={22} color="#FFFFFF" />
              <Text style={styles.createBtnText}>Créer le match</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: Colors.BACKGROUND,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },

  // ── Section ──────────
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.TEXT,
    marginTop: 20,
    marginBottom: 10,
  },
  padelHint: {
    fontSize: 13,
    color: Colors.PRIMARY,
    fontStyle: "italic",
    marginTop: 6,
  },

  // ── Picker buttons ───
  pickerRow: {
    flexDirection: "row",
    gap: 12,
  },
  pickerBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.BORDER,
    backgroundColor: "#FAFAFA",
    gap: 8,
  },
  pickerBtnActive: {
    borderColor: Colors.PRIMARY,
    backgroundColor: "#E8F5EE",
  },
  pickerIcon: {
    fontSize: 22,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.TEXT,
  },
  pickerLabelActive: {
    color: Colors.PRIMARY,
  },

  // ── Date / Time inputs ──
  dateRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  dateField: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    color: Colors.TEXT_SECONDARY,
    marginBottom: 4,
  },
  dateInput: {
    borderWidth: 1.5,
    borderColor: Colors.BORDER,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    color: Colors.TEXT,
    backgroundColor: "#FAFAFA",
  },
  dateSep: {
    fontSize: 22,
    fontWeight: "600",
    color: Colors.TEXT_SECONDARY,
    paddingBottom: 14,
  },

  // ── Error ──────────
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 14,
    marginTop: 20,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: Colors.ERROR,
    fontWeight: "500",
  },

  // ── Submit button ──
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.PRIMARY,
    borderRadius: 14,
    paddingVertical: 18,
    marginTop: 28,
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  createBtnDisabled: {
    opacity: 0.5,
  },
  createBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // ── Venue step ──
  venueChoiceRow: {
    gap: 10,
  },
  venueChoiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.PRIMARY,
    backgroundColor: "#E8F5EE",
  },
  venueChoiceBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.PRIMARY,
  },
  venueSkipBtn: {
    alignItems: "center",
    paddingVertical: 12,
  },
  venueSkipBtnText: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
    textDecorationLine: "underline",
  },
  venueSkipped: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 14,
  },
  venueSkippedText: {
    flex: 1,
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
  },
  venueChangeLink: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.PRIMARY,
  },
  subLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.TEXT_SECONDARY,
    marginBottom: 8,
    marginTop: 4,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 16,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FAFAFA",
    borderWidth: 1.5,
    borderColor: Colors.BORDER,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  listItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  listItemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.TEXT,
  },
  listItemSub: {
    fontSize: 13,
    color: Colors.TEXT_SECONDARY,
    marginTop: 2,
  },
  breadcrumb: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  breadcrumbLink: {
    fontSize: 13,
    color: Colors.PRIMARY,
    fontWeight: "600",
  },
  breadcrumbCurrent: {
    fontSize: 13,
    color: Colors.TEXT_SECONDARY,
  },
  slotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  slotBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.BORDER,
    backgroundColor: "#FAFAFA",
  },
  slotBtnActive: {
    borderColor: Colors.PRIMARY,
    backgroundColor: "#E8F5EE",
  },
  slotText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.TEXT,
  },
  slotTextActive: {
    color: Colors.PRIMARY,
  },
  recapBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#E8F5EE",
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  recapTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.TEXT,
  },
  recapPrice: {
    fontSize: 13,
    color: Colors.PRIMARY,
    fontWeight: "600",
    marginTop: 2,
  },
  venueResetBtn: {
    alignItems: "center",
    paddingVertical: 10,
    marginTop: 8,
  },
  venueResetText: {
    fontSize: 13,
    color: Colors.ERROR,
    fontWeight: "600",
  },
});

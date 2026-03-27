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
import { FONT_SIZES, CARD_RADIUS, BUTTON_RADIUS, SECTION_SPACING } from "../../constants/theme";
import { matchesService, CreateMatchData } from "../../services/matches";
import { venuesService } from "../../services/venues";
import { bookingsService } from "../../services/bookings";
import type { Sport, MatchType, PlayMode, VenueListItem, Venue, Court, TimeSlot } from "../../types";

// ── Sport card config ──
const SPORT_CARDS: { value: Sport; label: string; icon: keyof typeof Ionicons.glyphMap; bg: string }[] = [
  { value: "tennis", label: "Tennis", icon: "tennisball", bg: Colors.BLUE },
  { value: "padel", label: "Padel", icon: "tennisball-outline", bg: Colors.ORANGE },
];

export function CreateMatchScreen() {
  const navigation = useNavigation<any>();

  // ── Form state ──
  const [sport, setSport] = useState<Sport | null>(null);
  const [matchType, setMatchType] = useState<MatchType | null>(null);
  const [playMode, setPlayMode] = useState<PlayMode | null>(null);

  const isPadel = sport === "padel";

  const handleSportChange = (s: Sport) => {
    setSport(s);
    if (s === "padel") setMatchType("doubles");
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

  // ── Validation ──
  const validate = (): string | null => {
    if (!sport) return "Choisis un sport";
    if (!matchType) return "Choisis le type de match";
    if (!playMode) return "Choisis le mode de jeu";

    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    if (!day || !month || !year || isNaN(d) || isNaN(m) || isNaN(y)) return "Date invalide";
    if (d < 1 || d > 31 || m < 1 || m > 12 || y < 2025 || y > new Date().getFullYear() + 1) return "Date invalide";
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

  // ── Submit ──
  const handleCreate = async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

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

      if (selectedSlot && selectedCourt && selectedVenue) {
        try {
          await bookingsService.holdSlot(selectedCourt.id, selectedSlot.id);
          const booking = await bookingsService.createBooking(selectedSlot.id, match.id);
          const perPlayer = parseFloat(booking.per_player_amount);
          Toast.show({ type: "success", text1: "Match créé !", text2: "Procède au paiement." });
          navigation.navigate("Home", {
            screen: "Payment",
            params: {
              bookingId: booking.id, matchId: match.id,
              courtName: selectedCourt.name, venueName: selectedVenue.name,
              date: matchDate,
              time: `${selectedSlot.start_time.slice(0, 5)} – ${selectedSlot.end_time.slice(0, 5)}`,
              pricePerPlayer: perPlayer,
            },
          });
          return;
        } catch {
          Toast.show({ type: "info", text1: "Match créé", text2: "La réservation du terrain a échoué, tu peux réessayer plus tard." });
          navigation.navigate("Home", { screen: "MatchDetail", params: { matchId: match.id } });
          return;
        }
      }

      Toast.show({ type: "success", text1: "Match créé !", text2: "Ton match a bien été créé." });
      navigation.navigate("Home", { screen: "MatchDetail", params: { matchId: match.id } });
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

  const isFormComplete = sport && matchType && playMode && day && month && year && hour && minute;

  // ── Formatted date/time display ──
  const formattedDate =
    day && month && year
      ? `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`
      : null;
  const formattedTime =
    hour && minute ? `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}` : null;

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
        {/* ═══════════════════════════════════════════
            1. SPORT SELECTION — Large colored cards
           ═══════════════════════════════════════════ */}
        <Text style={styles.sectionTitle}>Sport</Text>
        <View style={styles.sportRow}>
          {SPORT_CARDS.map((s) => {
            const active = sport === s.value;
            return (
              <TouchableOpacity
                key={s.value}
                style={[
                  styles.sportCard,
                  { backgroundColor: s.bg },
                  active && styles.sportCardActive,
                  active && { transform: [{ scale: 1.05 }] },
                ]}
                onPress={() => handleSportChange(s.value)}
                activeOpacity={0.85}
              >
                <View style={styles.sportIconCircle}>
                  <Ionicons name={s.icon} size={28} color={s.bg} />
                </View>
                <Text style={styles.sportLabel}>{s.label}</Text>
                {active && (
                  <View style={styles.sportCheck}>
                    <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ═══════════════════════════════════════════
            2. TYPE SELECTION — Pills (hidden singles for padel)
           ═══════════════════════════════════════════ */}
        {sport && (
          <>
            <Text style={styles.sectionTitle}>Type de match</Text>
            <View style={styles.pillRow}>
              {(!isPadel ? ["singles", "doubles"] : ["doubles"]).map((t) => {
                const active = matchType === t;
                const label = t === "singles" ? "Simple" : "Double";
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.pill, active && styles.pillActiveBlue]}
                    onPress={() => setMatchType(t as MatchType)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pillText, active && styles.pillTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {isPadel && (
              <Text style={styles.padelHint}>
                Le padel se joue toujours à 4 joueurs (double)
              </Text>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════
            3. MODE SELECTION — Amical (green) / Compétition (orange)
           ═══════════════════════════════════════════ */}
        {sport && matchType && (
          <>
            <Text style={styles.sectionTitle}>Mode de jeu</Text>
            <View style={styles.pillRow}>
              <TouchableOpacity
                style={[styles.pill, playMode === "friendly" && styles.pillActiveGreen]}
                onPress={() => setPlayMode("friendly")}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.pillText,
                    playMode === "friendly" && styles.pillTextActive,
                  ]}
                >
                  Amical
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pill, playMode === "competitive" && styles.pillActiveOrange]}
                onPress={() => setPlayMode("competitive")}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.pillText,
                    playMode === "competitive" && styles.pillTextActive,
                  ]}
                >
                  Compétition
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ═══════════════════════════════════════════
            4. DATE / TIME
           ═══════════════════════════════════════════ */}
        {sport && matchType && playMode && (
          <>
            <Text style={styles.sectionTitle}>Date & Heure</Text>

            <View style={styles.dateTimeContainer}>
              {/* Date row */}
              <View style={styles.dateTimeRow}>
                <View style={styles.dateTimeIcon}>
                  <Ionicons name="calendar-outline" size={20} color={Colors.BLUE} />
                </View>
                <View style={styles.dateInputsRow}>
                  <TextInput
                    style={styles.dateInput}
                    value={day}
                    onChangeText={(t) => setDay(t.replace(/[^0-9]/g, "").slice(0, 2))}
                    keyboardType="number-pad"
                    placeholder="JJ"
                    placeholderTextColor={Colors.TEXT_SECONDARY}
                    maxLength={2}
                  />
                  <Text style={styles.dateSep}>/</Text>
                  <TextInput
                    style={styles.dateInput}
                    value={month}
                    onChangeText={(t) => setMonth(t.replace(/[^0-9]/g, "").slice(0, 2))}
                    keyboardType="number-pad"
                    placeholder="MM"
                    placeholderTextColor={Colors.TEXT_SECONDARY}
                    maxLength={2}
                  />
                  <Text style={styles.dateSep}>/</Text>
                  <TextInput
                    style={[styles.dateInput, styles.yearInput]}
                    value={year}
                    onChangeText={(t) => setYear(t.replace(/[^0-9]/g, "").slice(0, 4))}
                    keyboardType="number-pad"
                    placeholder="AAAA"
                    placeholderTextColor={Colors.TEXT_SECONDARY}
                    maxLength={4}
                  />
                </View>
              </View>

              {/* Time row */}
              <View style={styles.dateTimeRow}>
                <View style={styles.dateTimeIcon}>
                  <Ionicons name="time-outline" size={20} color={Colors.BLUE} />
                </View>
                <View style={styles.dateInputsRow}>
                  <TextInput
                    style={styles.dateInput}
                    value={hour}
                    onChangeText={(t) => setHour(t.replace(/[^0-9]/g, "").slice(0, 2))}
                    keyboardType="number-pad"
                    placeholder="HH"
                    placeholderTextColor={Colors.TEXT_SECONDARY}
                    maxLength={2}
                  />
                  <Text style={styles.dateSep}>:</Text>
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
            </View>

            {/* Formatted preview */}
            {(formattedDate || formattedTime) && (
              <View style={styles.previewRow}>
                {formattedDate && (
                  <View style={styles.previewChip}>
                    <Ionicons name="calendar" size={14} color={Colors.BLUE} />
                    <Text style={styles.previewText}>{formattedDate}</Text>
                  </View>
                )}
                {formattedTime && (
                  <View style={styles.previewChip}>
                    <Ionicons name="time" size={14} color={Colors.BLUE} />
                    <Text style={styles.previewText}>{formattedTime}</Text>
                  </View>
                )}
              </View>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════
            5. VENUE (optional) — kept as-is
           ═══════════════════════════════════════════ */}
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
                  <Ionicons name="location-outline" size={20} color={Colors.BLUE} />
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
                            <Ionicons name="business-outline" size={20} color={Colors.BLUE} />
                            <View>
                              <Text style={styles.listItemTitle}>{v.name}</Text>
                              <Text style={styles.listItemSub}>
                                {v.city} · {v.court_count} terrain{v.court_count > 1 ? "s" : ""}
                              </Text>
                            </View>
                          </View>
                          <Ionicons name="chevron-forward" size={18} color={Colors.TEXT_SECONDARY} />
                        </TouchableOpacity>
                      ))
                    )}
                  </>
                )}

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
                            <Ionicons name="tennisball-outline" size={20} color={Colors.BLUE} />
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
                      <ActivityIndicator color={Colors.BLUE} style={{ marginVertical: 16 }} />
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

        {/* ── Error ── */}
        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={Colors.ERROR} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* ═══════════════════════════════════════════
            5. SUBMIT BUTTON — Blue, full width, rounded 24
           ═══════════════════════════════════════════ */}
        <TouchableOpacity
          style={[styles.createBtn, (!isFormComplete || loading) && styles.createBtnDisabled]}
          onPress={handleCreate}
          disabled={loading || !isFormComplete}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.createBtnText}>Créer le match</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════════════════════════ */

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.BACKGROUND },
  content: { padding: SECTION_SPACING, paddingBottom: 48 },

  // ── Section title ──
  sectionTitle: {
    fontSize: FONT_SIZES.h3,
    fontWeight: "700",
    color: Colors.TEXT,
    marginTop: SECTION_SPACING,
    marginBottom: 12,
  },

  // ════════════════════════════════════
  // 1. Sport cards
  // ════════════════════════════════════
  sportRow: { flexDirection: "row", gap: 14 },
  sportCard: {
    flex: 1,
    height: 130,
    borderRadius: CARD_RADIUS,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "transparent",
  },
  sportCardActive: {
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  sportIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  sportLabel: {
    fontSize: FONT_SIZES.h2,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  sportCheck: {
    position: "absolute",
    top: 10,
    right: 10,
  },

  // ════════════════════════════════════
  // 2 & 3. Pills
  // ════════════════════════════════════
  pillRow: { flexDirection: "row", gap: 12 },
  pill: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: Colors.CARD_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  pillActiveBlue: { backgroundColor: Colors.BLUE },
  pillActiveGreen: { backgroundColor: Colors.SUCCESS },
  pillActiveOrange: { backgroundColor: Colors.ORANGE },
  pillText: {
    fontSize: FONT_SIZES.body,
    fontWeight: "600",
    color: Colors.TEXT,
  },
  pillTextActive: { color: "#FFFFFF", fontWeight: "700" },
  padelHint: {
    fontSize: FONT_SIZES.caption,
    color: Colors.BLUE,
    fontStyle: "italic",
    marginTop: 8,
  },

  // ════════════════════════════════════
  // 4. Date / Time
  // ════════════════════════════════════
  dateTimeContainer: { gap: 12 },
  dateTimeRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  dateTimeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.CARD_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  dateInputsRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  dateInput: {
    flex: 1,
    backgroundColor: Colors.CARD_BG,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: FONT_SIZES.h3,
    fontWeight: "600",
    textAlign: "center",
    color: Colors.TEXT,
  },
  yearInput: { flex: 1.5 },
  dateSep: {
    fontSize: FONT_SIZES.h2,
    fontWeight: "600",
    color: Colors.TEXT_SECONDARY,
  },
  previewRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  previewChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  previewText: {
    fontSize: FONT_SIZES.body,
    fontWeight: "600",
    color: Colors.BLUE,
  },

  // ════════════════════════════════════
  // Error
  // ════════════════════════════════════
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 14,
    marginTop: 20,
  },
  errorText: { flex: 1, fontSize: FONT_SIZES.body, color: Colors.ERROR, fontWeight: "500" },

  // ════════════════════════════════════
  // Submit button
  // ════════════════════════════════════
  createBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.BLUE,
    borderRadius: BUTTON_RADIUS,
    paddingVertical: 18,
    marginTop: 32,
  },
  createBtnDisabled: { opacity: 0.45 },
  createBtnText: { fontSize: 17, fontWeight: "700", color: "#FFFFFF" },

  // ════════════════════════════════════
  // Venue step (kept clean)
  // ════════════════════════════════════
  venueChoiceRow: { gap: 10 },
  venueChoiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: CARD_RADIUS,
    borderWidth: 2,
    borderColor: Colors.BLUE,
    backgroundColor: "#EFF6FF",
  },
  venueChoiceBtnText: { fontSize: FONT_SIZES.body, fontWeight: "600", color: Colors.BLUE },
  venueSkipBtn: { alignItems: "center", paddingVertical: 12 },
  venueSkipBtnText: { fontSize: FONT_SIZES.body, color: Colors.TEXT_SECONDARY, textDecorationLine: "underline" },
  venueSkipped: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.CARD_BG,
    borderRadius: 12,
    padding: 14,
  },
  venueSkippedText: { flex: 1, fontSize: FONT_SIZES.body, color: Colors.TEXT_SECONDARY },
  venueChangeLink: { fontSize: FONT_SIZES.body, fontWeight: "600", color: Colors.BLUE },
  subLabel: { fontSize: FONT_SIZES.caption, fontWeight: "600", color: Colors.TEXT_SECONDARY, marginBottom: 8, marginTop: 4 },
  emptyText: { fontSize: FONT_SIZES.body, color: Colors.TEXT_SECONDARY, fontStyle: "italic", textAlign: "center", paddingVertical: 16 },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.CARD_BG,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  listItemLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  listItemTitle: { fontSize: FONT_SIZES.body, fontWeight: "600", color: Colors.TEXT },
  listItemSub: { fontSize: FONT_SIZES.caption, color: Colors.TEXT_SECONDARY, marginTop: 2 },
  breadcrumb: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  breadcrumbLink: { fontSize: FONT_SIZES.caption, color: Colors.BLUE, fontWeight: "600" },
  breadcrumbCurrent: { fontSize: FONT_SIZES.caption, color: Colors.TEXT_SECONDARY },
  slotsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slotBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: Colors.CARD_BG,
  },
  slotBtnActive: { backgroundColor: Colors.BLUE },
  slotText: { fontSize: FONT_SIZES.body, fontWeight: "600", color: Colors.TEXT },
  slotTextActive: { color: "#FFFFFF" },
  recapBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  recapTitle: { fontSize: FONT_SIZES.body, fontWeight: "700", color: Colors.TEXT },
  recapPrice: { fontSize: FONT_SIZES.caption, color: Colors.BLUE, fontWeight: "600", marginTop: 2 },
  venueResetBtn: { alignItems: "center", paddingVertical: 10, marginTop: 8 },
  venueResetText: { fontSize: FONT_SIZES.caption, color: Colors.ERROR, fontWeight: "600" },
});

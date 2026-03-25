import React, { useState } from "react";
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
import {
  openMatchesService,
  CreateOpenMatchData,
} from "../../services/openMatches";
import type { Sport, MatchType, PlayMode, SkillLevel } from "../../types";

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

const LEVELS: OptionItem<SkillLevel | "none">[] = [
  { value: "none", label: "Aucun" },
  { value: "beginner", label: "Débutant" },
  { value: "intermediate", label: "Inter." },
  { value: "advanced", label: "Avancé" },
];

export function CreateOpenMatchScreen() {
  const navigation = useNavigation<any>();

  const [sport, setSport] = useState<Sport | null>(null);
  const [matchType, setMatchType] = useState<MatchType | null>(null);
  const [playMode, setPlayMode] = useState<PlayMode | null>(null);
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const [levelMin, setLevelMin] = useState<SkillLevel | "none">("none");
  const [levelMax, setLevelMax] = useState<SkillLevel | "none">("none");
  const [description, setDescription] = useState("");
  const [expDay, setExpDay] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (): string | null => {
    if (!sport) return "Choisis un sport";
    if (!matchType) return "Choisis le type de match";
    if (!playMode) return "Choisis le mode de jeu";

    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    if (!day || !month || !year || isNaN(d) || isNaN(m) || isNaN(y))
      return "Date invalide";
    if (d < 1 || d > 31 || m < 1 || m > 12 || y < 2025 || y > new Date().getFullYear() + 1) return "Date invalide";
    const date = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return "La date ne peut pas être dans le passé";

    const h = parseInt(hour, 10);
    const min = parseInt(minute, 10);
    if (!hour || isNaN(h) || h < 0 || h > 23) return "Heure invalide";
    if (!minute || isNaN(min) || min < 0 || min > 59) return "Minutes invalides";

    if (expDay || expMonth || expYear) {
      const ed = parseInt(expDay, 10);
      const em = parseInt(expMonth, 10);
      const ey = parseInt(expYear, 10);
      if (isNaN(ed) || isNaN(em) || isNaN(ey)) return "Date d'expiration invalide";
      if (ed < 1 || ed > 31 || em < 1 || em > 12 || ey < 2025 || ey > new Date().getFullYear() + 1)
        return "Date d'expiration invalide";
      const expDate = new Date(ey, em - 1, ed);
      if (expDate >= date) return "L'expiration doit être avant la date du match";
      if (expDate < today) return "L'expiration ne peut pas être dans le passé";
    }

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

    const scheduledDate = `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    const scheduledTime = `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}:00`;

    const data: CreateOpenMatchData = {
      sport: sport!,
      match_type: matchType!,
      play_mode: playMode!,
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime,
      max_participants: matchType === "doubles" ? 4 : 2,
    };

    if (levelMin !== "none") data.required_level_min = levelMin;
    if (levelMax !== "none") data.required_level_max = levelMax;
    if (description.trim()) data.description = description.trim();

    if (expDay && expMonth && expYear) {
      data.expires_at = `${expYear.padStart(4, "0")}-${expMonth.padStart(2, "0")}-${expDay.padStart(2, "0")}T00:00:00Z`;
    }

    try {
      await openMatchesService.createOpenMatch(data);
      Toast.show({ type: "success", text1: "Session publiée !", text2: "Ta session ouverte est visible." });
      navigation.goBack();
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Erreur lors de la publication";
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
                style={[styles.pickerLabel, active && styles.pickerLabelActive]}
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
        {/* ── Sport ── */}
        <Text style={styles.sectionTitle}>Sport</Text>
        {renderPicker(SPORTS, sport, setSport)}

        {/* ── Type ── */}
        <Text style={styles.sectionTitle}>Type de match</Text>
        {renderPicker(TYPES, matchType, setMatchType)}

        {/* ── Mode ── */}
        <Text style={styles.sectionTitle}>Mode de jeu</Text>
        {renderPicker(MODES, playMode, setPlayMode)}

        {/* ── Date ── */}
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
              onChangeText={(t) =>
                setMonth(t.replace(/[^0-9]/g, "").slice(0, 2))
              }
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
              onChangeText={(t) =>
                setYear(t.replace(/[^0-9]/g, "").slice(0, 4))
              }
              keyboardType="number-pad"
              placeholder="AAAA"
              placeholderTextColor={Colors.TEXT_SECONDARY}
              maxLength={4}
            />
          </View>
        </View>

        {/* ── Heure ── */}
        <Text style={styles.sectionTitle}>Heure</Text>
        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <Text style={styles.dateLabel}>Heures</Text>
            <TextInput
              style={styles.dateInput}
              value={hour}
              onChangeText={(t) =>
                setHour(t.replace(/[^0-9]/g, "").slice(0, 2))
              }
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
              onChangeText={(t) =>
                setMinute(t.replace(/[^0-9]/g, "").slice(0, 2))
              }
              keyboardType="number-pad"
              placeholder="MM"
              placeholderTextColor={Colors.TEXT_SECONDARY}
              maxLength={2}
            />
          </View>
        </View>

        {/* ── Niveau minimum ── */}
        <Text style={styles.sectionTitle}>Niveau minimum (optionnel)</Text>
        {renderPicker(LEVELS, levelMin, setLevelMin)}

        {/* ── Niveau maximum ── */}
        <Text style={styles.sectionTitle}>Niveau maximum (optionnel)</Text>
        {renderPicker(LEVELS, levelMax, setLevelMax)}

        {/* ── Description ── */}
        <Text style={styles.sectionTitle}>Description (optionnel)</Text>
        <TextInput
          style={styles.textArea}
          value={description}
          onChangeText={setDescription}
          placeholder="Ex: match détendu entre amis"
          placeholderTextColor={Colors.TEXT_SECONDARY}
          multiline
          numberOfLines={3}
          maxLength={250}
          textAlignVertical="top"
        />

        {/* ── Date d'expiration ── */}
        <Text style={styles.sectionTitle}>Expiration (optionnel)</Text>
        <Text style={styles.hint}>
          Par défaut : 24h avant le match
        </Text>
        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <Text style={styles.dateLabel}>Jour</Text>
            <TextInput
              style={styles.dateInput}
              value={expDay}
              onChangeText={(t) =>
                setExpDay(t.replace(/[^0-9]/g, "").slice(0, 2))
              }
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
              value={expMonth}
              onChangeText={(t) =>
                setExpMonth(t.replace(/[^0-9]/g, "").slice(0, 2))
              }
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
              value={expYear}
              onChangeText={(t) =>
                setExpYear(t.replace(/[^0-9]/g, "").slice(0, 4))
              }
              keyboardType="number-pad"
              placeholder="AAAA"
              placeholderTextColor={Colors.TEXT_SECONDARY}
              maxLength={4}
            />
          </View>
        </View>

        {/* ── Error ── */}
        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={Colors.ERROR} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* ── Submit ── */}
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
              <Ionicons name="megaphone-outline" size={22} color="#FFFFFF" />
              <Text style={styles.createBtnText}>Publier la session</Text>
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

  // ── Section ──
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.TEXT,
    marginTop: 20,
    marginBottom: 10,
  },

  // ── Picker buttons ──
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

  // ── TextArea ──
  textArea: {
    borderWidth: 1.5,
    borderColor: Colors.BORDER,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    fontSize: 15,
    color: Colors.TEXT,
    backgroundColor: "#FAFAFA",
    minHeight: 80,
  },

  // ── Hint ──
  hint: {
    fontSize: 12,
    color: Colors.TEXT_SECONDARY,
    marginBottom: 8,
    fontStyle: "italic",
  },

  // ── Error ──
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
});

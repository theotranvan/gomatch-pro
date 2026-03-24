import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../hooks/useAuth";
import { Colors } from "../../constants/colors";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";
import type { SkillLevel, PlayMode } from "../../types";

const CITIES = ["Genève", "Lausanne", "Montreux", "Nyon", "Vevey", "Morges", "Autre"];

type SportSelection = "tennis" | "padel" | "both" | null;

export function EditProfileScreen() {
  const { profile, updateProfile } = useAuth();
  const navigation = useNavigation();

  // ── Pre-fill from current profile ──
  const [firstName, setFirstName] = useState(profile?.first_name ?? "");
  const [lastName, setLastName] = useState(profile?.last_name ?? "");

  const initDOB = profile?.date_of_birth ?? "";
  const [birthDay, setBirthDay] = useState(initDOB ? initDOB.split("-")[2] : "");
  const [birthMonth, setBirthMonth] = useState(initDOB ? initDOB.split("-")[1] : "");
  const [birthYear, setBirthYear] = useState(initDOB ? initDOB.split("-")[0] : "");

  const [city, setCity] = useState(profile?.city ?? "");

  const deriveSportSelection = (): SportSelection => {
    if (profile?.level_tennis && profile?.level_padel) return "both";
    if (profile?.level_tennis) return "tennis";
    if (profile?.level_padel) return "padel";
    return null;
  };
  const [sportSelection, setSportSelection] = useState<SportSelection>(deriveSportSelection());
  const [levelTennis, setLevelTennis] = useState<SkillLevel | null>(profile?.level_tennis ?? null);
  const [levelPadel, setLevelPadel] = useState<SkillLevel | null>(profile?.level_padel ?? null);
  const [playMode, setPlayMode] = useState<PlayMode | null>(profile?.preferred_play_mode ?? null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function validate(): boolean {
    setError("");
    if (!firstName.trim()) { setError("Le prénom est requis."); return false; }
    if (!lastName.trim()) { setError("Le nom est requis."); return false; }
    if (!city) { setError("Veuillez choisir une ville."); return false; }
    if (birthDay || birthMonth || birthYear) {
      const d = parseInt(birthDay, 10);
      const m = parseInt(birthMonth, 10);
      const y = parseInt(birthYear, 10);
      if (!d || !m || !y || d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > 2015) {
        setError("Date de naissance invalide.");
        return false;
      }
    }
    if (!sportSelection) { setError("Choisissez au moins un sport."); return false; }
    const needsTennis = sportSelection === "tennis" || sportSelection === "both";
    const needsPadel = sportSelection === "padel" || sportSelection === "both";
    if (needsTennis && !levelTennis) { setError("Indiquez votre niveau en tennis."); return false; }
    if (needsPadel && !levelPadel) { setError("Indiquez votre niveau en padel."); return false; }
    if (!playMode) { setError("Choisissez un mode de jeu."); return false; }
    return true;
  }

  async function handleSave() {
    if (!validate()) return;

    setLoading(true);
    setError("");
    try {
      let dateOfBirth: string | null = null;
      if (birthYear && birthMonth && birthDay) {
        const y = birthYear.padStart(4, "0");
        const m = birthMonth.padStart(2, "0");
        const d = birthDay.padStart(2, "0");
        dateOfBirth = `${y}-${m}-${d}`;
      }

      await updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        city,
        date_of_birth: dateOfBirth,
        level_tennis: sportSelection === "tennis" || sportSelection === "both" ? levelTennis : null,
        level_padel: sportSelection === "padel" || sportSelection === "both" ? levelPadel : null,
        preferred_play_mode: playMode,
      });

      navigation.goBack();
    } catch {
      setError("Impossible de sauvegarder le profil.");
    } finally {
      setLoading(false);
    }
  }

  // ── Render helpers ──

  function renderChip(
    label: string,
    selected: boolean,
    onPress: () => void,
    emoji?: string,
  ) {
    return (
      <TouchableOpacity
        key={label}
        style={[styles.chip, selected && styles.chipSelected]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {emoji ? <Text style={styles.chipEmoji}>{emoji}</Text> : null}
        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  }

  function renderLevelChips(
    current: SkillLevel | null,
    onSelect: (v: SkillLevel) => void,
    sport: string,
  ) {
    const levels: { value: SkillLevel; label: string; emoji: string }[] = [
      { value: "beginner", label: "Débutant", emoji: "🌱" },
      { value: "intermediate", label: "Intermédiaire", emoji: "⭐" },
      { value: "advanced", label: "Avancé", emoji: "🏆" },
    ];
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Niveau en {sport}</Text>
        <View style={styles.chipRow}>
          {levels.map((l) =>
            renderChip(l.label, current === l.value, () => onSelect(l.value), l.emoji),
          )}
        </View>
      </View>
    );
  }

  const needsTennis = sportSelection === "tennis" || sportSelection === "both";
  const needsPadel = sportSelection === "padel" || sportSelection === "both";

  const playModes: { value: PlayMode; label: string; emoji: string; desc: string }[] = [
    { value: "friendly", label: "Amical", emoji: "😊", desc: "Pour le plaisir" },
    { value: "competitive", label: "Compétition", emoji: "🔥", desc: "Pour gagner" },
    { value: "both", label: "Les deux", emoji: "💪", desc: "Selon l'humeur" },
  ];

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
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* ── Nom / Prénom ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Identité</Text>
          <Input
            label="Prénom"
            placeholder="Théo"
            value={firstName}
            onChangeText={(v) => { setFirstName(v); setError(""); }}
          />
          <Input
            label="Nom"
            placeholder="Dupont"
            value={lastName}
            onChangeText={(v) => { setLastName(v); setError(""); }}
          />
        </View>

        {/* ── Date de naissance ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date de naissance</Text>
          <View style={styles.dateRow}>
            <Input
              placeholder="JJ"
              value={birthDay}
              onChangeText={(v) => { setBirthDay(v.replace(/\D/g, "").slice(0, 2)); setError(""); }}
              keyboardType="numeric"
              style={styles.dateInput}
            />
            <Input
              placeholder="MM"
              value={birthMonth}
              onChangeText={(v) => { setBirthMonth(v.replace(/\D/g, "").slice(0, 2)); setError(""); }}
              keyboardType="numeric"
              style={styles.dateInput}
            />
            <Input
              placeholder="AAAA"
              value={birthYear}
              onChangeText={(v) => { setBirthYear(v.replace(/\D/g, "").slice(0, 4)); setError(""); }}
              keyboardType="numeric"
              style={styles.dateInputLarge}
            />
          </View>
        </View>

        {/* ── Ville ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ville</Text>
          <View style={styles.chipRow}>
            {CITIES.map((c) =>
              renderChip(c, city === c, () => { setCity(c); setError(""); }),
            )}
          </View>
        </View>

        {/* ── Sport ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sport(s)</Text>
          <View style={styles.chipRow}>
            {renderChip("Tennis", sportSelection === "tennis", () => { setSportSelection("tennis"); setError(""); }, "🎾")}
            {renderChip("Padel", sportSelection === "padel", () => { setSportSelection("padel"); setError(""); }, "🏓")}
            {renderChip("Les deux", sportSelection === "both", () => { setSportSelection("both"); setError(""); }, "🎾🏓")}
          </View>
        </View>

        {/* ── Niveaux ── */}
        {needsTennis && renderLevelChips(levelTennis, (v) => { setLevelTennis(v); setError(""); }, "tennis")}
        {needsPadel && renderLevelChips(levelPadel, (v) => { setLevelPadel(v); setError(""); }, "padel")}

        {/* ── Mode de jeu ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mode de jeu</Text>
          <View style={styles.modeList}>
            {playModes.map((m) => (
              <TouchableOpacity
                key={m.value}
                style={[styles.modeCard, playMode === m.value && styles.modeCardSelected]}
                onPress={() => { setPlayMode(m.value); setError(""); }}
                activeOpacity={0.7}
              >
                <Text style={styles.modeEmoji}>{m.emoji}</Text>
                <View style={styles.modeInfo}>
                  <Text style={[styles.modeLabel, playMode === m.value && styles.modeLabelSelected]}>
                    {m.label}
                  </Text>
                  <Text style={styles.modeDesc}>{m.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Save ── */}
        <Button
          title="Enregistrer"
          onPress={handleSave}
          loading={loading}
          style={styles.saveButton}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  // ── Error ──
  errorBox: {
    backgroundColor: Colors.ERROR + "15",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  errorText: {
    color: Colors.ERROR,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  // ── Sections ──
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.TEXT,
    marginBottom: 10,
  },
  // ── Date row ──
  dateRow: {
    flexDirection: "row",
    gap: 10,
  },
  dateInput: {
    flex: 1,
    marginBottom: 0,
  },
  dateInputLarge: {
    flex: 1.5,
    marginBottom: 0,
  },
  // ── Chips ──
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.BACKGROUND,
    borderWidth: 1.5,
    borderColor: Colors.BORDER,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chipSelected: {
    backgroundColor: Colors.PRIMARY + "15",
    borderColor: Colors.PRIMARY,
  },
  chipEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.TEXT_SECONDARY,
  },
  chipTextSelected: {
    color: Colors.PRIMARY,
  },
  // ── Mode cards ──
  modeList: {
    gap: 10,
  },
  modeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.BACKGROUND,
    borderWidth: 1.5,
    borderColor: Colors.BORDER,
    borderRadius: 14,
    padding: 16,
  },
  modeCardSelected: {
    backgroundColor: Colors.PRIMARY + "15",
    borderColor: Colors.PRIMARY,
  },
  modeEmoji: {
    fontSize: 24,
    marginRight: 14,
  },
  modeInfo: {
    flex: 1,
  },
  modeLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.TEXT,
  },
  modeLabelSelected: {
    color: Colors.PRIMARY,
  },
  modeDesc: {
    fontSize: 13,
    color: Colors.TEXT_SECONDARY,
    marginTop: 2,
  },
  // ── Save ──
  saveButton: {
    marginTop: 8,
  },
});

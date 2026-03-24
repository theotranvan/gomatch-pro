import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useAuth } from "../../hooks/useAuth";
import { Colors } from "../../constants/colors";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";
import type { SkillLevel, PlayMode } from "../../types";

const TOTAL_STEPS = 5;

const CITIES = ["Genève", "Lausanne", "Montreux", "Nyon", "Vevey", "Morges", "Autre"];

type SportSelection = "tennis" | "padel" | "both";

export function OnboardingScreen() {
  const { updateProfile } = useAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Step 2
  const [birthDay, setBirthDay] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [city, setCity] = useState("");

  // Step 3
  const [sportSelection, setSportSelection] = useState<SportSelection | null>(null);

  // Step 4
  const [levelTennis, setLevelTennis] = useState<SkillLevel | null>(null);
  const [levelPadel, setLevelPadel] = useState<SkillLevel | null>(null);

  // Step 5
  const [playMode, setPlayMode] = useState<PlayMode | null>(null);

  function validateStep(): boolean {
    setError("");
    switch (step) {
      case 1:
        if (!firstName.trim()) { setError("Le prénom est requis."); return false; }
        if (!lastName.trim()) { setError("Le nom est requis."); return false; }
        return true;
      case 2:
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
        return true;
      case 3:
        if (!sportSelection) { setError("Choisissez au moins un sport."); return false; }
        return true;
      case 4: {
        const needsTennis = sportSelection === "tennis" || sportSelection === "both";
        const needsPadel = sportSelection === "padel" || sportSelection === "both";
        if (needsTennis && !levelTennis) { setError("Indiquez votre niveau en tennis."); return false; }
        if (needsPadel && !levelPadel) { setError("Indiquez votre niveau en padel."); return false; }
        return true;
      }
      case 5:
        if (!playMode) { setError("Choisissez un mode de jeu."); return false; }
        return true;
      default:
        return true;
    }
  }

  function handleNext() {
    if (!validateStep()) return;
    setStep((s) => s + 1);
  }

  function handleBack() {
    setError("");
    setStep((s) => s - 1);
  }

  async function handleFinish() {
    if (!validateStep()) return;

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
        city: city,
        date_of_birth: dateOfBirth,
        level_tennis: sportSelection === "tennis" || sportSelection === "both" ? levelTennis : null,
        level_padel: sportSelection === "padel" || sportSelection === "both" ? levelPadel : null,
        preferred_play_mode: playMode,
      });
    } catch {
      setError("Impossible de sauvegarder le profil.");
    } finally {
      setLoading(false);
    }
  }

  // ── Render helpers ──

  function renderProgressBar() {
    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${(step / TOTAL_STEPS) * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>Étape {step}/{TOTAL_STEPS}</Text>
      </View>
    );
  }

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

  // ── Steps ──

  function renderStep1() {
    return (
      <>
        <Text style={styles.stepTitle}>Comment tu t'appelles ?</Text>
        <Text style={styles.stepDesc}>
          Les autres joueurs verront ton prénom.
        </Text>
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
      </>
    );
  }

  function renderStep2() {
    return (
      <>
        <Text style={styles.stepTitle}>Tes infos</Text>
        <Text style={styles.stepDesc}>
          Date de naissance (optionnel) et ville.
        </Text>
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
        <Text style={styles.sectionTitle}>Ville</Text>
        <View style={styles.chipRow}>
          {CITIES.map((c) =>
            renderChip(c, city === c, () => { setCity(c); setError(""); }),
          )}
        </View>
      </>
    );
  }

  function renderStep3() {
    return (
      <>
        <Text style={styles.stepTitle}>Quel sport pratiques-tu ?</Text>
        <Text style={styles.stepDesc}>Tu pourras changer après.</Text>
        <View style={styles.sportGrid}>
          {renderChip("Tennis", sportSelection === "tennis", () => { setSportSelection("tennis"); setError(""); }, "🎾")}
          {renderChip("Padel", sportSelection === "padel", () => { setSportSelection("padel"); setError(""); }, "🏓")}
          {renderChip("Les deux", sportSelection === "both", () => { setSportSelection("both"); setError(""); }, "🎾🏓")}
        </View>
      </>
    );
  }

  function renderStep4() {
    const needsTennis = sportSelection === "tennis" || sportSelection === "both";
    const needsPadel = sportSelection === "padel" || sportSelection === "both";
    return (
      <>
        <Text style={styles.stepTitle}>Quel est ton niveau ?</Text>
        <Text style={styles.stepDesc}>
          Sois honnête, c'est pour trouver des matchs équilibrés.
        </Text>
        {needsTennis && renderLevelChips(levelTennis, (v) => { setLevelTennis(v); setError(""); }, "tennis")}
        {needsPadel && renderLevelChips(levelPadel, (v) => { setLevelPadel(v); setError(""); }, "padel")}
      </>
    );
  }

  function renderStep5() {
    const modes: { value: PlayMode; label: string; emoji: string; desc: string }[] = [
      { value: "friendly", label: "Amical", emoji: "😊", desc: "Pour le plaisir" },
      { value: "competitive", label: "Compétition", emoji: "🔥", desc: "Pour gagner" },
      { value: "both", label: "Les deux", emoji: "💪", desc: "Selon l'humeur" },
    ];
    return (
      <>
        <Text style={styles.stepTitle}>Ton mode de jeu ?</Text>
        <Text style={styles.stepDesc}>
          Ça nous aide à te proposer les bons matchs.
        </Text>
        <View style={styles.modeList}>
          {modes.map((m) => (
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
      </>
    );
  }

  const stepRenderers = [renderStep1, renderStep2, renderStep3, renderStep4, renderStep5];

  return (
    <View style={styles.container}>
      {renderProgressBar()}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {stepRenderers[step - 1]()}

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        {step > 1 ? (
          <Button title="Retour" onPress={handleBack} variant="outline" style={styles.backButton} />
        ) : (
          <View style={styles.backButton} />
        )}
        {step < TOTAL_STEPS ? (
          <Button title="Suivant" onPress={handleNext} style={styles.nextButton} />
        ) : (
          <Button
            title="Terminer"
            onPress={handleFinish}
            loading={loading}
            style={styles.nextButton}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BACKGROUND,
  },
  progressContainer: {
    paddingHorizontal: 28,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 8,
    backgroundColor: Colors.BACKGROUND,
  },
  progressTrack: {
    height: 6,
    backgroundColor: Colors.BORDER,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.PRIMARY,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 13,
    color: Colors.TEXT_SECONDARY,
    marginTop: 8,
    textAlign: "right",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 20,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.TEXT,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  stepDesc: {
    fontSize: 15,
    color: Colors.TEXT_SECONDARY,
    marginBottom: 28,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.TEXT,
    marginBottom: 12,
    marginTop: 4,
  },
  // Date inputs
  dateRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  dateInput: {
    flex: 1,
    marginBottom: 0,
  },
  dateInputLarge: {
    flex: 1.5,
    marginBottom: 0,
  },
  // Chips
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: Colors.BORDER,
    backgroundColor: "#FAFAFA",
  },
  chipSelected: {
    borderColor: Colors.PRIMARY,
    backgroundColor: "#EBF5F0",
  },
  chipEmoji: {
    fontSize: 18,
    marginRight: 6,
  },
  chipText: {
    fontSize: 15,
    fontWeight: "500",
    color: Colors.TEXT,
  },
  chipTextSelected: {
    color: Colors.PRIMARY,
    fontWeight: "700",
  },
  // Sports
  sportGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  // Sections
  section: {
    marginBottom: 20,
  },
  // Play mode cards
  modeList: {
    gap: 12,
  },
  modeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.BORDER,
    backgroundColor: "#FAFAFA",
  },
  modeCardSelected: {
    borderColor: Colors.PRIMARY,
    backgroundColor: "#EBF5F0",
  },
  modeEmoji: {
    fontSize: 28,
    marginRight: 14,
  },
  modeInfo: {
    flex: 1,
  },
  modeLabel: {
    fontSize: 16,
    fontWeight: "600",
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
  // Error
  errorBox: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 16,
  },
  errorText: {
    color: Colors.ERROR,
    fontSize: 14,
    textAlign: "center",
  },
  // Footer
  footer: {
    flexDirection: "row",
    paddingHorizontal: 28,
    paddingVertical: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
    borderTopWidth: 1,
    borderTopColor: Colors.BORDER,
    backgroundColor: Colors.BACKGROUND,
  },
  backButton: {
    flex: 1,
    marginRight: 8,
  },
  nextButton: {
    flex: 2,
    marginLeft: 8,
  },
});

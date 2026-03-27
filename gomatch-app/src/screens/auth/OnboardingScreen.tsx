import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../hooks/useAuth";
import { Colors } from "../../constants/colors";
import { CARD_RADIUS, CARD_SHADOW, FONT_SIZES, BUTTON_RADIUS } from "../../constants/theme";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";
import api from "../../services/api";
import type { SkillLevel, PlayMode } from "../../types";

const TOTAL_STEPS = 7;
const CITIES = ["Genève", "Lausanne", "Montreux", "Nyon", "Vevey", "Morges", "Autre"];
type SportSelection = "tennis" | "padel" | "both";

export function OnboardingScreen() {
  const { updateProfile, uploadAvatar } = useAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1 — Username
  const [username, setUsername] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Step 2
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Step 3
  const [birthDay, setBirthDay] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [city, setCity] = useState("");

  // Step 4
  const [sportSelection, setSportSelection] = useState<SportSelection | null>(null);

  // Step 5
  const [levelTennis, setLevelTennis] = useState<SkillLevel | null>(null);
  const [levelPadel, setLevelPadel] = useState<SkillLevel | null>(null);

  // Step 6
  const [playMode, setPlayMode] = useState<PlayMode | null>(null);

  // Step 7 — Avatar
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  // ── Username availability check ──
  useEffect(() => {
    if (usernameTimer.current) clearTimeout(usernameTimer.current);
    const trimmed = username.trim();
    if (trimmed.length < 3) {
      setUsernameAvailable(null);
      setCheckingUsername(false);
      return;
    }
    setCheckingUsername(true);
    usernameTimer.current = setTimeout(async () => {
      try {
        const { data } = await api.get<{ available: boolean }>(
          `/auth/check-username/?username=${encodeURIComponent(trimmed)}`,
        );
        setUsernameAvailable(data.available);
      } catch {
        setUsernameAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    }, 500);
    return () => {
      if (usernameTimer.current) clearTimeout(usernameTimer.current);
    };
  }, [username]);

  // ── Validation ──
  function validateStep(): boolean {
    setError("");
    switch (step) {
      case 1: {
        const trimmed = username.trim();
        if (!trimmed) { setError("Le pseudo est requis."); return false; }
        if (trimmed.length < 3) { setError("Le pseudo doit faire au moins 3 caractères."); return false; }
        if (!/^[a-zA-Z0-9_]{3,30}$/.test(trimmed)) { setError("Uniquement lettres, chiffres et underscores."); return false; }
        if (usernameAvailable === false) { setError("Ce pseudo est déjà pris."); return false; }
        return true;
      }
      case 2:
        if (!firstName.trim()) { setError("Le prénom est requis."); return false; }
        if (!lastName.trim()) { setError("Le nom est requis."); return false; }
        return true;
      case 3:
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
      case 4:
        if (!sportSelection) { setError("Choisissez au moins un sport."); return false; }
        return true;
      case 5: {
        const needsTennis = sportSelection === "tennis" || sportSelection === "both";
        const needsPadel = sportSelection === "padel" || sportSelection === "both";
        if (needsTennis && !levelTennis) { setError("Indiquez votre niveau en tennis."); return false; }
        if (needsPadel && !levelPadel) { setError("Indiquez votre niveau en padel."); return false; }
        return true;
      }
      case 6:
        if (!playMode) { setError("Choisissez un mode de jeu."); return false; }
        return true;
      case 7:
        if (!avatarUri) { setError("Ajoute une photo de profil."); return false; }
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
      if (avatarUri) await uploadAvatar(avatarUri);

      let dateOfBirth: string | null = null;
      if (birthYear && birthMonth && birthDay) {
        const y = birthYear.padStart(4, "0");
        const m = birthMonth.padStart(2, "0");
        const d = birthDay.padStart(2, "0");
        dateOfBirth = `${y}-${m}-${d}`;
      }

      await updateProfile({
        username: username.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        city,
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

  // ── Image picker ──
  async function pickImage(useCamera: boolean) {
    setError("");
    if (useCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission requise", "Autorise l'accès à la caméra dans les réglages.");
        return;
      }
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission requise", "Autorise l'accès à la galerie dans les réglages.");
        return;
      }
    }
    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── Render helpers ──
  // ═══════════════════════════════════════════════════════════════════════════

  function renderProgressBar() {
    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <View
            style={[styles.progressFill, { width: `${(step / TOTAL_STEPS) * 100}%` }]}
          />
        </View>
        <Text style={styles.progressLabel}>Étape {step}/{TOTAL_STEPS}</Text>
      </View>
    );
  }

  // ── Sport card ──
  function renderSportCard(
    label: string,
    icon: string,
    color: string,
    selected: boolean,
    onPress: () => void,
  ) {
    return (
      <TouchableOpacity
        key={label}
        style={[styles.sportCard, selected && { borderColor: color, borderWidth: 2 }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={[styles.sportIconCircle, { backgroundColor: color + "20" }]}>
          <Text style={{ fontSize: 28 }}>{icon}</Text>
        </View>
        <Text style={[styles.sportLabel, selected && { color, fontWeight: "700" }]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  }

  // ── Level card ──
  function renderLevelCard(
    value: SkillLevel,
    label: string,
    stars: number,
    current: SkillLevel | null,
    onSelect: (v: SkillLevel) => void,
  ) {
    const selected = current === value;
    return (
      <TouchableOpacity
        key={value}
        style={[styles.levelCard, selected && styles.levelCardSelected]}
        onPress={() => onSelect(value)}
        activeOpacity={0.7}
      >
        <Text style={styles.levelStars}>
          {"★".repeat(stars)}{"☆".repeat(3 - stars)}
        </Text>
        <Text style={[styles.levelLabel, selected && styles.levelLabelSelected]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  }

  // ── City chip ──
  function renderCityChip(c: string) {
    const selected = city === c;
    return (
      <TouchableOpacity
        key={c}
        style={[styles.cityChip, selected && styles.cityChipSelected]}
        onPress={() => { setCity(c); setError(""); }}
        activeOpacity={0.7}
      >
        <Text style={[styles.cityChipText, selected && styles.cityChipTextSelected]}>
          {c}
        </Text>
      </TouchableOpacity>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ── Steps ──
  // ═══════════════════════════════════════════════════════════════════════════

  function renderStep1() {
    return (
      <>
        <Text style={styles.stepTitle}>Choisis ton pseudo</Text>
        <Text style={styles.stepDesc}>
          C'est ton identité sur GoMatch. Il sera visible par tous.
        </Text>
        <Input
          placeholder="theo_42"
          value={username}
          onChangeText={(v) => { setUsername(v.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 30)); setError(""); }}
          autoCapitalize="none"
        />
        <View style={styles.usernameStatus}>
          {checkingUsername && <ActivityIndicator size="small" color={Colors.TEXT_SECONDARY} />}
          {!checkingUsername && usernameAvailable === true && (
            <Text style={styles.usernameOk}>✅ Disponible</Text>
          )}
          {!checkingUsername && usernameAvailable === false && (
            <Text style={styles.usernameKo}>❌ Déjà pris</Text>
          )}
        </View>
      </>
    );
  }

  function renderStep2() {
    return (
      <>
        <Text style={styles.stepTitle}>Comment tu t'appelles ?</Text>
        <Text style={styles.stepDesc}>Les autres joueurs verront ton prénom.</Text>
        <Input
          placeholder="Prénom"
          value={firstName}
          onChangeText={(v) => { setFirstName(v); setError(""); }}
        />
        <Input
          placeholder="Nom"
          value={lastName}
          onChangeText={(v) => { setLastName(v); setError(""); }}
        />
      </>
    );
  }

  function renderStep3() {
    return (
      <>
        <Text style={styles.stepTitle}>Tes infos</Text>
        <Text style={styles.stepDesc}>Date de naissance (optionnel) et ville.</Text>

        <Text style={styles.sectionLabel}>Date de naissance</Text>
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
            style={styles.dateInputLg}
          />
        </View>

        <Text style={styles.sectionLabel}>Ville</Text>
        <View style={styles.chipWrap}>{CITIES.map(renderCityChip)}</View>
      </>
    );
  }

  function renderStep4() {
    return (
      <>
        <Text style={styles.stepTitle}>Quel sport pratiques-tu ?</Text>
        <Text style={styles.stepDesc}>Tu pourras changer après.</Text>
        <View style={styles.sportRow}>
          {renderSportCard("Tennis", "🎾", Colors.BLUE, sportSelection === "tennis", () => { setSportSelection("tennis"); setError(""); })}
          {renderSportCard("Padel", "🏓", Colors.ORANGE, sportSelection === "padel", () => { setSportSelection("padel"); setError(""); })}
        </View>
        <TouchableOpacity
          style={[styles.bothBtn, sportSelection === "both" && styles.bothBtnSelected]}
          onPress={() => { setSportSelection("both"); setError(""); }}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 18 }}>🎾🏓</Text>
          <Text style={[styles.bothBtnText, sportSelection === "both" && styles.bothBtnTextSelected]}>
            Les deux
          </Text>
        </TouchableOpacity>
      </>
    );
  }

  function renderStep5() {
    const needsTennis = sportSelection === "tennis" || sportSelection === "both";
    const needsPadel = sportSelection === "padel" || sportSelection === "both";
    return (
      <>
        <Text style={styles.stepTitle}>Quel est ton niveau ?</Text>
        <Text style={styles.stepDesc}>Sois honnête, c'est pour trouver des matchs équilibrés.</Text>

        {needsTennis && (
          <>
            <Text style={styles.sectionLabel}>Tennis 🎾</Text>
            <View style={styles.levelRow}>
              {renderLevelCard("beginner", "Débutant", 1, levelTennis, (v) => { setLevelTennis(v); setError(""); })}
              {renderLevelCard("intermediate", "Intermédiaire", 2, levelTennis, (v) => { setLevelTennis(v); setError(""); })}
              {renderLevelCard("advanced", "Avancé", 3, levelTennis, (v) => { setLevelTennis(v); setError(""); })}
            </View>
          </>
        )}

        {needsPadel && (
          <>
            <Text style={styles.sectionLabel}>Padel 🏓</Text>
            <View style={styles.levelRow}>
              {renderLevelCard("beginner", "Débutant", 1, levelPadel, (v) => { setLevelPadel(v); setError(""); })}
              {renderLevelCard("intermediate", "Intermédiaire", 2, levelPadel, (v) => { setLevelPadel(v); setError(""); })}
              {renderLevelCard("advanced", "Avancé", 3, levelPadel, (v) => { setLevelPadel(v); setError(""); })}
            </View>
          </>
        )}
      </>
    );
  }

  function renderStep6() {
    const modes: { value: PlayMode; label: string; emoji: string; desc: string }[] = [
      { value: "friendly", label: "Amical", emoji: "😊", desc: "Pour le plaisir" },
      { value: "competitive", label: "Compétition", emoji: "🔥", desc: "Pour gagner" },
      { value: "both", label: "Les deux", emoji: "💪", desc: "Selon l'humeur" },
    ];
    return (
      <>
        <Text style={styles.stepTitle}>Ton mode de jeu ?</Text>
        <Text style={styles.stepDesc}>Ça nous aide à te proposer les bons matchs.</Text>
        <View style={{ gap: 12 }}>
          {modes.map((m) => (
            <TouchableOpacity
              key={m.value}
              style={[styles.modeCard, playMode === m.value && styles.modeCardSelected]}
              onPress={() => { setPlayMode(m.value); setError(""); }}
              activeOpacity={0.7}
            >
              <Text style={styles.modeEmoji}>{m.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.modeLabel,
                    playMode === m.value && styles.modeLabelSelected,
                  ]}
                >
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

  function renderStep7() {
    return (
      <>
        <Text style={styles.stepTitle}>Ajoute ta photo</Text>
        <Text style={styles.stepDesc}>
          Les autres joueurs pourront te reconnaître plus facilement.
        </Text>
        <View style={styles.avatarCenter}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarPreview} />
          ) : (
            <View style={styles.avatarEmpty}>
              <Ionicons name="person" size={48} color={Colors.TEXT_SECONDARY} />
            </View>
          )}
          <View style={styles.avatarBtns}>
            <TouchableOpacity
              style={styles.avatarPickBtn}
              onPress={() => pickImage(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="images-outline" size={20} color={Colors.NAVY} />
              <Text style={styles.avatarPickBtnText}>Galerie</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.avatarPickBtn}
              onPress={() => pickImage(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="camera-outline" size={20} color={Colors.NAVY} />
              <Text style={styles.avatarPickBtnText}>Caméra</Text>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  }

  const stepRenderers = [
    renderStep1, renderStep2, renderStep3, renderStep4,
    renderStep5, renderStep6, renderStep7,
  ];

  // ═══════════════════════════════════════════════════════════════════════════
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

      {/* Footer */}
      <View style={styles.footer}>
        {step > 1 ? (
          <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
            <Text style={styles.backBtnText}>Retour</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}
        {step < TOTAL_STEPS ? (
          <Button title="Suivant" onPress={handleNext} style={styles.nextBtn} />
        ) : (
          <Button
            title="Terminer"
            onPress={handleFinish}
            loading={loading}
            style={styles.nextBtn}
          />
        )}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.BACKGROUND },

  // ── Progress bar ──
  progressContainer: {
    paddingHorizontal: 28,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 8,
  },
  progressTrack: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.BLUE,
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: FONT_SIZES.caption,
    color: Colors.TEXT_SECONDARY,
    marginTop: 8,
    textAlign: "right",
  },

  // ── Scroll ──
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 20,
  },

  // ── Step typography ──
  stepTitle: {
    fontSize: FONT_SIZES.h1,
    fontWeight: "700",
    color: Colors.NAVY,
    marginBottom: 8,
  },
  stepDesc: {
    fontSize: FONT_SIZES.body,
    color: Colors.TEXT_SECONDARY,
    marginBottom: 28,
    lineHeight: 20,
  },
  sectionLabel: {
    fontSize: FONT_SIZES.body,
    fontWeight: "600",
    color: Colors.NAVY,
    marginBottom: 12,
    marginTop: 4,
  },

  // ── Date inputs ──
  dateRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  dateInput: { flex: 1, marginBottom: 0 },
  dateInputLg: { flex: 1.5, marginBottom: 0 },

  // ── City chips ──
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  cityChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: BUTTON_RADIUS,
    backgroundColor: "#F3F4F6",
  },
  cityChipSelected: { backgroundColor: Colors.BLUE },
  cityChipText: { fontSize: FONT_SIZES.body, fontWeight: "500", color: Colors.TEXT },
  cityChipTextSelected: { color: "#FFFFFF", fontWeight: "700" },

  // ── Sport cards (step 4) ──
  sportRow: { flexDirection: "row", gap: 14, marginBottom: 16 },
  sportCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 24,
    borderRadius: CARD_RADIUS,
    backgroundColor: "#F3F4F6",
    borderWidth: 2,
    borderColor: "transparent",
  },
  sportIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  sportLabel: { fontSize: FONT_SIZES.h3, fontWeight: "600", color: Colors.TEXT },
  bothBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: CARD_RADIUS,
    backgroundColor: "#F3F4F6",
    borderWidth: 2,
    borderColor: "transparent",
  },
  bothBtnSelected: { borderColor: Colors.GREEN, backgroundColor: Colors.GREEN + "15" },
  bothBtnText: { fontSize: FONT_SIZES.body, fontWeight: "600", color: Colors.TEXT },
  bothBtnTextSelected: { color: Colors.GREEN, fontWeight: "700" },

  // ── Level cards (step 5) ──
  levelRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  levelCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 18,
    borderRadius: CARD_RADIUS,
    backgroundColor: "#F3F4F6",
    borderWidth: 2,
    borderColor: "transparent",
  },
  levelCardSelected: { borderColor: Colors.BLUE, backgroundColor: Colors.BLUE + "10" },
  levelStars: { fontSize: 18, color: Colors.ORANGE, marginBottom: 6 },
  levelLabel: { fontSize: FONT_SIZES.caption, fontWeight: "600", color: Colors.TEXT },
  levelLabelSelected: { color: Colors.BLUE, fontWeight: "700" },

  // ── Play mode cards (step 6) ──
  modeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: CARD_RADIUS,
    backgroundColor: "#F3F4F6",
    borderWidth: 2,
    borderColor: "transparent",
  },
  modeCardSelected: { borderColor: Colors.BLUE, backgroundColor: Colors.BLUE + "10" },
  modeEmoji: { fontSize: 28, marginRight: 14 },
  modeLabel: { fontSize: FONT_SIZES.h3, fontWeight: "600", color: Colors.TEXT },
  modeLabelSelected: { color: Colors.BLUE },
  modeDesc: { fontSize: FONT_SIZES.caption, color: Colors.TEXT_SECONDARY, marginTop: 2 },

  // ── Avatar (step 7) ──
  avatarCenter: { alignItems: "center", marginTop: 8 },
  avatarPreview: { width: 140, height: 140, borderRadius: 70, marginBottom: 20 },
  avatarEmpty: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  avatarBtns: { flexDirection: "row", gap: 16 },
  avatarPickBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: BUTTON_RADIUS,
    gap: 8,
  },
  avatarPickBtnText: { fontSize: FONT_SIZES.body, fontWeight: "600", color: Colors.NAVY },

  // ── Username status ──
  usernameStatus: { minHeight: 24, marginTop: 4, marginBottom: 8 },
  usernameOk: { color: Colors.SUCCESS, fontSize: FONT_SIZES.body, fontWeight: "600" },
  usernameKo: { color: Colors.ERROR, fontSize: FONT_SIZES.body, fontWeight: "600" },

  // ── Error ──
  errorBox: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 16,
  },
  errorText: { color: Colors.ERROR, fontSize: FONT_SIZES.body, textAlign: "center" },

  // ── Footer ──
  footer: {
    flexDirection: "row",
    paddingHorizontal: 28,
    paddingVertical: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
    borderTopWidth: 1,
    borderTopColor: Colors.BORDER,
    backgroundColor: Colors.BACKGROUND,
  },
  backBtn: {
    flex: 1,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BUTTON_RADIUS,
    borderWidth: 1.5,
    borderColor: Colors.BORDER,
    minHeight: 52,
  },
  backBtnText: {
    fontSize: FONT_SIZES.h3,
    fontWeight: "600",
    color: Colors.TEXT_SECONDARY,
  },
  nextBtn: { flex: 2, marginLeft: 8 },
});

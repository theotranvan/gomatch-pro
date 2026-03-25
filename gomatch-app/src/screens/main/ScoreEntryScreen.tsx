import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Colors } from "../../constants/colors";
import { scoringService } from "../../services/scoring";
import type { HomeStackParamList } from "../../navigation/HomeStack";
import type { SetScore } from "../../types";

type Props = NativeStackScreenProps<HomeStackParamList, "SubmitScore">;

const MAX_SETS = 5;
const DEFAULT_SETS = 2;

export function ScoreEntryScreen({ route, navigation }: Props) {
  const { matchId, teamANames, teamBNames } = route.params;

  const [sets, setSets] = useState<SetScore[]>(
    Array.from({ length: DEFAULT_SETS }, () => ({ team_a: 0, team_b: 0 })),
  );
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // ── Set manipulation ──

  const updateScore = (
    setIndex: number,
    team: "team_a" | "team_b",
    delta: number,
  ) => {
    setSets((prev) =>
      prev.map((s, i) => {
        if (i !== setIndex) return s;
        const newVal = Math.max(0, s[team] + delta);
        return { ...s, [team]: newVal };
      }),
    );
  };

  const addSet = () => {
    if (sets.length < MAX_SETS) {
      setSets((prev) => [...prev, { team_a: 0, team_b: 0 }]);
    }
  };

  const removeSet = () => {
    if (sets.length > 1) {
      setSets((prev) => prev.slice(0, -1));
    }
  };

  // ── Summary ──

  const setsWonA = sets.filter((s) => s.team_a > s.team_b).length;
  const setsWonB = sets.filter((s) => s.team_b > s.team_a).length;
  const hasTiedSets = sets.some((s) => s.team_a === s.team_b && (s.team_a > 0 || s.team_b > 0));
  const allZeros = sets.every((s) => s.team_a === 0 && s.team_b === 0);

  const summaryText = allZeros
    ? "Entrez les scores de chaque set"
    : hasTiedSets
      ? "Un ou plusieurs sets sont à égalité"
      : setsWonA > setsWonB
        ? `Équipe A gagne ${setsWonA} set${setsWonA > 1 ? "s" : ""} à ${setsWonB}`
        : setsWonB > setsWonA
          ? `Équipe B gagne ${setsWonB} set${setsWonB > 1 ? "s" : ""} à ${setsWonA}`
          : `Égalité ${setsWonA}-${setsWonB}`;

  // ── Submit ──

  const canSubmit = !allZeros && !hasTiedSets;

  const handleSubmit = () => {
    Alert.alert(
      "Confirmer le score ?",
      summaryText,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Envoyer",
          onPress: async () => {
            setSending(true);
            try {
              await scoringService.submitScore(matchId, sets);
              setSubmitted(true);
            } catch (err: any) {
              const detail =
                err?.response?.data?.detail || "Impossible d'envoyer le score.";
              Toast.show({ type: "error", text1: "Erreur", text2: detail });
            } finally {
              setSending(false);
            }
          },
        },
      ],
    );
  };

  // ── Submitted state ──

  if (submitted) {
    return (
      <View style={styles.centeredContainer}>
        <View style={styles.successCard}>
          <Ionicons name="checkmark-circle" size={64} color={Colors.SUCCESS} />
          <Text style={styles.successTitle}>Score envoyé !</Text>
          <Text style={styles.successSub}>
            En attente de confirmation de votre adversaire
          </Text>

          <View style={styles.summaryBox}>
            {sets.map((s, i) => (
              <View key={i} style={styles.summarySetRow}>
                <Text style={styles.summarySetLabel}>Set {i + 1}</Text>
                <Text
                  style={[
                    styles.summarySetScore,
                    s.team_a > s.team_b && styles.summaryWin,
                  ]}
                >
                  {s.team_a}
                </Text>
                <Text style={styles.summaryDash}>-</Text>
                <Text
                  style={[
                    styles.summarySetScore,
                    s.team_b > s.team_a && styles.summaryWin,
                  ]}
                >
                  {s.team_b}
                </Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.backBtnText}>Retour au match</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Main form ──

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Teams header */}
        <View style={styles.teamsHeader}>
          <View style={styles.teamCol}>
            <View style={[styles.teamBadge, { backgroundColor: Colors.PRIMARY + "18" }]}>
              <Text style={[styles.teamBadgeText, { color: Colors.PRIMARY }]}>A</Text>
            </View>
            <Text style={styles.teamName} numberOfLines={2}>
              {teamANames || "Équipe A"}
            </Text>
          </View>
          <Text style={styles.vsText}>VS</Text>
          <View style={styles.teamCol}>
            <View style={[styles.teamBadge, { backgroundColor: Colors.ERROR + "18" }]}>
              <Text style={[styles.teamBadgeText, { color: Colors.ERROR }]}>B</Text>
            </View>
            <Text style={styles.teamName} numberOfLines={2}>
              {teamBNames || "Équipe B"}
            </Text>
          </View>
        </View>

        {/* Sets */}
        {sets.map((set, idx) => (
          <View key={idx} style={styles.setCard}>
            <Text style={styles.setLabel}>Set {idx + 1}</Text>
            <View style={styles.setInputRow}>
              {/* Team A score */}
              <View style={styles.scoreControl}>
                <TouchableOpacity
                  style={styles.minusBtn}
                  onPress={() => updateScore(idx, "team_a", -1)}
                  activeOpacity={0.6}
                >
                  <Ionicons name="remove" size={20} color={Colors.TEXT} />
                </TouchableOpacity>
                <View style={styles.scoreDisplay}>
                  <Text style={styles.scoreValue}>{set.team_a}</Text>
                </View>
                <TouchableOpacity
                  style={styles.plusBtn}
                  onPress={() => updateScore(idx, "team_a", 1)}
                  activeOpacity={0.6}
                >
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <Text style={styles.scoreDash}>—</Text>

              {/* Team B score */}
              <View style={styles.scoreControl}>
                <TouchableOpacity
                  style={styles.minusBtn}
                  onPress={() => updateScore(idx, "team_b", -1)}
                  activeOpacity={0.6}
                >
                  <Ionicons name="remove" size={20} color={Colors.TEXT} />
                </TouchableOpacity>
                <View style={styles.scoreDisplay}>
                  <Text style={styles.scoreValue}>{set.team_b}</Text>
                </View>
                <TouchableOpacity
                  style={styles.plusBtn}
                  onPress={() => updateScore(idx, "team_b", 1)}
                  activeOpacity={0.6}
                >
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}

        {/* Add / Remove set buttons */}
        <View style={styles.setActions}>
          {sets.length > 1 && (
            <TouchableOpacity
              style={styles.setActionBtn}
              onPress={removeSet}
              activeOpacity={0.7}
            >
              <Ionicons name="remove-circle-outline" size={20} color={Colors.ERROR} />
              <Text style={[styles.setActionText, { color: Colors.ERROR }]}>
                Retirer un set
              </Text>
            </TouchableOpacity>
          )}
          {sets.length < MAX_SETS && (
            <TouchableOpacity
              style={styles.setActionBtn}
              onPress={addSet}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle-outline" size={20} color={Colors.PRIMARY} />
              <Text style={[styles.setActionText, { color: Colors.PRIMARY }]}>
                Ajouter un set
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <Ionicons
            name={allZeros ? "information-circle-outline" : "trophy-outline"}
            size={22}
            color={allZeros ? Colors.TEXT_SECONDARY : Colors.PRIMARY}
          />
          <Text
            style={[
              styles.summaryText,
              !allZeros && !hasTiedSets && styles.summaryTextBold,
            ]}
          >
            {summaryText}
          </Text>
        </View>

        {/* Submit button */}
        <TouchableOpacity
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit || sending}
          activeOpacity={0.8}
        >
          {sending ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="send" size={20} color="#FFFFFF" />
              <Text style={styles.submitBtnText}>Envoyer le score</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  content: {
    padding: 20,
  },
  centeredContainer: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  // ── Teams header ──
  teamsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.BACKGROUND,
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  teamCol: {
    flex: 1,
    alignItems: "center",
  },
  teamBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  teamBadgeText: {
    fontSize: 18,
    fontWeight: "800",
  },
  teamName: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.TEXT,
    textAlign: "center",
  },
  vsText: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.TEXT_SECONDARY,
    marginHorizontal: 16,
  },

  // ── Set card ──
  setCard: {
    backgroundColor: Colors.BACKGROUND,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  setLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.TEXT_SECONDARY,
    textAlign: "center",
    marginBottom: 12,
  },
  setInputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Score control ──
  scoreControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  minusBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  plusBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreDisplay: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.BORDER,
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.TEXT,
  },
  scoreDash: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.TEXT_SECONDARY,
    marginHorizontal: 16,
  },

  // ── Set actions ──
  setActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    marginVertical: 8,
  },
  setActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
  },
  setActionText: {
    fontSize: 14,
    fontWeight: "600",
  },

  // ── Summary ──
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.BACKGROUND,
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  summaryText: {
    fontSize: 15,
    color: Colors.TEXT_SECONDARY,
    flex: 1,
  },
  summaryTextBold: {
    color: Colors.TEXT,
    fontWeight: "600",
  },

  // ── Submit ──
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.PRIMARY,
    borderRadius: 14,
    paddingVertical: 16,
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: {
    backgroundColor: "#B0B0B0",
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // ── Success state ──
  successCard: {
    backgroundColor: Colors.BACKGROUND,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.TEXT,
    marginTop: 16,
    marginBottom: 8,
  },
  successSub: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
    textAlign: "center",
    marginBottom: 24,
  },
  summaryBox: {
    width: "100%",
    backgroundColor: "#F5F5F5",
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  summarySetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  summarySetLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.TEXT_SECONDARY,
    width: 60,
  },
  summarySetScore: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.TEXT,
    width: 40,
    textAlign: "center",
  },
  summaryWin: {
    color: Colors.PRIMARY,
  },
  summaryDash: {
    fontSize: 18,
    color: Colors.TEXT_SECONDARY,
    marginHorizontal: 8,
  },
  backBtn: {
    backgroundColor: Colors.PRIMARY,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  backBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

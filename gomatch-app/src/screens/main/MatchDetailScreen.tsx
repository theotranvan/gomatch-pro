import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";
import { useAuth } from "../../hooks/useAuth";
import { matchesService } from "../../services/matches";
import { scoringService } from "../../services/scoring";
import { formatDate, formatTime, getInitials } from "../../utils/helpers";
import type { HomeStackParamList } from "../../navigation/HomeStack";
import type {
  Match,
  MatchParticipant,
  MatchStatus,
  Score,
  ScoreStatus,
  SetScore,
} from "../../types";

const STATUS_CONFIG: Record<MatchStatus, { label: string; color: string }> = {
  draft: { label: "Brouillon", color: Colors.TEXT_SECONDARY },
  open: { label: "Ouvert", color: "#2563EB" },
  confirmed: { label: "Confirmé", color: Colors.PRIMARY },
  in_progress: { label: "En cours", color: "#F59E0B" },
  completed: { label: "Terminé", color: Colors.SUCCESS },
  cancelled: { label: "Annulé", color: Colors.ERROR },
};

const PARTICIPANT_STATUS_LABELS: Record<string, string> = {
  accepted: "Accepté",
  pending: "En attente",
  declined: "Refusé",
  left: "Parti",
};

export function MatchDetailScreen() {
  const route = useRoute<RouteProp<HomeStackParamList, "MatchDetail">>();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { matchId } = route.params;

  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchMatch = useCallback(async () => {
    try {
      const data = await matchesService.getMatch(matchId);
      setMatch(data);
    } catch {
      Alert.alert("Erreur", "Impossible de charger le match.");
    }
  }, [matchId]);

  useEffect(() => {
    setLoading(true);
    fetchMatch().finally(() => setLoading(false));
  }, [fetchMatch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMatch();
    setRefreshing(false);
  }, [fetchMatch]);

  // ── Derived state ──

  const myProfileId = user?.profile?.id;
  const isParticipant = match?.participants.some(
    (p) => p.player === myProfileId && p.status === "accepted",
  );
  const isFull =
    match &&
    match.current_participants_count >= match.max_participants;
  const score = match?.score ?? null;
  const isCreator = match?.created_by === user?.id;

  // Can join if not already participant and match is not full and status allows it
  const canJoin =
    match &&
    !isParticipant &&
    !isFull &&
    (match.status === "open" || match.status === "confirmed");

  // Can submit score if participant and match is completed and no score yet
  const canSubmitScore =
    isParticipant &&
    match?.status === "completed" &&
    !score;

  // Can confirm/dispute if score is pending and I'm a participant but NOT the submitter
  const canConfirmScore =
    isParticipant &&
    score?.status === "pending" &&
    score?.submitted_by !== myProfileId;

  // ── Actions ──

  const handleJoin = async () => {
    if (!match) return;
    setActionLoading(true);
    try {
      await matchesService.joinMatch(match.id);
      await fetchMatch();
      Alert.alert("Rejoint !", "Tu as rejoint le match.");
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Impossible de rejoindre le match.";
      Alert.alert("Erreur", msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmScore = async () => {
    if (!score) return;
    setActionLoading(true);
    try {
      await scoringService.confirmScore(score.id);
      await fetchMatch();
      Alert.alert("Score confirmé !", "Le score a été validé.");
    } catch (err: any) {
      Alert.alert("Erreur", err?.response?.data?.detail || "Impossible de confirmer.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisputeScore = async () => {
    if (!score) return;
    Alert.alert("Contester le score ?", "Es-tu sûr de vouloir contester ce score ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Contester",
        style: "destructive",
        onPress: async () => {
          setActionLoading(true);
          try {
            await scoringService.disputeScore(score.id);
            await fetchMatch();
            Alert.alert("Contesté", "Le score a été contesté.");
          } catch (err: any) {
            Alert.alert("Erreur", err?.response?.data?.detail || "Impossible de contester.");
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  // ── Loading state ──

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.PRIMARY} />
      </View>
    );
  }

  if (!match) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.ERROR} />
        <Text style={styles.errorText}>Match introuvable</Text>
      </View>
    );
  }

  const statusCfg = STATUS_CONFIG[match.status];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.PRIMARY}
          colors={[Colors.PRIMARY]}
        />
      }
    >
      {/* ── Header card ── */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <Text style={styles.sportEmoji}>
            {match.sport === "tennis" ? "🎾" : "🏓"}
          </Text>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>
              {match.sport === "tennis" ? "Tennis" : "Padel"} ·{" "}
              {match.match_type === "singles" ? "Simple" : "Double"}
            </Text>
            <Text style={styles.headerMode}>
              {match.play_mode === "friendly" ? "Amical" : match.play_mode === "competitive" ? "Compétition" : "Mixte"}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.color + "18" }]}>
            <Text style={[styles.statusText, { color: statusCfg.color }]}>
              {statusCfg.label}
            </Text>
          </View>
        </View>

        <View style={styles.headerMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={16} color={Colors.TEXT_SECONDARY} />
            <Text style={styles.metaText}>{formatDate(match.scheduled_date)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={16} color={Colors.TEXT_SECONDARY} />
            <Text style={styles.metaText}>{formatTime(match.scheduled_time)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={16} color={Colors.TEXT_SECONDARY} />
            <Text style={styles.metaText}>
              {match.current_participants_count}/{match.max_participants}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Participants ── */}
      <Text style={styles.sectionTitle}>
        Participants ({match.current_participants_count}/{match.max_participants})
      </Text>
      <View style={styles.participantsCard}>
        {match.participants.map((p) => (
          <ParticipantRow key={p.id} participant={p} />
        ))}

        {/* Empty slots */}
        {Array.from({ length: match.max_participants - match.participants.length }).map(
          (_, idx) => (
            <View key={`empty-${idx}`} style={styles.participantRow}>
              <View style={[styles.avatar, styles.avatarEmpty]}>
                <Ionicons name="person-add-outline" size={18} color={Colors.BORDER} />
              </View>
              <Text style={styles.emptySlot}>Place disponible</Text>
            </View>
          ),
        )}
      </View>

      {/* ── Score section ── */}
      {score && <ScoreSection score={score} />}

      {/* ── Actions ── */}
      <View style={styles.actions}>
        {canJoin && (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleJoin}
            disabled={actionLoading}
            activeOpacity={0.8}
          >
            {actionLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="enter-outline" size={20} color="#FFF" />
                <Text style={styles.primaryBtnText}>Rejoindre ce match</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {canSubmitScore && (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate("SubmitScore", { matchId: match.id })}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={20} color="#FFF" />
            <Text style={styles.primaryBtnText}>Saisir le score</Text>
          </TouchableOpacity>
        )}

        {canConfirmScore && (
          <View style={styles.confirmRow}>
            <TouchableOpacity
              style={[styles.primaryBtn, { flex: 1 }]}
              onPress={handleConfirmScore}
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
              <Text style={styles.primaryBtnText}>Confirmer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dangerBtn, { flex: 1 }]}
              onPress={handleDisputeScore}
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle-outline" size={20} color="#FFF" />
              <Text style={styles.primaryBtnText}>Contester</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Chat button – always visible for participants */}
        {isParticipant && (
          <TouchableOpacity
            style={styles.outlineBtn}
            onPress={() =>
              navigation.navigate("Chat", { matchId: match.id })
            }
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-outline" size={20} color={Colors.PRIMARY} />
            <Text style={styles.outlineBtnText}>Ouvrir le chat</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ── Sub-components ──

function ParticipantRow({ participant }: { participant: MatchParticipant }) {
  const names = participant.player_name.split(" ");
  const initials = getInitials(names[0] || "", names[1] || "");

  return (
    <View style={styles.participantRow}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.participantInfo}>
        <Text style={styles.participantName} numberOfLines={1}>
          {participant.player_name}
        </Text>
        <Text style={styles.participantMeta}>
          {participant.role === "creator" ? "Créateur" : "Joueur"}
          {participant.team ? ` · Équipe ${participant.team === "team_a" ? "A" : "B"}` : ""}
        </Text>
      </View>
      <View
        style={[
          styles.participantStatusBadge,
          {
            backgroundColor:
              participant.status === "accepted"
                ? Colors.SUCCESS + "18"
                : participant.status === "pending"
                  ? "#F59E0B18"
                  : Colors.ERROR + "18",
          },
        ]}
      >
        <Text
          style={[
            styles.participantStatusText,
            {
              color:
                participant.status === "accepted"
                  ? Colors.SUCCESS
                  : participant.status === "pending"
                    ? "#F59E0B"
                    : Colors.ERROR,
            },
          ]}
        >
          {PARTICIPANT_STATUS_LABELS[participant.status] || participant.status}
        </Text>
      </View>
    </View>
  );
}

const SCORE_STATUS_LABELS: Record<ScoreStatus, { label: string; color: string }> = {
  pending: { label: "En attente de confirmation", color: "#F59E0B" },
  confirmed: { label: "Confirmé", color: Colors.SUCCESS },
  disputed: { label: "Contesté", color: Colors.ERROR },
};

function ScoreSection({ score }: { score: Score }) {
  const scoreCfg = SCORE_STATUS_LABELS[score.status];

  return (
    <>
      <Text style={styles.sectionTitle}>Score</Text>
      <View style={styles.scoreCard}>
        <View style={styles.scoreStatusRow}>
          <View style={[styles.scoreStatusBadge, { backgroundColor: scoreCfg.color + "18" }]}>
            <Text style={[styles.scoreStatusText, { color: scoreCfg.color }]}>
              {scoreCfg.label}
            </Text>
          </View>
        </View>

        {/* Sets */}
        <View style={styles.setsContainer}>
          <View style={styles.setsHeader}>
            <Text style={[styles.setHeaderText, { flex: 1 }]}>Set</Text>
            <Text style={styles.setHeaderText}>Équipe A</Text>
            <Text style={styles.setHeaderText}>Équipe B</Text>
          </View>
          {score.sets.map((s: SetScore, idx: number) => (
            <View
              key={idx}
              style={[styles.setRow, idx < score.sets.length - 1 && styles.setRowBorder]}
            >
              <Text style={[styles.setText, { flex: 1 }]}>Set {idx + 1}</Text>
              <Text
                style={[
                  styles.setScore,
                  s.team_a > s.team_b && styles.setScoreWin,
                ]}
              >
                {s.team_a}
              </Text>
              <Text
                style={[
                  styles.setScore,
                  s.team_b > s.team_a && styles.setScoreWin,
                ]}
              >
                {s.team_b}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </>
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
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.BACKGROUND,
  },
  errorText: {
    fontSize: 16,
    color: Colors.ERROR,
    marginTop: 12,
  },

  // ── Header card ──
  headerCard: {
    backgroundColor: Colors.BACKGROUND,
    borderRadius: 18,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  sportEmoji: {
    fontSize: 36,
    marginRight: 14,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.TEXT,
  },
  headerMode: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  headerMeta: {
    flexDirection: "row",
    marginTop: 16,
    gap: 20,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaText: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
    fontWeight: "500",
  },

  // ── Section ──
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.TEXT,
    marginTop: 24,
    marginBottom: 10,
  },

  // ── Participants ──
  participantsCard: {
    backgroundColor: Colors.BACKGROUND,
    borderRadius: 16,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.PRIMARY + "18",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarEmpty: {
    backgroundColor: Colors.BORDER + "40",
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.PRIMARY,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.TEXT,
  },
  participantMeta: {
    fontSize: 12,
    color: Colors.TEXT_SECONDARY,
    marginTop: 1,
  },
  participantStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  participantStatusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  emptySlot: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
    fontStyle: "italic",
  },

  // ── Score ──
  scoreCard: {
    backgroundColor: Colors.BACKGROUND,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  scoreStatusRow: {
    flexDirection: "row",
    marginBottom: 14,
  },
  scoreStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  scoreStatusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  setsContainer: {},
  setsHeader: {
    flexDirection: "row",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  setHeaderText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.TEXT_SECONDARY,
    width: 70,
    textAlign: "center",
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  setRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  setText: {
    fontSize: 14,
    color: Colors.TEXT,
    fontWeight: "500",
  },
  setScore: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.TEXT,
    width: 70,
    textAlign: "center",
  },
  setScoreWin: {
    color: Colors.PRIMARY,
  },

  // ── Actions ──
  actions: {
    marginTop: 24,
    gap: 12,
  },
  primaryBtn: {
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
  primaryBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.ERROR,
    borderRadius: 14,
    paddingVertical: 16,
  },
  confirmRow: {
    flexDirection: "row",
    gap: 12,
  },
  outlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 2,
    borderColor: Colors.PRIMARY,
    borderRadius: 14,
    paddingVertical: 16,
  },
  outlineBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.PRIMARY,
  },
});

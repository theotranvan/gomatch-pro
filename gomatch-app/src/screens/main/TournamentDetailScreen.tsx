import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  FlatList,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";
import { BracketView } from "../../components/BracketView";
import { LoadingScreen } from "../../components/LoadingScreen";
import { NetworkError } from "../../components/NetworkError";
import { ErrorState } from "../../components/ErrorState";
import { tournamentsService } from "../../services/tournaments";
import { isNetworkError } from "../../utils/network";
import { formatDate } from "../../utils/helpers";
import type {
  Tournament,
  TournamentParticipant,
  TournamentStatus,
  SkillLevel,
} from "../../types";
import type { TournamentsStackParamList } from "../../navigation/TournamentsStack";

type Nav = NativeStackNavigationProp<TournamentsStackParamList>;
type Route = RouteProp<TournamentsStackParamList, "TournamentDetail">;

type TabKey = "infos" | "bracket" | "participants";

const TABS: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "infos", label: "Infos", icon: "information-circle-outline" },
  { key: "bracket", label: "Bracket", icon: "git-network-outline" },
  { key: "participants", label: "Participants", icon: "people-outline" },
];

const STATUS_CONFIG: Record<TournamentStatus, { label: string; color: string }> = {
  registration: { label: "Inscriptions ouvertes", color: Colors.SUCCESS },
  in_progress: { label: "En cours", color: "#F59E0B" },
  completed: { label: "Terminé", color: Colors.TEXT_SECONDARY },
  cancelled: { label: "Annulé", color: Colors.ERROR },
};

const LEVEL_LABELS: Record<SkillLevel, string> = {
  beginner: "Débutant",
  intermediate: "Intermédiaire",
  advanced: "Avancé",
};

const FORMAT_LABELS: Record<string, string> = {
  single_elimination: "Élimination directe",
  round_robin: "Poules",
};

const PARTICIPANT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  registered: { label: "Inscrit", color: Colors.PRIMARY },
  checked_in: { label: "Check-in", color: "#2563EB" },
  eliminated: { label: "Éliminé", color: Colors.ERROR },
  winner: { label: "Vainqueur", color: Colors.SUCCESS },
};

export function TournamentDetailScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const [tab, setTab] = useState<TabKey>("infos");
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const fetch = useCallback(async () => {
    try {
      const data = await tournamentsService.getTournament(params.tournamentId);
      setTournament(data);
      setError(null);
    } catch (err) {
      setError(err);
    }
  }, [params.tournamentId]);

  useEffect(() => {
    setLoading(true);
    fetch().finally(() => setLoading(false));
  }, [fetch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetch();
    setRefreshing(false);
  }, [fetch]);

  if (loading) return <LoadingScreen message="Chargement du tournoi…" />;
  if (error && !tournament) {
    if (isNetworkError(error)) return <NetworkError onRetry={() => { setLoading(true); fetch().finally(() => setLoading(false)); }} />;
    return <ErrorState message="Impossible de charger le tournoi" onRetry={() => { setLoading(true); fetch().finally(() => setLoading(false)); }} />;
  }
  if (!tournament) return null;

  const statusCfg = STATUS_CONFIG[tournament.status];
  const spotsLeft = tournament.max_participants - tournament.current_participants_count;
  const canRegister = tournament.status === "registration" && spotsLeft > 0;

  return (
    <View style={s.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.PRIMARY}
            colors={[Colors.PRIMARY]}
          />
        }
      >
        {/* ── Header ── */}
        <View style={s.headerCard}>
          <View style={s.headerTop}>
            <Text style={s.sportEmoji}>
              {tournament.sport === "tennis" ? "🎾" : "🏓"}
            </Text>
            <View style={s.headerTitleWrap}>
              <Text style={s.headerTitle}>{tournament.name}</Text>
              <Text style={s.headerSubtitle}>
                {FORMAT_LABELS[tournament.format] || tournament.format} ·{" "}
                {tournament.match_type === "singles" ? "Simple" : "Double"}
              </Text>
            </View>
          </View>

          <View style={[s.statusBadgeLarge, { backgroundColor: statusCfg.color + "18" }]}>
            <Text style={[s.statusTextLarge, { color: statusCfg.color }]}>
              {statusCfg.label}
            </Text>
          </View>

          <View style={s.headerMeta}>
            <View style={s.metaItem}>
              <Ionicons name="calendar-outline" size={16} color={Colors.TEXT_SECONDARY} />
              <Text style={s.metaText}>{formatDate(tournament.start_date)}</Text>
            </View>
            <View style={s.metaItem}>
              <Ionicons name="people-outline" size={16} color={Colors.TEXT_SECONDARY} />
              <Text style={s.metaText}>
                {tournament.current_participants_count}/{tournament.max_participants}
              </Text>
            </View>
            {tournament.venue_name && (
              <View style={s.metaItem}>
                <Ionicons name="location-outline" size={16} color={Colors.TEXT_SECONDARY} />
                <Text style={s.metaText} numberOfLines={1}>{tournament.venue_name}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Tab bar ── */}
        <View style={s.tabBar}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[s.tabBtn, tab === t.key && s.tabBtnActive]}
              onPress={() => setTab(t.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={t.icon}
                size={16}
                color={tab === t.key ? Colors.PRIMARY : Colors.TEXT_SECONDARY}
              />
              <Text style={[s.tabLabel, tab === t.key && s.tabLabelActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Tab content ── */}
        <View style={s.tabContent}>
          {tab === "infos" && <InfosTab tournament={tournament} />}
          {tab === "bracket" && <BracketView rounds={tournament.rounds} />}
          {tab === "participants" && (
            <ParticipantsTab participants={tournament.participants} />
          )}
        </View>
      </ScrollView>

      {/* ── CTA ── */}
      {canRegister && (
        <View style={s.ctaWrap}>
          <TouchableOpacity
            style={s.ctaButton}
            activeOpacity={0.8}
            onPress={() =>
              navigation.navigate("TournamentRegistration", {
                tournamentId: tournament.id,
                sport: tournament.sport,
                matchType: tournament.match_type,
                tournamentName: tournament.name,
              })
            }
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
            <Text style={s.ctaText}>S'inscrire</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

/* ── Infos tab ── */
function InfosTab({ tournament }: { tournament: Tournament }) {
  return (
    <View style={s.infosContainer}>
      {tournament.description ? (
        <View style={s.infoSection}>
          <Text style={s.sectionTitle}>Description</Text>
          <Text style={s.sectionBody}>{tournament.description}</Text>
        </View>
      ) : null}

      <View style={s.infoSection}>
        <Text style={s.sectionTitle}>Détails</Text>
        <InfoRow
          icon="trophy-outline"
          label="Format"
          value={FORMAT_LABELS[tournament.format] || tournament.format}
        />
        <InfoRow
          icon="tennisball-outline"
          label="Sport"
          value={tournament.sport === "tennis" ? "Tennis" : "Padel"}
        />
        <InfoRow
          icon="people-outline"
          label="Type"
          value={tournament.match_type === "singles" ? "Simple" : "Double"}
        />
        {tournament.required_level_min && (
          <InfoRow
            icon="bar-chart-outline"
            label="Niveau minimum"
            value={LEVEL_LABELS[tournament.required_level_min]}
          />
        )}
        <InfoRow
          icon="cash-outline"
          label="Frais d'inscription"
          value={
            parseFloat(tournament.entry_fee) > 0
              ? `${tournament.entry_fee} CHF`
              : "Gratuit"
          }
        />
        <InfoRow
          icon="person-outline"
          label="Organisé par"
          value={tournament.created_by_name}
        />
      </View>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={s.infoRow}>
      <Ionicons name={icon} size={16} color={Colors.TEXT_SECONDARY} />
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

/* ── Participants tab ── */
function ParticipantsTab({
  participants,
}: {
  participants: TournamentParticipant[];
}) {
  const sorted = [...participants].sort((a, b) => {
    if (a.seed && b.seed) return a.seed - b.seed;
    if (a.seed) return -1;
    if (b.seed) return 1;
    return 0;
  });

  if (sorted.length === 0) {
    return (
      <View style={s.emptyParticipants}>
        <Ionicons name="people-outline" size={40} color={Colors.BORDER} />
        <Text style={s.emptyText}>Aucun participant inscrit.</Text>
      </View>
    );
  }

  return (
    <View>
      {sorted.map((p) => {
        const statusCfg = PARTICIPANT_STATUS_LABELS[p.status] || {
          label: p.status,
          color: Colors.TEXT_SECONDARY,
        };
        return (
          <View key={p.id} style={s.participantRow}>
            <View style={s.seedBadge}>
              <Text style={s.seedText}>{p.seed ?? "—"}</Text>
            </View>
            <View style={s.participantInfo}>
              <Text style={s.participantName}>{p.player_name}</Text>
              {p.partner_name && (
                <Text style={s.partnerName}>& {p.partner_name}</Text>
              )}
            </View>
            <View
              style={[s.pStatusBadge, { backgroundColor: statusCfg.color + "18" }]}
            >
              <Text style={[s.pStatusText, { color: statusCfg.color }]}>
                {statusCfg.label}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },

  /* Header */
  headerCard: {
    backgroundColor: Colors.BACKGROUND,
    padding: 16,
    paddingBottom: 14,
  },
  headerTop: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  sportEmoji: { fontSize: 36, marginRight: 12 },
  headerTitleWrap: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: Colors.TEXT },
  headerSubtitle: { fontSize: 13, color: Colors.TEXT_SECONDARY, marginTop: 2 },
  statusBadgeLarge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  statusTextLarge: { fontSize: 12, fontWeight: "700" },
  headerMeta: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  metaItem: { flexDirection: "row", alignItems: "center" },
  metaText: { fontSize: 13, color: Colors.TEXT_SECONDARY, marginLeft: 5 },

  /* Tabs */
  tabBar: {
    flexDirection: "row",
    backgroundColor: Colors.BACKGROUND,
    borderTopWidth: 1,
    borderTopColor: Colors.BORDER,
    paddingHorizontal: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 5,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabBtnActive: { borderBottomColor: Colors.PRIMARY },
  tabLabel: { fontSize: 13, fontWeight: "600", color: Colors.TEXT_SECONDARY },
  tabLabelActive: { color: Colors.PRIMARY },

  /* Tab content */
  tabContent: { minHeight: 200 },

  /* Infos */
  infosContainer: { padding: 16 },
  infoSection: {
    backgroundColor: Colors.BACKGROUND,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.TEXT,
    marginBottom: 10,
  },
  sectionBody: { fontSize: 14, color: Colors.TEXT_SECONDARY, lineHeight: 20 },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    gap: 8,
  },
  infoLabel: { fontSize: 13, color: Colors.TEXT_SECONDARY, width: 130 },
  infoValue: { fontSize: 13, fontWeight: "600", color: Colors.TEXT, flex: 1 },

  /* Participants */
  emptyParticipants: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 14, color: Colors.TEXT_SECONDARY },
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.BACKGROUND,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
  },
  seedBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.PRIMARY + "14",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  seedText: { fontSize: 13, fontWeight: "700", color: Colors.PRIMARY },
  participantInfo: { flex: 1 },
  participantName: { fontSize: 14, fontWeight: "600", color: Colors.TEXT },
  partnerName: { fontSize: 12, color: Colors.TEXT_SECONDARY, marginTop: 1 },
  pStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  pStatusText: { fontSize: 10, fontWeight: "700" },

  /* CTA */
  ctaWrap: {
    padding: 16,
    paddingBottom: 24,
    backgroundColor: Colors.BACKGROUND,
    borderTopWidth: 1,
    borderTopColor: Colors.BORDER,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.PRIMARY,
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaText: { fontSize: 16, fontWeight: "700", color: "#FFF" },
});

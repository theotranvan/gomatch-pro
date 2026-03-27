import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";
import { LoadingScreen } from "../../components/LoadingScreen";
import { ErrorState } from "../../components/ErrorState";
import { eventsService } from "../../services/events";
import { formatDate, formatTime, getInitials } from "../../utils/helpers";
import type { EventDetail, EventRegistration, RegistrationStatus } from "../../types";
import type { HomeStackParamList } from "../../navigation/HomeStack";

type RouteParams = RouteProp<HomeStackParamList, "EventDetail">;

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  upcoming: { label: "À venir", color: Colors.SUCCESS },
  ongoing: { label: "En cours", color: "#F59E0B" },
  completed: { label: "Terminé", color: Colors.TEXT_SECONDARY },
  cancelled: { label: "Annulé", color: Colors.ERROR },
};

const TYPE_LABELS: Record<string, string> = {
  cup: "Go Match Cup 🏆",
  social: "Social 🤝",
  clinic: "Clinic 🎓",
  other: "Événement",
};

const REG_STATUS_CONFIG: Record<RegistrationStatus, { label: string; color: string }> = {
  registered: { label: "Inscrit", color: Colors.SUCCESS },
  confirmed: { label: "Confirmé", color: Colors.NAVY },
  waitlisted: { label: "Liste d'attente", color: "#F59E0B" },
  cancelled: { label: "Annulé", color: Colors.ERROR },
};

export function EventDetailScreen() {
  const { params } = useRoute<RouteParams>();
  const navigation = useNavigation();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [myRegistration, setMyRegistration] = useState<EventRegistration | null>(null);

  const fetchEvent = useCallback(async () => {
    try {
      const data = await eventsService.getEvent(params.eventId);
      setEvent(data);
      setError(false);
    } catch {
      setError(true);
    }
  }, [params.eventId]);

  const fetchMyRegistration = useCallback(async () => {
    try {
      const regs = await eventsService.getMyRegistrations();
      const mine = regs.find(
        (r) => r.event === params.eventId && r.status !== "cancelled",
      );
      setMyRegistration(mine ?? null);
    } catch {
      // non-critical
    }
  }, [params.eventId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchEvent(), fetchMyRegistration()]).finally(() =>
      setLoading(false),
    );
  }, [fetchEvent, fetchMyRegistration]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchEvent(), fetchMyRegistration()]);
    setRefreshing(false);
  }, [fetchEvent, fetchMyRegistration]);

  const handleRegister = useCallback(async () => {
    if (!event) return;
    setActionLoading(true);
    try {
      const reg = await eventsService.register(event.id);
      setMyRegistration(reg);
      await fetchEvent();
      Alert.alert(
        reg.status === "waitlisted" ? "Liste d'attente" : "Inscription confirmée",
        reg.status === "waitlisted"
          ? "L'événement est complet. Vous êtes sur la liste d'attente."
          : "Vous êtes inscrit à cet événement !",
      );
    } catch (err: any) {
      Alert.alert("Erreur", err?.response?.data?.detail ?? "Impossible de s'inscrire");
    } finally {
      setActionLoading(false);
    }
  }, [event, fetchEvent]);

  const handleCancel = useCallback(async () => {
    if (!event) return;
    Alert.alert(
      "Annuler l'inscription",
      "Voulez-vous vraiment annuler votre inscription ?",
      [
        { text: "Non", style: "cancel" },
        {
          text: "Oui, annuler",
          style: "destructive",
          onPress: async () => {
            setActionLoading(true);
            try {
              await eventsService.cancelRegistration(event.id);
              setMyRegistration(null);
              await fetchEvent();
            } catch (err: any) {
              Alert.alert("Erreur", err?.response?.data?.detail ?? "Impossible d'annuler");
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  }, [event, fetchEvent]);

  // ── Loading / Error ──

  if (loading) return <LoadingScreen message="Chargement…" />;
  if (error || !event)
    return <ErrorState message="Impossible de charger l'événement" onRetry={() => { setLoading(true); Promise.all([fetchEvent(), fetchMyRegistration()]).finally(() => setLoading(false)); }} />;

  const statusCfg = STATUS_CONFIG[event.status];
  const priceNum = parseFloat(event.price);
  const isUpcoming = event.status === "upcoming";
  const activeRegs = event.registrations.filter((r) => r.status !== "cancelled");

  // ── Render ──

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.NAVY} colors={[Colors.NAVY]} />
      }
    >
      {/* Image banner placeholder */}
      {event.image_url ? (
        <Image source={{ uri: event.image_url }} style={s.banner} resizeMode="cover" />
      ) : (
        <View style={[s.banner, s.bannerPlaceholder]}>
          <Text style={s.bannerEmoji}>{event.event_type === "cup" ? "🏆" : event.event_type === "social" ? "🤝" : "🎓"}</Text>
        </View>
      )}

      {/* Event info card */}
      <View style={s.card}>
        <View style={s.row}>
          <Text style={s.typeLabel}>{TYPE_LABELS[event.event_type] ?? "Événement"}</Text>
          <View style={[s.statusBadge, { backgroundColor: statusCfg.color + "18" }]}>
            <Text style={[s.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
          </View>
        </View>

        <Text style={s.title}>{event.name}</Text>

        {event.description ? (
          <Text style={s.description}>{event.description}</Text>
        ) : null}

        <View style={s.metaSection}>
          <MetaRow icon="calendar-outline" text={formatDate(event.date) + (event.end_date ? ` → ${formatDate(event.end_date)}` : "") + (event.start_time ? ` · ${formatTime(event.start_time)}` : "")} />
          <MetaRow icon="location-outline" text={event.location} />
          {event.sport && <MetaRow icon="tennisball-outline" text={event.sport === "tennis" ? "Tennis" : "Padel"} />}
          <MetaRow icon="people-outline" text={`${event.registrations_count} inscrit${event.registrations_count !== 1 ? "s" : ""}${event.max_attendees ? ` / ${event.max_attendees}` : ""}`} />
          {priceNum > 0 && <MetaRow icon="cash-outline" text={`${event.price} CHF`} />}
          {event.registration_deadline && (
            <MetaRow icon="time-outline" text={`Inscription avant le ${formatDate(event.registration_deadline)}`} />
          )}
        </View>
      </View>

      {/* Action button */}
      {isUpcoming && (
        <View style={s.actionSection}>
          {myRegistration ? (
            <>
              <View style={[s.regStatusBadge, { backgroundColor: REG_STATUS_CONFIG[myRegistration.status].color + "18" }]}>
                <Ionicons name="checkmark-circle" size={18} color={REG_STATUS_CONFIG[myRegistration.status].color} />
                <Text style={[s.regStatusText, { color: REG_STATUS_CONFIG[myRegistration.status].color }]}>
                  {REG_STATUS_CONFIG[myRegistration.status].label}
                </Text>
              </View>
              <TouchableOpacity
                style={s.cancelButton}
                onPress={handleCancel}
                disabled={actionLoading}
              >
                <Text style={s.cancelButtonText}>Annuler mon inscription</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[s.registerButton, actionLoading && s.buttonDisabled]}
              onPress={handleRegister}
              disabled={actionLoading}
            >
              <Text style={s.registerButtonText}>
                {priceNum > 0 ? `${event.price} CHF — S'inscrire` : "S'inscrire"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Participants */}
      {activeRegs.length > 0 && (
        <View style={s.card}>
          <Text style={s.sectionTitle}>
            Participants ({activeRegs.length})
          </Text>
          {activeRegs.map((reg) => (
            <View key={reg.id} style={s.participantRow}>
              {reg.player.avatar_url ? (
                <Image source={{ uri: reg.player.avatar_url }} style={s.avatar} />
              ) : (
                <View style={[s.avatar, s.avatarPlaceholder]}>
                  <Text style={s.avatarInitials}>
                    {getInitials(reg.player.first_name, reg.player.last_name)}
                  </Text>
                </View>
              )}
              <View style={s.participantInfo}>
                <Text style={s.participantName}>
                  {reg.player.first_name} {reg.player.last_name}
                </Text>
                {reg.player.city ? (
                  <Text style={s.participantCity}>{reg.player.city}</Text>
                ) : null}
              </View>
              {reg.status === "waitlisted" && (
                <View style={[s.miniStatusBadge, { backgroundColor: "#F59E0B18" }]}>
                  <Text style={[s.miniStatusText, { color: "#F59E0B" }]}>Attente</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

// ── Helpers ──

function MetaRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={s.metaRow}>
      <Ionicons name={icon as any} size={16} color={Colors.TEXT_SECONDARY} />
      <Text style={s.metaText}>{text}</Text>
    </View>
  );
}

// ── Styles ──

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  content: { paddingBottom: 20 },
  // Banner
  banner: { width: "100%", height: 180 },
  bannerPlaceholder: {
    backgroundColor: Colors.NAVY + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerEmoji: { fontSize: 56 },
  // Card
  card: {
    backgroundColor: Colors.BACKGROUND,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  typeLabel: { fontSize: 13, fontWeight: "600", color: Colors.TEXT_SECONDARY },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: "700" },
  title: { fontSize: 22, fontWeight: "800", color: Colors.TEXT, marginBottom: 8 },
  description: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
    lineHeight: 20,
    marginBottom: 12,
  },
  // Meta
  metaSection: { gap: 8 },
  metaRow: { flexDirection: "row", alignItems: "center" },
  metaText: { fontSize: 14, color: Colors.TEXT, marginLeft: 8, flex: 1 },
  // Action
  actionSection: { marginHorizontal: 16, marginTop: 16, gap: 10 },
  registerButton: {
    backgroundColor: Colors.NAVY,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  registerButtonText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  regStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  regStatusText: { fontSize: 15, fontWeight: "700" },
  cancelButton: {
    borderWidth: 1.5,
    borderColor: Colors.ERROR,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelButtonText: { color: Colors.ERROR, fontSize: 15, fontWeight: "600" },
  // Participants
  sectionTitle: { fontSize: 16, fontWeight: "700", color: Colors.TEXT, marginBottom: 12 },
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.BORDER,
  },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: {
    backgroundColor: Colors.NAVY + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: { fontSize: 13, fontWeight: "700", color: Colors.NAVY },
  participantInfo: { flex: 1, marginLeft: 10 },
  participantName: { fontSize: 14, fontWeight: "600", color: Colors.TEXT },
  participantCity: { fontSize: 12, color: Colors.TEXT_SECONDARY },
  miniStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  miniStatusText: { fontSize: 10, fontWeight: "700" },
});

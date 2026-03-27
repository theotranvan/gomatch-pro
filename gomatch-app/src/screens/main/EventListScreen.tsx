import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";
import { LoadingScreen } from "../../components/LoadingScreen";
import { EmptyState } from "../../components/EmptyState";
import { eventsService } from "../../services/events";
import { formatDate, formatTime } from "../../utils/helpers";
import type { EventListItem, EventType } from "../../types";
import type { HomeStackParamList } from "../../navigation/HomeStack";

type Nav = NativeStackNavigationProp<HomeStackParamList>;

const EVENT_TYPE_CONFIG: Record<EventType, { label: string; emoji: string; color: string }> = {
  cup: { label: "Go Match Cup", emoji: "🏆", color: "#F59E0B" },
  social: { label: "Social", emoji: "🤝", color: "#3B82F6" },
  clinic: { label: "Clinic", emoji: "🎓", color: "#8B5CF6" },
  other: { label: "Autre", emoji: "📌", color: Colors.TEXT_SECONDARY },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  upcoming: { label: "À venir", color: Colors.SUCCESS },
  ongoing: { label: "En cours", color: "#F59E0B" },
  completed: { label: "Terminé", color: Colors.TEXT_SECONDARY },
  cancelled: { label: "Annulé", color: Colors.ERROR },
};

const FILTER_TABS: { key: EventType | "all"; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "cup", label: "🏆 Cup" },
  { key: "social", label: "🤝 Social" },
  { key: "clinic", label: "🎓 Clinic" },
];

export function EventListScreen() {
  const navigation = useNavigation<Nav>();
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [filter, setFilter] = useState<EventType | "all">("all");

  const fetchEvents = useCallback(
    async (append = false) => {
      try {
        const params: Record<string, string> = {};
        if (filter !== "all") params.event_type = filter;
        const res = await eventsService.getEvents(params);
        setEvents(append ? (prev) => [...prev, ...res.results] : res.results);
        setNextPage(res.next);
      } catch {
        // silent — user can pull-to-refresh
      }
    },
    [filter],
  );

  useEffect(() => {
    setLoading(true);
    fetchEvents().finally(() => setLoading(false));
  }, [fetchEvents]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEvents();
    setRefreshing(false);
  }, [fetchEvents]);

  const onEndReached = useCallback(async () => {
    if (!nextPage || loadingMore) return;
    setLoadingMore(true);
    await fetchEvents(true);
    setLoadingMore(false);
  }, [nextPage, loadingMore, fetchEvents]);

  // ── Event Card ──

  function renderEventCard({ item }: { item: EventListItem }) {
    const typeCfg = EVENT_TYPE_CONFIG[item.event_type];
    const statusCfg = STATUS_CONFIG[item.status];
    const spotsText =
      item.spots_left !== null
        ? item.spots_left > 0
          ? `${item.spots_left} place${item.spots_left > 1 ? "s" : ""}`
          : "Complet"
        : "Illimité";
    const priceNum = parseFloat(item.price);

    return (
      <TouchableOpacity
        style={s.card}
        activeOpacity={0.7}
        onPress={() => navigation.navigate("EventDetail", { eventId: item.id })}
      >
        {/* Type badge */}
        <View style={[s.typeBadge, { backgroundColor: typeCfg.color + "18" }]}>
          <Text style={s.typeBadgeEmoji}>{typeCfg.emoji}</Text>
          <Text style={[s.typeBadgeText, { color: typeCfg.color }]}>{typeCfg.label}</Text>
        </View>

        {/* Header */}
        <View style={s.cardHeader}>
          <View style={[s.emojiCircle, { backgroundColor: typeCfg.color + "12" }]}>
            <Text style={s.emoji}>{typeCfg.emoji}</Text>
          </View>
          <View style={s.headerInfo}>
            <Text style={s.eventName} numberOfLines={2}>
              {item.name}
            </Text>
            <View style={[s.statusBadge, { backgroundColor: statusCfg.color + "18" }]}>
              <Text style={[s.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
            </View>
          </View>
        </View>

        {/* Meta */}
        <View style={s.metaSection}>
          <View style={s.metaRow}>
            <Ionicons name="calendar-outline" size={14} color={Colors.TEXT_SECONDARY} />
            <Text style={s.metaText}>
              {formatDate(item.date)}
              {item.start_time ? ` · ${formatTime(item.start_time)}` : ""}
            </Text>
          </View>
          <View style={s.metaRow}>
            <Ionicons name="location-outline" size={14} color={Colors.TEXT_SECONDARY} />
            <Text style={s.metaText} numberOfLines={1}>
              {item.location}
            </Text>
          </View>
          <View style={s.metaRow}>
            <Ionicons name="people-outline" size={14} color={Colors.TEXT_SECONDARY} />
            <Text style={s.metaText}>
              {item.registrations_count} inscrit{item.registrations_count !== 1 ? "s" : ""} · {spotsText}
            </Text>
          </View>
          {priceNum > 0 && (
            <View style={s.metaRow}>
              <Ionicons name="cash-outline" size={14} color={Colors.TEXT_SECONDARY} />
              <Text style={s.metaText}>{item.price} CHF</Text>
            </View>
          )}
        </View>

        <View style={s.chevronWrap}>
          <Ionicons name="chevron-forward" size={18} color={Colors.BORDER} />
        </View>
      </TouchableOpacity>
    );
  }

  // ── Tabs ──

  function renderTabs() {
    return (
      <View style={s.tabsRow}>
        {FILTER_TABS.map((tab) => {
          const active = filter === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[s.tab, active && s.tabActive]}
              onPress={() => setFilter(tab.key)}
            >
              <Text style={[s.tabText, active && s.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  // ── Main ──

  if (loading) return <LoadingScreen message="Chargement des événements…" />;

  return (
    <View style={s.container}>
      {renderTabs()}
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={renderEventCard}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.NAVY}
            colors={[Colors.NAVY]}
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={{ marginVertical: 16 }} color={Colors.NAVY} />
          ) : null
        }
        ListEmptyComponent={
          <EmptyState icon="calendar-outline" title="Aucun événement pour le moment" />
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  // ── Tabs ──
  tabsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.BACKGROUND,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  tabActive: {
    backgroundColor: Colors.NAVY,
    borderColor: Colors.NAVY,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.TEXT_SECONDARY,
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  // ── Card ──
  card: {
    backgroundColor: Colors.BACKGROUND,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  typeBadge: {
    flexDirection: "row",
    alignSelf: "flex-start",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
    gap: 4,
  },
  typeBadgeEmoji: {
    fontSize: 11,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  emojiCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  emoji: {
    fontSize: 22,
  },
  headerInfo: {
    flex: 1,
    marginRight: 8,
  },
  eventName: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.TEXT,
    marginBottom: 4,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  metaSection: {
    gap: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    fontSize: 12,
    color: Colors.TEXT_SECONDARY,
    marginLeft: 6,
  },
  chevronWrap: {
    position: "absolute",
    right: 14,
    top: "50%",
  },
});

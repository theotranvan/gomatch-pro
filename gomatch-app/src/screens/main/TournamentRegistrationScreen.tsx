import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";
import { tournamentsService } from "../../services/tournaments";
import type { PlayerProfile } from "../../types";
import type { TournamentsStackParamList } from "../../navigation/TournamentsStack";

type Nav = NativeStackNavigationProp<TournamentsStackParamList>;
type Route = RouteProp<TournamentsStackParamList, "TournamentRegistration">;

export function TournamentRegistrationScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const isDoubles = params.matchType === "doubles";

  const [search, setSearch] = useState("");
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<PlayerProfile | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /* Partner search (doubles only) */
  useEffect(() => {
    if (!isDoubles || search.length < 2) {
      setPlayers([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await tournamentsService.searchPlayers(search);
        setPlayers(res.results);
      } catch {
        setPlayers([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [search, isDoubles]);

  const handleRegister = useCallback(async () => {
    if (isDoubles && !selectedPartner) {
      Alert.alert("Partenaire requis", "Veuillez sélectionner un partenaire pour le double.");
      return;
    }
    setSubmitting(true);
    try {
      await tournamentsService.register(
        params.tournamentId,
        selectedPartner?.id
      );
      Alert.alert(
        "Inscription confirmée 🎉",
        `Vous êtes inscrit au tournoi ${params.tournamentName}${
          selectedPartner ? ` avec ${selectedPartner.first_name} ${selectedPartner.last_name}` : ""
        }.`,
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        "Une erreur est survenue.";
      Alert.alert("Erreur", detail);
    } finally {
      setSubmitting(false);
    }
  }, [isDoubles, selectedPartner, params, navigation]);

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* ── Header info ── */}
      <View style={s.headerCard}>
        <Text style={s.sportEmoji}>
          {params.sport === "tennis" ? "🎾" : "🏓"}
        </Text>
        <View style={s.headerInfo}>
          <Text style={s.headerTitle}>{params.tournamentName}</Text>
          <Text style={s.headerSub}>
            {isDoubles ? "Double" : "Simple"} · Inscription
          </Text>
        </View>
      </View>

      {/* ── Singles: direct registration ── */}
      {!isDoubles && (
        <View style={s.singlesContent}>
          <Ionicons name="checkmark-circle-outline" size={48} color={Colors.NAVY} />
          <Text style={s.singlesTitle}>Prêt à vous inscrire ?</Text>
          <Text style={s.singlesBody}>
            Confirmez votre inscription au tournoi en simple.
          </Text>
        </View>
      )}

      {/* ── Doubles: partner picker ── */}
      {isDoubles && (
        <View style={s.doublesContent}>
          <Text style={s.sectionTitle}>
            <Ionicons name="person-add-outline" size={16} color={Colors.TEXT} />{" "}
            Choisir un partenaire
          </Text>

          {selectedPartner ? (
            <View style={s.selectedCard}>
              <View style={s.selectedAvatar}>
                <Text style={s.selectedInitial}>
                  {selectedPartner.first_name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={s.selectedInfo}>
                <Text style={s.selectedName}>{selectedPartner.first_name} {selectedPartner.last_name}</Text>
                {selectedPartner.city && (
                  <Text style={s.selectedCity}>{selectedPartner.city}</Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => setSelectedPartner(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={22} color={Colors.ERROR} />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={s.searchBar}>
                <Ionicons name="search" size={18} color={Colors.TEXT_SECONDARY} />
                <TextInput
                  style={s.searchInput}
                  placeholder="Rechercher un joueur…"
                  placeholderTextColor={Colors.TEXT_SECONDARY}
                  value={search}
                  onChangeText={setSearch}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searching && <ActivityIndicator size="small" color={Colors.NAVY} />}
              </View>
              <FlatList
                data={players}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={s.playerRow}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSelectedPartner(item);
                      setSearch("");
                      setPlayers([]);
                    }}
                  >
                    <View style={s.playerAvatar}>
                      <Text style={s.playerInitial}>
                        {item.first_name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={s.playerInfo}>
                      <Text style={s.playerName}>{item.first_name} {item.last_name}</Text>
                      {item.city && (
                        <Text style={s.playerCity}>{item.city}</Text>
                      )}
                    </View>
                    <Ionicons name="add-circle-outline" size={22} color={Colors.NAVY} />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  search.length >= 2 && !searching ? (
                    <Text style={s.noResults}>Aucun joueur trouvé.</Text>
                  ) : null
                }
                style={s.playerList}
              />
            </>
          )}
        </View>
      )}

      {/* ── Submit ── */}
      <View style={s.ctaWrap}>
        <TouchableOpacity
          style={[s.ctaButton, submitting && s.ctaDisabled]}
          activeOpacity={0.8}
          onPress={handleRegister}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
              <Text style={s.ctaText}>Confirmer l'inscription</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },

  /* Header */
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.BACKGROUND,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  sportEmoji: { fontSize: 36, marginRight: 12 },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: Colors.TEXT },
  headerSub: { fontSize: 13, color: Colors.TEXT_SECONDARY, marginTop: 2 },

  /* Singles */
  singlesContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 10,
  },
  singlesTitle: { fontSize: 18, fontWeight: "700", color: Colors.TEXT },
  singlesBody: { fontSize: 14, color: Colors.TEXT_SECONDARY, textAlign: "center" },

  /* Doubles */
  doublesContent: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: Colors.TEXT, marginBottom: 12 },

  selectedCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.BACKGROUND,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.NAVY,
  },
  selectedAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.NAVY + "18",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  selectedInitial: { fontSize: 16, fontWeight: "700", color: Colors.NAVY },
  selectedInfo: { flex: 1 },
  selectedName: { fontSize: 15, fontWeight: "600", color: Colors.TEXT },
  selectedCity: { fontSize: 12, color: Colors.TEXT_SECONDARY, marginTop: 1 },

  /* Search bar */
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.BACKGROUND,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.TEXT, padding: 0 },

  /* Player list */
  playerList: { marginTop: 8 },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.BACKGROUND,
    padding: 12,
    borderRadius: 12,
    marginTop: 6,
  },
  playerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.NAVY + "14",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  playerInitial: { fontSize: 14, fontWeight: "700", color: Colors.NAVY },
  playerInfo: { flex: 1 },
  playerName: { fontSize: 14, fontWeight: "600", color: Colors.TEXT },
  playerCity: { fontSize: 12, color: Colors.TEXT_SECONDARY, marginTop: 1 },
  noResults: {
    fontSize: 13,
    color: Colors.TEXT_SECONDARY,
    textAlign: "center",
    paddingVertical: 20,
  },

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
    backgroundColor: Colors.NAVY,
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    shadowColor: Colors.NAVY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { fontSize: 16, fontWeight: "700", color: "#FFF" },
});

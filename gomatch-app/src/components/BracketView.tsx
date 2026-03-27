import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Colors } from "../constants/colors";
import type { TournamentRound, TournamentMatch } from "../types";

interface BracketViewProps {
  rounds: TournamentRound[];
}

const MATCH_W = 200;
const MATCH_H = 72;
const GAP_V = 16;
const COL_GAP = 32;

function MatchCard({ match }: { match: TournamentMatch }) {
  const isCompleted = match.status === "completed";

  return (
    <View style={s.matchCard}>
      <PlayerSlot
        name={match.participant_a_name}
        isWinner={isCompleted && match.winner === match.participant_a}
      />
      <View style={s.divider} />
      <PlayerSlot
        name={match.participant_b_name}
        isWinner={isCompleted && match.winner === match.participant_b}
      />
    </View>
  );
}

function PlayerSlot({
  name,
  isWinner,
}: {
  name: string | null;
  isWinner: boolean;
}) {
  return (
    <View style={[s.slot, isWinner && s.slotWinner]}>
      <Text
        style={[s.slotText, isWinner && s.slotTextWinner]}
        numberOfLines={1}
      >
        {name || "—"}
      </Text>
      {isWinner && <Text style={s.checkMark}>✓</Text>}
    </View>
  );
}

export function BracketView({ rounds }: BracketViewProps) {
  if (!rounds || rounds.length === 0) {
    return (
      <View style={s.emptyContainer}>
        <Text style={s.emptyText}>Le bracket n'a pas encore été généré.</Text>
      </View>
    );
  }

  const sortedRounds = [...rounds].sort(
    (a, b) => a.round_number - b.round_number
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.scrollContent}
    >
      {sortedRounds.map((round, roundIdx) => {
        const sortedMatches = [...round.matches].sort(
          (a, b) => a.position - b.position
        );
        const spacer = Math.pow(2, roundIdx);

        return (
          <View key={round.id} style={s.column}>
            <Text style={s.roundTitle}>{round.round_name}</Text>
            <View style={s.matchesColumn}>
              {sortedMatches.map((match, matchIdx) => (
                <View
                  key={match.id}
                  style={[
                    s.matchWrapper,
                    {
                      marginTop:
                        matchIdx === 0
                          ? (spacer - 1) * ((MATCH_H + GAP_V) / 2)
                          : (spacer - 1) * (MATCH_H + GAP_V) + GAP_V,
                    },
                  ]}
                >
                  <MatchCard match={match} />
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: "flex-start",
  },
  column: {
    marginRight: COL_GAP,
    alignItems: "center",
  },
  roundTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.NAVY,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  matchesColumn: {
    alignItems: "center",
  },
  matchWrapper: {},
  matchCard: {
    width: MATCH_W,
    backgroundColor: Colors.BACKGROUND,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.BORDER,
  },
  slot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 34,
  },
  slotWinner: {
    backgroundColor: Colors.NAVY + "12",
  },
  slotText: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.TEXT,
    flex: 1,
  },
  slotTextWinner: {
    fontWeight: "800",
    color: Colors.NAVY,
  },
  checkMark: {
    fontSize: 12,
    color: Colors.NAVY,
    fontWeight: "700",
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
  },
});

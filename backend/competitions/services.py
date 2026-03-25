import math
import random

from django.utils import timezone

from accounts.models import PlayerProfile
from competitions.models import (
    Tournament,
    TournamentMatch,
    TournamentParticipant,
    TournamentRound,
)
from core.enums import (
    MatchType,
    SkillLevel,
    SportType,
    TournamentFormat,
    TournamentMatchStatus,
    TournamentParticipantStatus,
    TournamentRoundStatus,
    TournamentStatus,
)
from scoring.models import Ranking

SKILL_LEVEL_ORDER = [SkillLevel.BEGINNER, SkillLevel.INTERMEDIATE, SkillLevel.ADVANCED]

ROUND_NAMES = {
    1: "Finale",
    2: "Demi-finales",
    4: "Quarts de finale",
    8: "Huitièmes de finale",
    16: "1er tour",
    32: "1er tour",
}


class TournamentService:

    @staticmethod
    def create_tournament(user, validated_data):
        if validated_data.get("sport") == SportType.PADEL:
            validated_data["match_type"] = MatchType.DOUBLES

        tournament = Tournament.objects.create(
            created_by=user,
            **validated_data,
        )
        return tournament

    @staticmethod
    def register_player(user, tournament_id, partner_id=None):
        try:
            tournament = Tournament.objects.get(pk=tournament_id)
        except Tournament.DoesNotExist:
            raise ValueError("Tournament not found.")

        if tournament.status != TournamentStatus.REGISTRATION:
            raise ValueError("Registration is closed for this tournament.")

        if tournament.is_full:
            raise ValueError("Tournament is full.")

        profile = user.profile

        if TournamentParticipant.objects.filter(
            tournament=tournament, player=profile,
        ).exists():
            raise ValueError("You are already registered.")

        # Level check
        if tournament.required_level_min:
            level_field = (
                profile.level_tennis
                if tournament.sport == SportType.TENNIS
                else profile.level_padel
            )
            if level_field:
                if (
                    SKILL_LEVEL_ORDER.index(level_field)
                    < SKILL_LEVEL_ORDER.index(tournament.required_level_min)
                ):
                    raise ValueError("Your skill level is too low for this tournament.")

        # Doubles: partner required for padel
        partner = None
        if tournament.match_type == MatchType.DOUBLES:
            if not partner_id:
                raise ValueError("A partner is required for doubles tournaments.")
            try:
                partner = PlayerProfile.objects.get(pk=partner_id)
            except PlayerProfile.DoesNotExist:
                raise ValueError("Partner not found.")
            if partner == profile:
                raise ValueError("You cannot be your own partner.")
            if TournamentParticipant.objects.filter(
                tournament=tournament, player=partner,
            ).exists():
                raise ValueError("Your partner is already registered.")

        participant = TournamentParticipant.objects.create(
            tournament=tournament,
            player=profile,
            partner=partner,
        )
        return participant

    @staticmethod
    def generate_bracket(tournament_id):
        try:
            tournament = Tournament.objects.get(pk=tournament_id)
        except Tournament.DoesNotExist:
            raise ValueError("Tournament not found.")

        if tournament.status != TournamentStatus.REGISTRATION:
            raise ValueError("Bracket can only be generated during registration.")

        if tournament.format != TournamentFormat.SINGLE_ELIMINATION:
            raise ValueError("Bracket generation is only for single elimination.")

        participants = list(tournament.participants.all())
        n = len(participants)

        if n < 2:
            raise ValueError("At least 2 participants required.")

        # Seed: by ranking if available, otherwise random
        sport = tournament.sport
        ranked = []
        for p in participants:
            try:
                ranking = Ranking.objects.get(player=p.player, sport=sport)
                ranked.append((p, ranking.points))
            except Ranking.DoesNotExist:
                ranked.append((p, 0))

        has_rankings = any(pts > 0 for _, pts in ranked)
        if has_rankings:
            ranked.sort(key=lambda x: x[1], reverse=True)
        else:
            random.shuffle(ranked)

        seeded_participants = []
        for i, (p, _) in enumerate(ranked, start=1):
            p.seed = i
            p.save(update_fields=["seed"])
            seeded_participants.append(p)

        # Calculate bracket size (next power of 2)
        bracket_size = 2 ** math.ceil(math.log2(n))
        num_byes = bracket_size - n
        num_rounds = int(math.log2(bracket_size))

        # Pad with None for byes
        slots = list(seeded_participants) + [None] * num_byes

        # Clear existing rounds
        tournament.rounds.all().delete()

        # Create rounds
        rounds = []
        for r in range(1, num_rounds + 1):
            matches_in_round = bracket_size // (2 ** r)
            round_name = ROUND_NAMES.get(matches_in_round, f"Tour {r}")
            rnd = TournamentRound.objects.create(
                tournament=tournament,
                round_number=r,
                round_name=round_name,
            )
            rounds.append(rnd)

        # Create first round matches
        first_round = rounds[0]
        first_round_matches = []
        for i in range(0, bracket_size, 2):
            a = slots[i]
            b = slots[i + 1]
            position = (i // 2) + 1
            tm = TournamentMatch.objects.create(
                round=first_round,
                position=position,
                participant_a=a,
                participant_b=b,
            )
            first_round_matches.append(tm)

        # Auto-advance byes
        for tm in first_round_matches:
            if tm.participant_a is None and tm.participant_b is not None:
                tm.winner = tm.participant_b
                tm.status = TournamentMatchStatus.COMPLETED
                tm.save(update_fields=["winner", "status"])
            elif tm.participant_b is None and tm.participant_a is not None:
                tm.winner = tm.participant_a
                tm.status = TournamentMatchStatus.COMPLETED
                tm.save(update_fields=["winner", "status"])

        # Create subsequent rounds (empty matches)
        for r_idx in range(1, len(rounds)):
            rnd = rounds[r_idx]
            prev_round = rounds[r_idx - 1]
            prev_matches = list(prev_round.matches.order_by("position"))
            num_matches = len(prev_matches) // 2
            for i in range(num_matches):
                TournamentMatch.objects.create(
                    round=rnd,
                    position=i + 1,
                )

        # Place bye winners into round 2
        if len(rounds) > 1:
            second_round_matches = list(rounds[1].matches.order_by("position"))
            for tm in first_round_matches:
                if tm.winner:
                    next_pos = (tm.position - 1) // 2
                    next_match = second_round_matches[next_pos]
                    if tm.position % 2 == 1:
                        next_match.participant_a = tm.winner
                    else:
                        next_match.participant_b = tm.winner
                    next_match.save(update_fields=["participant_a", "participant_b"])

        # Update first round status
        has_non_bye = any(
            m.status != TournamentMatchStatus.COMPLETED
            for m in first_round_matches
        )
        if has_non_bye:
            first_round.status = TournamentRoundStatus.IN_PROGRESS
        else:
            first_round.status = TournamentRoundStatus.COMPLETED
            if len(rounds) > 1:
                rounds[1].status = TournamentRoundStatus.IN_PROGRESS
                rounds[1].save(update_fields=["status"])
        first_round.save(update_fields=["status"])

        # Update tournament status
        tournament.status = TournamentStatus.IN_PROGRESS
        tournament.save(update_fields=["status", "updated_at"])

        return tournament

    @staticmethod
    def advance_winner(tournament_match_id, winner_participant_id):
        try:
            tm = TournamentMatch.objects.select_related(
                "round__tournament", "participant_a", "participant_b",
            ).get(pk=tournament_match_id)
        except TournamentMatch.DoesNotExist:
            raise ValueError("Tournament match not found.")

        try:
            winner = TournamentParticipant.objects.get(pk=winner_participant_id)
        except TournamentParticipant.DoesNotExist:
            raise ValueError("Participant not found.")

        if winner not in (tm.participant_a, tm.participant_b):
            raise ValueError("Winner must be one of the match participants.")

        # Mark loser as eliminated
        loser = tm.participant_a if winner == tm.participant_b else tm.participant_b
        if loser:
            loser.status = TournamentParticipantStatus.ELIMINATED
            loser.save(update_fields=["status"])

        tm.winner = winner
        tm.status = TournamentMatchStatus.COMPLETED
        tm.save(update_fields=["winner", "status"])

        tournament = tm.round.tournament
        current_round = tm.round

        # Check if all matches in this round are completed
        all_completed = not current_round.matches.exclude(
            status=TournamentMatchStatus.COMPLETED,
        ).exists()

        if all_completed:
            current_round.status = TournamentRoundStatus.COMPLETED
            current_round.save(update_fields=["status"])

        # Find next round
        try:
            next_round = TournamentRound.objects.get(
                tournament=tournament,
                round_number=current_round.round_number + 1,
            )
        except TournamentRound.DoesNotExist:
            # This was the final — tournament complete
            tournament.status = TournamentStatus.COMPLETED
            tournament.save(update_fields=["status", "updated_at"])
            winner.status = TournamentParticipantStatus.WINNER
            winner.save(update_fields=["status"])
            return tm

        # Place winner in next round match
        next_pos = (tm.position - 1) // 2
        next_matches = list(next_round.matches.order_by("position"))
        if next_pos >= len(next_matches):
            raise ValueError("Bracket structure error: no next match found.")
        next_match = next_matches[next_pos]

        if tm.position % 2 == 1:
            next_match.participant_a = winner
        else:
            next_match.participant_b = winner
        next_match.save(update_fields=["participant_a", "participant_b"])

        # Activate next round if current is done
        if all_completed:
            next_round.status = TournamentRoundStatus.IN_PROGRESS
            next_round.save(update_fields=["status"])

        return tm

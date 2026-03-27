from django.utils import timezone

from core.enums import (
    MatchStatus,
    MatchType,
    ParticipantStatus,
    PlayMode,
    ScoreStatus,
    SportType,
    TeamSide,
)
from core.tasks import send_push_notification_task, update_rankings_task
from matches.models import MatchParticipant
from scoring.models import Ranking, Score


class ScoreService:
    """Service for score submission, confirmation, and dispute."""

    @staticmethod
    def _validate_sets_basic(sets_data):
        """Validate basic structure: non-empty list of {team_a: int, team_b: int}."""
        if not isinstance(sets_data, list) or len(sets_data) == 0:
            raise ValueError("Sets must be a non-empty list.")
        for i, s in enumerate(sets_data):
            if not isinstance(s, dict):
                raise ValueError(f"Set {i + 1} must be a dict.")
            if "team_a" not in s or "team_b" not in s:
                raise ValueError(f"Set {i + 1} must contain 'team_a' and 'team_b'.")
            if not isinstance(s["team_a"], int) or not isinstance(s["team_b"], int):
                raise ValueError(f"Set {i + 1} scores must be integers.")
            if s["team_a"] < 0 or s["team_b"] < 0:
                raise ValueError(f"Set {i + 1} scores cannot be negative.")

    @staticmethod
    def _validate_regular_set(score_a, score_b, set_num):
        """Validate a regular tennis/padel set score."""
        high = max(score_a, score_b)
        low = min(score_a, score_b)
        if high == 7 and low in (5, 6):
            return
        if high == 6 and 0 <= low <= 4:
            return
        raise ValueError(
            f"Set {set_num} : score invalide ({score_a}-{score_b}). "
            f"Scores valides : 6-0 à 6-4, 7-5, 7-6."
        )

    @staticmethod
    def _validate_sets_for_tennis(sets_data):
        """Validate tennis scoring: best of 3 sets, standard set rules."""
        if len(sets_data) not in (2, 3):
            raise ValueError("Un match de tennis se joue en 2 ou 3 sets.")
        sets_a = 0
        sets_b = 0
        for i, s in enumerate(sets_data):
            ScoreService._validate_regular_set(s["team_a"], s["team_b"], i + 1)
            if s["team_a"] > s["team_b"]:
                sets_a += 1
            else:
                sets_b += 1
            # Match is over once someone reaches 2 sets
            if sets_a == 2 or sets_b == 2:
                if i < len(sets_data) - 1:
                    raise ValueError(
                        "Le match est terminé, il y a trop de sets."
                    )
        if sets_a != 2 and sets_b != 2:
            raise ValueError(
                "Le match doit avoir un gagnant (2 sets gagnants)."
            )

    @staticmethod
    def _validate_sets_for_padel(sets_data):
        """Validate padel scoring: 2 regular sets, optional super tie-break."""
        if len(sets_data) not in (2, 3):
            raise ValueError("Un match de padel se joue en 2 ou 3 sets.")
        # Validate first two sets as regular sets
        sets_a = 0
        sets_b = 0
        for i in range(min(2, len(sets_data))):
            s = sets_data[i]
            ScoreService._validate_regular_set(s["team_a"], s["team_b"], i + 1)
            if s["team_a"] > s["team_b"]:
                sets_a += 1
            else:
                sets_b += 1
        # If 2-0, match is over
        if sets_a == 2 or sets_b == 2:
            if len(sets_data) != 2:
                raise ValueError(
                    "Le match est terminé en 2 sets, pas de 3ème set."
                )
            return
        # 1-1: third set must be a super tie-break
        if len(sets_data) != 3:
            raise ValueError(
                "À 1 set partout, un super tie-break est requis."
            )
        stb = sets_data[2]
        high = max(stb["team_a"], stb["team_b"])
        low = min(stb["team_a"], stb["team_b"])
        if high < 10:
            raise ValueError(
                "Super tie-break : le gagnant doit atteindre au moins 10 points."
            )
        if high - low < 2:
            raise ValueError(
                "Super tie-break : 2 points d'écart minimum requis."
            )

    @staticmethod
    def submit_score(user, match_id, sets_data):
        """
        Submit a score for a match.
        0. Validate sets structure and sport-specific rules.
        1. Verify the user is a participant of the match.
        2. Verify the match is COMPLETED or IN_PROGRESS.
        3. Verify no score already exists for this match.
        4. Determine the winner from set results.
        5. Create the Score in PENDING status.
        """
        # 0. Validate basic structure
        ScoreService._validate_sets_basic(sets_data)

        from matches.models import Match

        try:
            match = Match.objects.get(pk=match_id)
        except Match.DoesNotExist:
            raise ValueError("Match not found.")

        # 0b. Sport-specific validation
        if match.sport == SportType.PADEL:
            ScoreService._validate_sets_for_padel(sets_data)
        else:
            ScoreService._validate_sets_for_tennis(sets_data)

        # 1. Check participant
        if not MatchParticipant.objects.filter(
            match=match,
            player=user.profile,
            status=ParticipantStatus.ACCEPTED,
        ).exists():
            raise ValueError("You are not a participant of this match.")

        # 2. Check match status
        if match.status not in (MatchStatus.COMPLETED, MatchStatus.IN_PROGRESS):
            raise ValueError(
                "Score can only be submitted for completed or in-progress matches."
            )

        # 3. Check existing score — allow re-submit if expired or rejected
        existing = Score.objects.filter(match=match).first()
        if existing:
            if existing.status in (ScoreStatus.EXPIRED, ScoreStatus.REJECTED):
                existing.delete()
            else:
                raise ValueError("A score has already been submitted for this match.")

        # 4. Determine winner
        winner_profile, winning_team = ScoreService._determine_winner(
            match, sets_data
        )

        # 5. Create score
        score = Score.objects.create(
            match=match,
            submitted_by=user,
            sets=sets_data,
            winner=winner_profile,
            winning_team=winning_team,
            status=ScoreStatus.PENDING,
        )

        # Notify other participants to confirm the score
        submitter_name = user.profile.first_name or user.email
        other_ids = list(
            MatchParticipant.objects.filter(
                match=match, status=ParticipantStatus.ACCEPTED,
            ).exclude(player__user=user).values_list("player__user_id", flat=True)
        )
        if other_ids:
            send_push_notification_task.delay(
                [str(uid) for uid in other_ids],
                "Score soumis",
                f"{submitter_name} a soumis le score. Confirmez-le !",
                {"type": "score", "match_id": str(match.pk)},
            )

        return score

    @staticmethod
    def confirm_score(user, score_id):
        """
        Confirm a score.
        1. Verify the user is a participant.
        2. Verify the user is NOT the submitter (anti-cheat).
        3. Set status to CONFIRMED, fill confirmed_by and confirmed_at.
        4. If match is COMPETITIVE, update rankings.
        """
        try:
            score = Score.objects.select_related("match").get(pk=score_id)
        except Score.DoesNotExist:
            raise ValueError("Score not found.")

        match = score.match

        # 1. Check participant
        if not MatchParticipant.objects.filter(
            match=match,
            player=user.profile,
            status=ParticipantStatus.ACCEPTED,
        ).exists():
            raise ValueError("You are not a participant of this match.")

        # 2. Anti-cheat: submitter cannot confirm
        if score.submitted_by_id == user.id:
            raise ValueError(
                "You cannot confirm a score you submitted yourself."
            )

        # 3. Confirm
        score.status = ScoreStatus.CONFIRMED
        score.confirmed_by = user
        score.confirmed_at = timezone.now()
        score.save(update_fields=[
            "status", "confirmed_by", "confirmed_at",
        ])

        # 4. Update rankings for competitive matches (async)
        if match.play_mode == PlayMode.COMPETITIVE:
            update_rankings_task.delay(str(score.id))

        # Notify all participants that the score is confirmed
        participant_ids = list(
            MatchParticipant.objects.filter(
                match=match, status=ParticipantStatus.ACCEPTED,
            ).values_list("player__user_id", flat=True)
        )
        if participant_ids:
            send_push_notification_task.delay(
                [str(uid) for uid in participant_ids],
                "Score validé !",
                "Score validé ! Votre classement a été mis à jour.",
                {"type": "score", "match_id": str(match.pk)},
            )

        return score

    @staticmethod
    def dispute_score(user, score_id):
        """
        Dispute a score.
        1. Verify the user is a participant.
        2. Verify the user is NOT the submitter.
        3. Set status to DISPUTED.
        """
        try:
            score = Score.objects.select_related("match").get(pk=score_id)
        except Score.DoesNotExist:
            raise ValueError("Score not found.")

        match = score.match

        # 1. Check participant
        if not MatchParticipant.objects.filter(
            match=match,
            player=user.profile,
            status=ParticipantStatus.ACCEPTED,
        ).exists():
            raise ValueError("You are not a participant of this match.")

        # 2. Anti-cheat: submitter cannot dispute their own score
        if score.submitted_by_id == user.id:
            raise ValueError(
                "You cannot dispute a score you submitted yourself."
            )

        # 3. Dispute
        score.status = ScoreStatus.DISPUTED
        score.save(update_fields=["status"])

        return score

    @staticmethod
    def admin_resolve(admin_user, score_id, action, admin_note=""):
        """
        Admin resolves a disputed score.
        action: 'confirm' → CONFIRMED (+ ranking update)
                'reject'  → REJECTED  (allows re-submission)
        """
        try:
            score = Score.objects.select_related("match").get(pk=score_id)
        except Score.DoesNotExist:
            raise ValueError("Score not found.")

        if score.status != ScoreStatus.DISPUTED:
            raise ValueError("Only disputed scores can be resolved.")

        score.admin_note = admin_note
        score.resolved_by = admin_user

        if action == "confirm":
            score.status = ScoreStatus.CONFIRMED
            score.confirmed_by = admin_user
            score.confirmed_at = timezone.now()
            score.save(update_fields=[
                "status", "admin_note", "resolved_by",
                "confirmed_by", "confirmed_at",
            ])
            # Update rankings for competitive matches (async)
            if score.match.play_mode == PlayMode.COMPETITIVE:
                update_rankings_task.delay(str(score.id))
        else:
            score.status = ScoreStatus.REJECTED
            score.save(update_fields=["status", "admin_note", "resolved_by"])

        # Notify participants
        participant_ids = list(
            MatchParticipant.objects.filter(
                match=score.match, status=ParticipantStatus.ACCEPTED,
            ).values_list("player__user_id", flat=True)
        )
        if participant_ids:
            if action == "confirm":
                send_push_notification_task.delay(
                    [str(uid) for uid in participant_ids],
                    "Litige résolu",
                    "L'admin a validé le score. Classement mis à jour.",
                    {"type": "score", "match_id": str(score.match.pk)},
                )
            else:
                send_push_notification_task.delay(
                    [str(uid) for uid in participant_ids],
                    "Litige résolu",
                    "L'admin a rejeté le score. Vous pouvez soumettre un nouveau score.",
                    {"type": "score", "match_id": str(score.match.pk)},
                )

        return score

    @staticmethod
    def _determine_winner(match, sets_data):
        """
        Determine the match winner based on sets won.
        Returns (winner_profile, winning_team).
        - Singles: winner_profile is set, winning_team is None.
        - Doubles: winner_profile is None, winning_team is TEAM_A or TEAM_B.
        """
        team_a_sets = sum(
            1 for s in sets_data if s["team_a"] > s["team_b"]
        )
        team_b_sets = sum(
            1 for s in sets_data if s["team_b"] > s["team_a"]
        )

        if team_a_sets == team_b_sets:
            return None, None

        winning_side = (
            TeamSide.TEAM_A if team_a_sets > team_b_sets else TeamSide.TEAM_B
        )

        # Doubles: return winning_team, no individual winner
        if match.match_type == MatchType.DOUBLES:
            return None, winning_side

        # Singles: return winner profile
        participants = MatchParticipant.objects.filter(
            match=match,
            status=ParticipantStatus.ACCEPTED,
        ).select_related("player").order_by("joined_at")

        players = list(participants)
        if len(players) < 2:
            return None, None

        if winning_side == TeamSide.TEAM_A:
            return players[0].player, None
        else:
            return players[1].player, None


class RankingService:
    """Service for updating player rankings."""

    @staticmethod
    def update_rankings(score):
        """
        Update rankings after a confirmed competitive match.
        - Singles: +25 for winner, -15 for loser.
        - Doubles: +25 for each player on winning team, -15 for losing team.
        """
        match = score.match
        sport = match.sport
        now = timezone.now()

        participants = MatchParticipant.objects.filter(
            match=match,
            status=ParticipantStatus.ACCEPTED,
        ).select_related("player")

        for participant in participants:
            ranking, _ = Ranking.objects.get_or_create(
                player=participant.player,
                sport=sport,
            )

            is_winner = False
            if match.match_type == MatchType.DOUBLES:
                # Doubles: compare participant.team with winning_team
                is_winner = (
                    score.winning_team
                    and participant.team == score.winning_team
                )
            else:
                # Singles: compare with winner profile
                is_winner = (
                    score.winner
                    and participant.player == score.winner
                )

            if is_winner:
                ranking.points += 25
                ranking.wins += 1
            else:
                ranking.points -= 15
                ranking.losses += 1

            ranking.last_match_at = now
            ranking.save(update_fields=[
                "points", "wins", "losses", "last_match_at", "updated_at",
            ])

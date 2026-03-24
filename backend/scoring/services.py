from django.utils import timezone

from core.enums import (
    MatchStatus,
    ParticipantStatus,
    PlayMode,
    ScoreStatus,
)
from matches.models import MatchParticipant
from scoring.models import Ranking, Score


class ScoreService:
    """Service for score submission, confirmation, and dispute."""

    @staticmethod
    def _validate_sets_format(sets_data):
        """
        Validate that sets_data is a non-empty list of
        {"team_a": int >= 0, "team_b": int >= 0} dicts.
        """
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
    def submit_score(user, match_id, sets_data):
        """
        Submit a score for a match.
        0. Validate sets format.
        1. Verify the user is a participant of the match.
        2. Verify the match is COMPLETED or IN_PROGRESS.
        3. Verify no score already exists for this match.
        4. Determine the winner from set results.
        5. Create the Score in PENDING status.
        """
        # 0. Validate sets format
        ScoreService._validate_sets_format(sets_data)

        from matches.models import Match

        try:
            match = Match.objects.get(pk=match_id)
        except Match.DoesNotExist:
            raise ValueError("Match not found.")

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

        # 3. Check existing score
        if Score.objects.filter(match=match).exists():
            raise ValueError("A score has already been submitted for this match.")

        # 4. Determine winner
        winner_profile = ScoreService._determine_winner(match, sets_data)

        # 5. Create score
        score = Score.objects.create(
            match=match,
            submitted_by=user,
            sets=sets_data,
            winner=winner_profile,
            status=ScoreStatus.PENDING,
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

        # 4. Update rankings for competitive matches
        if match.play_mode == PlayMode.COMPETITIVE:
            RankingService.update_rankings(score)

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
    def _determine_winner(match, sets_data):
        """
        Determine the match winner based on sets won.
        team_a = match creator, team_b = opponent.
        Returns the PlayerProfile of the winner.
        """
        team_a_sets = sum(
            1 for s in sets_data if s["team_a"] > s["team_b"]
        )
        team_b_sets = sum(
            1 for s in sets_data if s["team_b"] > s["team_a"]
        )

        participants = MatchParticipant.objects.filter(
            match=match,
            status=ParticipantStatus.ACCEPTED,
        ).select_related("player").order_by("joined_at")

        players = list(participants)
        if len(players) < 2:
            return None

        if team_a_sets > team_b_sets:
            return players[0].player
        elif team_b_sets > team_a_sets:
            return players[1].player
        return None


class RankingService:
    """Service for updating player rankings."""

    @staticmethod
    def update_rankings(score):
        """
        Update rankings after a confirmed competitive match.
        1. Get or create Ranking for each player in the sport.
        2. +25 points for the winner, -15 for the loser.
        3. +1 win / +1 loss.
        4. Update last_match_at.
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

            if score.winner and participant.player == score.winner:
                ranking.points += 25
                ranking.wins += 1
            else:
                ranking.points -= 15
                ranking.losses += 1

            ranking.last_match_at = now
            ranking.save(update_fields=[
                "points", "wins", "losses", "last_match_at", "updated_at",
            ])

from datetime import date, time

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from core.enums import (
    MatchStatus,
    MatchType,
    ParticipantRole,
    ParticipantStatus,
    PlayMode,
    ScoreStatus,
    SportType,
)
from matches.models import Match, MatchParticipant
from scoring.models import Ranking, Score

User = get_user_model()


class ScoreTestMixin:
    """Shared setup for scoring tests."""

    def create_match_with_participants(
        self, *, sport=SportType.TENNIS, play_mode=PlayMode.COMPETITIVE,
        match_status=MatchStatus.COMPLETED,
    ):
        """Create a singles match with two accepted participants."""
        self.user1 = User.objects.create_user(
            email="player1@test.com",
            password="testpass123",
        )
        self.user2 = User.objects.create_user(
            email="player2@test.com",
            password="testpass123",
        )
        self.match = Match.objects.create(
            sport=sport,
            match_type=MatchType.SINGLES,
            play_mode=play_mode,
            status=match_status,
            scheduled_date=date(2026, 4, 20),
            scheduled_time=time(10, 0),
            created_by=self.user1,
            max_participants=2,
        )
        MatchParticipant.objects.create(
            match=self.match,
            player=self.user1.profile,
            role=ParticipantRole.CREATOR,
            status=ParticipantStatus.ACCEPTED,
        )
        MatchParticipant.objects.create(
            match=self.match,
            player=self.user2.profile,
            role=ParticipantRole.JOINED,
            status=ParticipantStatus.ACCEPTED,
        )


class SubmitScoreAPITests(ScoreTestMixin, TestCase):
    """Tests for POST /api/matches/:match_id/score/."""

    def setUp(self):
        self.client = APIClient()
        self.create_match_with_participants()
        self.client.force_authenticate(user=self.user1)
        self.url = f"/api/matches/{self.match.id}/score/"
        self.sets_data = [
            {"team_a": 6, "team_b": 4},
            {"team_a": 3, "team_b": 6},
            {"team_a": 7, "team_b": 5},
        ]

    def test_submit_score(self):
        """Submitting a valid score should return 201."""
        response = self.client.post(
            self.url,
            {"sets": self.sets_data},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], "pending")
        self.assertEqual(len(response.data["sets"]), 3)
        # User1 won 2 sets vs 1 -> user1 is winner
        self.assertEqual(
            response.data["winner"],
            str(self.user1.profile.id),
        )

    def test_non_participant_fails(self):
        """A user who is not a participant should get 400."""
        outsider = User.objects.create_user(
            email="outsider@test.com",
            password="testpass123",
        )
        self.client.force_authenticate(user=outsider)
        response = self.client.post(
            self.url,
            {"sets": self.sets_data},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("participant", response.data["detail"].lower())


class ConfirmScoreAPITests(ScoreTestMixin, TestCase):
    """Tests for POST /api/scores/:id/confirm/."""

    def setUp(self):
        self.client = APIClient()
        self.create_match_with_participants()
        # User1 submits score
        self.score = Score.objects.create(
            match=self.match,
            submitted_by=self.user1,
            sets=[{"team_a": 6, "team_b": 4}, {"team_a": 6, "team_b": 3}],
            winner=self.user1.profile,
            status=ScoreStatus.PENDING,
        )
        self.url = f"/api/scores/{self.score.id}/confirm/"

    def test_confirm_score(self):
        """The other participant should be able to confirm."""
        self.client.force_authenticate(user=self.user2)
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "confirmed")
        self.assertEqual(
            response.data["confirmed_by"],
            str(self.user2.id),
        )
        self.assertIsNotNone(response.data["confirmed_at"])

    def test_confirm_by_submitter_fails(self):
        """The submitter should not be able to confirm their own score."""
        self.client.force_authenticate(user=self.user1)
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("submit", response.data["detail"].lower())

    def test_ranking_updated_on_confirm(self):
        """Rankings should update when a competitive score is confirmed."""
        self.client.force_authenticate(user=self.user2)
        self.client.post(self.url)

        winner_ranking = Ranking.objects.get(
            player=self.user1.profile,
            sport=SportType.TENNIS,
        )
        loser_ranking = Ranking.objects.get(
            player=self.user2.profile,
            sport=SportType.TENNIS,
        )
        self.assertEqual(winner_ranking.points, 1025)
        self.assertEqual(winner_ranking.wins, 1)
        self.assertEqual(loser_ranking.points, 985)
        self.assertEqual(loser_ranking.losses, 1)

    def test_ranking_not_updated_on_friendly(self):
        """Rankings should NOT update for friendly matches."""
        # Create a friendly match with its own score
        friendly_match = Match.objects.create(
            sport=SportType.TENNIS,
            match_type=MatchType.SINGLES,
            play_mode=PlayMode.FRIENDLY,
            status=MatchStatus.COMPLETED,
            scheduled_date=date(2026, 4, 21),
            scheduled_time=time(14, 0),
            created_by=self.user1,
            max_participants=2,
        )
        MatchParticipant.objects.create(
            match=friendly_match,
            player=self.user1.profile,
            role=ParticipantRole.CREATOR,
            status=ParticipantStatus.ACCEPTED,
        )
        MatchParticipant.objects.create(
            match=friendly_match,
            player=self.user2.profile,
            role=ParticipantRole.JOINED,
            status=ParticipantStatus.ACCEPTED,
        )
        friendly_score = Score.objects.create(
            match=friendly_match,
            submitted_by=self.user1,
            sets=[{"team_a": 6, "team_b": 2}],
            winner=self.user1.profile,
            status=ScoreStatus.PENDING,
        )
        self.client.force_authenticate(user=self.user2)
        self.client.post(f"/api/scores/{friendly_score.id}/confirm/")

        # No Ranking objects should be created
        self.assertFalse(
            Ranking.objects.filter(player=self.user1.profile).exists()
        )


class DisputeScoreAPITests(ScoreTestMixin, TestCase):
    """Tests for POST /api/scores/:id/dispute/."""

    def setUp(self):
        self.client = APIClient()
        self.create_match_with_participants()
        self.score = Score.objects.create(
            match=self.match,
            submitted_by=self.user1,
            sets=[{"team_a": 6, "team_b": 4}],
            winner=self.user1.profile,
            status=ScoreStatus.PENDING,
        )
        self.url = f"/api/scores/{self.score.id}/dispute/"

    def test_dispute_score(self):
        """The other participant should be able to dispute."""
        self.client.force_authenticate(user=self.user2)
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "disputed")

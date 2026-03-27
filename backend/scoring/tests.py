from datetime import date, time, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
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
    TeamSide,
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


# ---------------------------------------------------------------------------
# Score validation tests (tennis & padel rules)
# ---------------------------------------------------------------------------


class TennisScoreValidationTests(ScoreTestMixin, TestCase):
    """Tests for tennis-specific score validation."""

    def setUp(self):
        self.client = APIClient()
        self.create_match_with_participants(sport=SportType.TENNIS)
        self.client.force_authenticate(user=self.user1)
        self.url = f"/api/matches/{self.match.id}/score/"

    def test_valid_tennis_score_2_0(self):
        """Valid 2-0 tennis score should succeed."""
        data = {"sets": [{"team_a": 6, "team_b": 4}, {"team_a": 6, "team_b": 2}]}
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_valid_tennis_score_2_1(self):
        """Valid 2-1 tennis score should succeed."""
        data = {"sets": [
            {"team_a": 6, "team_b": 4},
            {"team_a": 3, "team_b": 6},
            {"team_a": 7, "team_b": 5},
        ]}
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_valid_tiebreak_set(self):
        """7-6 tie-break set should be valid."""
        data = {"sets": [{"team_a": 7, "team_b": 6}, {"team_a": 6, "team_b": 3}]}
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_invalid_tennis_score_8_6(self):
        """8-6 is not a valid set score."""
        data = {"sets": [{"team_a": 8, "team_b": 6}]}
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_tennis_score_6_5(self):
        """6-5 is not a valid set score."""
        data = {"sets": [{"team_a": 6, "team_b": 5}]}
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_tennis_too_many_sets(self):
        """4 sets is not valid for tennis."""
        data = {"sets": [
            {"team_a": 6, "team_b": 4},
            {"team_a": 3, "team_b": 6},
            {"team_a": 6, "team_b": 2},
            {"team_a": 6, "team_b": 1},
        ]}
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_tennis_1_set(self):
        """Only 1 set is not enough for tennis."""
        data = {"sets": [{"team_a": 6, "team_b": 4}]}
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_tennis_no_winner(self):
        """2 sets with no clear winner (1-1) but no 3rd set."""
        data = {"sets": [
            {"team_a": 6, "team_b": 4},
            {"team_a": 4, "team_b": 6},
        ]}
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class PadelScoreValidationTests(ScoreTestMixin, TestCase):
    """Tests for padel-specific score validation (super tie-break)."""

    def setUp(self):
        self.client = APIClient()
        self.create_match_with_participants(sport=SportType.PADEL)
        self.client.force_authenticate(user=self.user1)
        self.url = f"/api/matches/{self.match.id}/score/"

    def test_valid_padel_2_0(self):
        """Padel 2-0 with regular sets should succeed."""
        data = {"sets": [{"team_a": 6, "team_b": 3}, {"team_a": 6, "team_b": 4}]}
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_valid_padel_super_tiebreak(self):
        """Padel 1-1 with valid super tie-break should succeed."""
        data = {"sets": [
            {"team_a": 6, "team_b": 3},
            {"team_a": 4, "team_b": 6},
            {"team_a": 10, "team_b": 7},
        ]}
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_valid_padel_super_tiebreak_close(self):
        """Super tie-break 11-9 should be valid."""
        data = {"sets": [
            {"team_a": 6, "team_b": 3},
            {"team_a": 4, "team_b": 6},
            {"team_a": 11, "team_b": 9},
        ]}
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_invalid_padel_super_tiebreak_no_margin(self):
        """Super tie-break 10-9 should fail (need 2 point margin)."""
        data = {"sets": [
            {"team_a": 6, "team_b": 3},
            {"team_a": 4, "team_b": 6},
            {"team_a": 10, "team_b": 9},
        ]}
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_padel_super_tiebreak_too_low(self):
        """Super tie-break 8-6 should fail (need at least 10)."""
        data = {"sets": [
            {"team_a": 6, "team_b": 3},
            {"team_a": 4, "team_b": 6},
            {"team_a": 8, "team_b": 6},
        ]}
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_padel_3rd_set_after_2_0(self):
        """Padel 2-0 should not have a 3rd set."""
        data = {"sets": [
            {"team_a": 6, "team_b": 3},
            {"team_a": 6, "team_b": 4},
            {"team_a": 10, "team_b": 7},
        ]}
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# Doubles scoring tests
# ---------------------------------------------------------------------------


class DoublesScoreTests(TestCase):
    """Tests for doubles-specific scoring logic (winning_team + ranking)."""

    def setUp(self):
        self.client = APIClient()
        self.user1 = User.objects.create_user(
            email="p1@test.com", password="testpass123",
        )
        self.user2 = User.objects.create_user(
            email="p2@test.com", password="testpass123",
        )
        self.user3 = User.objects.create_user(
            email="p3@test.com", password="testpass123",
        )
        self.user4 = User.objects.create_user(
            email="p4@test.com", password="testpass123",
        )
        self.match = Match.objects.create(
            sport=SportType.PADEL,
            match_type=MatchType.DOUBLES,
            play_mode=PlayMode.COMPETITIVE,
            status=MatchStatus.COMPLETED,
            scheduled_date=date(2026, 5, 1),
            scheduled_time=time(10, 0),
            created_by=self.user1,
            max_participants=4,
        )
        # Team A: user1, user2
        MatchParticipant.objects.create(
            match=self.match, player=self.user1.profile,
            role=ParticipantRole.CREATOR, status=ParticipantStatus.ACCEPTED,
            team=TeamSide.TEAM_A,
        )
        MatchParticipant.objects.create(
            match=self.match, player=self.user2.profile,
            role=ParticipantRole.JOINED, status=ParticipantStatus.ACCEPTED,
            team=TeamSide.TEAM_A,
        )
        # Team B: user3, user4
        MatchParticipant.objects.create(
            match=self.match, player=self.user3.profile,
            role=ParticipantRole.JOINED, status=ParticipantStatus.ACCEPTED,
            team=TeamSide.TEAM_B,
        )
        MatchParticipant.objects.create(
            match=self.match, player=self.user4.profile,
            role=ParticipantRole.JOINED, status=ParticipantStatus.ACCEPTED,
            team=TeamSide.TEAM_B,
        )
        self.url = f"/api/matches/{self.match.id}/score/"

    def test_doubles_winning_team_set(self):
        """Submitting a doubles score should set winning_team, not winner."""
        self.client.force_authenticate(user=self.user1)
        data = {"sets": [
            {"team_a": 6, "team_b": 3},
            {"team_a": 6, "team_b": 4},
        ]}
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["winning_team"], "team_a")
        self.assertIsNone(response.data["winner"])

    def test_doubles_winning_team_b(self):
        """Team B winning should set winning_team to team_b."""
        self.client.force_authenticate(user=self.user3)
        data = {"sets": [
            {"team_a": 3, "team_b": 6},
            {"team_a": 4, "team_b": 6},
        ]}
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["winning_team"], "team_b")
        self.assertIsNone(response.data["winner"])

    def test_doubles_ranking_update(self):
        """Rankings should update for all 4 players in doubles."""
        self.client.force_authenticate(user=self.user1)
        # Team A wins
        data = {"sets": [
            {"team_a": 6, "team_b": 3},
            {"team_a": 6, "team_b": 4},
        ]}
        self.client.post(self.url, data, format="json")
        score = Score.objects.get(match=self.match)

        # Confirm by a Team B player
        self.client.force_authenticate(user=self.user3)
        self.client.post(f"/api/scores/{score.id}/confirm/")

        # Team A players: +25 each
        for user in (self.user1, self.user2):
            r = Ranking.objects.get(player=user.profile, sport=SportType.PADEL)
            self.assertEqual(r.points, 1025)
            self.assertEqual(r.wins, 1)
            self.assertEqual(r.losses, 0)

        # Team B players: -15 each
        for user in (self.user3, self.user4):
            r = Ranking.objects.get(player=user.profile, sport=SportType.PADEL)
            self.assertEqual(r.points, 985)
            self.assertEqual(r.wins, 0)
            self.assertEqual(r.losses, 1)


# ---------------------------------------------------------------------------
# Auto-expire, admin resolve, resubmit tests
# ---------------------------------------------------------------------------


class AutoExpire24hTests(ScoreTestMixin, TestCase):
    """Tests for auto_expire_scores management command."""

    def setUp(self):
        self.client = APIClient()
        self.create_match_with_participants()
        self.score = Score.objects.create(
            match=self.match,
            submitted_by=self.user1,
            sets=[{"team_a": 6, "team_b": 4}, {"team_a": 6, "team_b": 3}],
            winner=self.user1.profile,
            status=ScoreStatus.PENDING,
        )

    def test_auto_expire_24h(self):
        """Pending score older than 24h should be expired by command."""
        # Manually set created_at to 25 hours ago
        Score.objects.filter(pk=self.score.pk).update(
            created_at=timezone.now() - timedelta(hours=25),
        )
        from django.core.management import call_command
        from io import StringIO
        out = StringIO()
        call_command("auto_expire_scores", stdout=out)
        self.score.refresh_from_db()
        self.assertEqual(self.score.status, ScoreStatus.EXPIRED)
        self.assertIn("1 score(s) expired", out.getvalue())

    def test_auto_expire_not_yet(self):
        """Pending score less than 24h old should NOT be expired."""
        from django.core.management import call_command
        from io import StringIO
        out = StringIO()
        call_command("auto_expire_scores", stdout=out)
        self.score.refresh_from_db()
        self.assertEqual(self.score.status, ScoreStatus.PENDING)
        self.assertIn("0 score(s) expired", out.getvalue())


class AdminResolveConfirmTests(ScoreTestMixin, TestCase):
    """Tests for POST /api/scores/:id/admin-resolve/ with action=confirm."""

    def setUp(self):
        self.client = APIClient()
        self.create_match_with_participants()
        self.admin = User.objects.create_superuser(
            email="admin@test.com",
            password="adminpass123",
        )
        self.score = Score.objects.create(
            match=self.match,
            submitted_by=self.user1,
            sets=[{"team_a": 6, "team_b": 4}, {"team_a": 6, "team_b": 3}],
            winner=self.user1.profile,
            status=ScoreStatus.DISPUTED,
        )
        self.url = f"/api/scores/{self.score.id}/admin-resolve/"

    def test_admin_resolve_confirm(self):
        """Admin confirm should set CONFIRMED and update ranking."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            self.url,
            {"action": "confirm", "admin_note": "Score correct"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "confirmed")
        self.assertEqual(response.data["admin_note"], "Score correct")
        # Ranking updated (competitive match)
        winner_ranking = Ranking.objects.get(
            player=self.user1.profile, sport=SportType.TENNIS,
        )
        self.assertEqual(winner_ranking.points, 1025)

    def test_admin_resolve_non_admin_forbidden(self):
        """Non-admin user should get 403."""
        self.client.force_authenticate(user=self.user1)
        response = self.client.post(
            self.url,
            {"action": "confirm"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class AdminResolveRejectTests(ScoreTestMixin, TestCase):
    """Tests for POST /api/scores/:id/admin-resolve/ with action=reject."""

    def setUp(self):
        self.client = APIClient()
        self.create_match_with_participants()
        self.admin = User.objects.create_superuser(
            email="admin@test.com",
            password="adminpass123",
        )
        self.score = Score.objects.create(
            match=self.match,
            submitted_by=self.user1,
            sets=[{"team_a": 6, "team_b": 4}, {"team_a": 6, "team_b": 3}],
            winner=self.user1.profile,
            status=ScoreStatus.DISPUTED,
        )
        self.url = f"/api/scores/{self.score.id}/admin-resolve/"

    def test_admin_resolve_reject(self):
        """Admin reject should set REJECTED."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            self.url,
            {"action": "reject", "admin_note": "Score incorrect"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "rejected")
        # No ranking update
        self.assertFalse(
            Ranking.objects.filter(player=self.user1.profile).exists()
        )


class ResubmitAfterExpireTests(ScoreTestMixin, TestCase):
    """Tests for re-submitting a score after EXPIRED or REJECTED."""

    def setUp(self):
        self.client = APIClient()
        self.create_match_with_participants()
        self.url = f"/api/matches/{self.match.id}/score/"
        self.sets_data = [
            {"team_a": 6, "team_b": 4},
            {"team_a": 6, "team_b": 3},
        ]

    def test_resubmit_after_expire(self):
        """Should be able to submit a new score after the old one expired."""
        Score.objects.create(
            match=self.match,
            submitted_by=self.user1,
            sets=[{"team_a": 6, "team_b": 4}, {"team_a": 6, "team_b": 3}],
            winner=self.user1.profile,
            status=ScoreStatus.EXPIRED,
        )
        self.client.force_authenticate(user=self.user1)
        response = self.client.post(
            self.url, {"sets": self.sets_data}, format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], "pending")
        # Only one score should exist now
        self.assertEqual(Score.objects.filter(match=self.match).count(), 1)

    def test_resubmit_after_reject(self):
        """Should be able to submit a new score after admin rejection."""
        Score.objects.create(
            match=self.match,
            submitted_by=self.user1,
            sets=[{"team_a": 6, "team_b": 4}, {"team_a": 6, "team_b": 3}],
            winner=self.user1.profile,
            status=ScoreStatus.REJECTED,
        )
        self.client.force_authenticate(user=self.user2)
        response = self.client.post(
            self.url, {"sets": self.sets_data}, format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Score.objects.filter(match=self.match).count(), 1)

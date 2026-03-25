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
    TeamSide,
)
from matches.models import Match, MatchParticipant
from scoring.models import Ranking, Score
from scoring.stats_service import StatsService

User = get_user_model()


class StatsServiceTests(TestCase):
    """Unit tests for StatsService."""

    def setUp(self):
        self.user1 = User.objects.create_user(email="p1@test.com", password="pass")
        self.user2 = User.objects.create_user(email="p2@test.com", password="pass")

    def _create_completed_match(self, sport=SportType.TENNIS, scheduled_date=None):
        match = Match.objects.create(
            sport=sport,
            match_type=MatchType.SINGLES,
            play_mode=PlayMode.COMPETITIVE,
            status=MatchStatus.COMPLETED,
            scheduled_date=scheduled_date or date(2026, 3, 15),
            scheduled_time=time(10, 0),
            created_by=self.user1,
            max_participants=2,
        )
        MatchParticipant.objects.create(
            match=match, player=self.user1.profile,
            role=ParticipantRole.CREATOR,
            status=ParticipantStatus.ACCEPTED,
            team=TeamSide.TEAM_A,
        )
        MatchParticipant.objects.create(
            match=match, player=self.user2.profile,
            role=ParticipantRole.JOINED,
            status=ParticipantStatus.ACCEPTED,
            team=TeamSide.TEAM_B,
        )
        return match

    def _create_score(self, match, winner, sets_data=None):
        return Score.objects.create(
            match=match,
            submitted_by=self.user1,
            sets=sets_data or [{"team_a": 6, "team_b": 4}, {"team_a": 6, "team_b": 3}],
            winner=winner,
            winning_team=TeamSide.TEAM_A if winner == self.user1.profile else TeamSide.TEAM_B,
            status=ScoreStatus.CONFIRMED,
        )

    def test_empty_stats(self):
        stats = StatsService.get_player_stats(self.user1.profile)
        self.assertEqual(stats["matches_played"], 0)
        self.assertEqual(stats["matches_won"], 0)
        self.assertEqual(stats["matches_lost"], 0)
        self.assertEqual(stats["win_rate"], 0)
        self.assertEqual(stats["current_streak"], 0)
        self.assertEqual(stats["best_streak"], 0)
        self.assertIsNone(stats["favorite_venue"])
        self.assertEqual(stats["matches_per_month"], [])

    def test_single_win(self):
        match = self._create_completed_match()
        self._create_score(match, self.user1.profile)

        stats = StatsService.get_player_stats(self.user1.profile)
        self.assertEqual(stats["matches_played"], 1)
        self.assertEqual(stats["matches_won"], 1)
        self.assertEqual(stats["matches_lost"], 0)
        self.assertEqual(stats["win_rate"], 100.0)
        self.assertEqual(stats["current_streak"], 1)
        self.assertEqual(stats["best_streak"], 1)

    def test_single_loss(self):
        match = self._create_completed_match()
        self._create_score(match, self.user2.profile)

        stats = StatsService.get_player_stats(self.user1.profile)
        self.assertEqual(stats["matches_played"], 1)
        self.assertEqual(stats["matches_won"], 0)
        self.assertEqual(stats["matches_lost"], 1)
        self.assertEqual(stats["win_rate"], 0.0)
        self.assertEqual(stats["current_streak"], 0)

    def test_sport_breakdown(self):
        m1 = self._create_completed_match(sport=SportType.TENNIS)
        self._create_score(m1, self.user1.profile)

        m2 = self._create_completed_match(sport=SportType.PADEL)
        self._create_score(m2, self.user2.profile,
                           sets_data=[{"team_a": 4, "team_b": 6}, {"team_a": 3, "team_b": 6}])

        stats = StatsService.get_player_stats(self.user1.profile)
        self.assertEqual(stats["matches_played"], 2)
        self.assertIn(SportType.TENNIS, stats["sports"])
        self.assertIn(SportType.PADEL, stats["sports"])
        self.assertEqual(stats["sports"][SportType.TENNIS]["matches_won"], 1)
        self.assertEqual(stats["sports"][SportType.PADEL]["matches_won"], 0)

    def test_sets_counting(self):
        match = self._create_completed_match()
        self._create_score(
            match, self.user1.profile,
            sets_data=[
                {"team_a": 6, "team_b": 4},
                {"team_a": 3, "team_b": 6},
                {"team_a": 7, "team_b": 5},
            ],
        )

        stats = StatsService.get_player_stats(self.user1.profile)
        tennis = stats["sports"][SportType.TENNIS]
        self.assertEqual(tennis["sets_won"], 2)
        self.assertEqual(tennis["sets_lost"], 1)

    def test_streak_tracking(self):
        for i in range(3):
            m = self._create_completed_match(
                scheduled_date=date(2026, 3, 10 + i),
            )
            self._create_score(m, self.user1.profile)

        m4 = self._create_completed_match(scheduled_date=date(2026, 3, 20))
        self._create_score(m4, self.user2.profile,
                           sets_data=[{"team_a": 4, "team_b": 6}, {"team_a": 3, "team_b": 6}])

        m5 = self._create_completed_match(scheduled_date=date(2026, 3, 25))
        self._create_score(m5, self.user1.profile)

        stats = StatsService.get_player_stats(self.user1.profile)
        self.assertEqual(stats["best_streak"], 3)
        self.assertEqual(stats["current_streak"], 1)

    def test_matches_per_month(self):
        m1 = self._create_completed_match(scheduled_date=date(2026, 1, 10))
        self._create_score(m1, self.user1.profile)
        m2 = self._create_completed_match(scheduled_date=date(2026, 1, 20))
        self._create_score(m2, self.user1.profile)
        m3 = self._create_completed_match(scheduled_date=date(2026, 3, 5))
        self._create_score(m3, self.user1.profile)

        stats = StatsService.get_player_stats(self.user1.profile)
        mpm = stats["matches_per_month"]
        self.assertEqual(len(mpm), 2)
        self.assertEqual(mpm[0]["month"], "2026-01")
        self.assertEqual(mpm[0]["count"], 2)
        self.assertEqual(mpm[1]["month"], "2026-03")
        self.assertEqual(mpm[1]["count"], 1)

    def test_points_evolution(self):
        Ranking.objects.create(
            player=self.user1.profile,
            sport=SportType.TENNIS,
            points=1050,
            wins=2,
            losses=0,
        )
        stats = StatsService.get_player_stats(self.user1.profile)
        pe = stats["points_evolution"]
        self.assertIn(SportType.TENNIS, pe)
        self.assertEqual(pe[SportType.TENNIS][0]["points"], 1050)

    def test_pending_scores_excluded(self):
        match = self._create_completed_match()
        Score.objects.create(
            match=match,
            submitted_by=self.user1,
            sets=[{"team_a": 6, "team_b": 4}, {"team_a": 6, "team_b": 3}],
            winner=self.user1.profile,
            winning_team=TeamSide.TEAM_A,
            status=ScoreStatus.PENDING,
        )
        stats = StatsService.get_player_stats(self.user1.profile)
        self.assertEqual(stats["matches_played"], 0)


class StatsAPITests(TestCase):
    """Tests for stats API endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(email="api@test.com", password="pass")
        self.client.force_authenticate(user=self.user)

    def test_my_stats_endpoint(self):
        response = self.client.get("/api/stats/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("matches_played", response.data)
        self.assertIn("sports", response.data)
        self.assertIn("current_streak", response.data)
        self.assertIn("best_streak", response.data)
        self.assertIn("favorite_venue", response.data)
        self.assertIn("matches_per_month", response.data)
        self.assertIn("points_evolution", response.data)

    def test_player_stats_endpoint(self):
        other = User.objects.create_user(email="other@test.com", password="pass")
        response = self.client.get(f"/api/stats/{other.profile.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("matches_played", response.data)

    def test_player_stats_not_found(self):
        import uuid
        response = self.client.get(f"/api/stats/{uuid.uuid4()}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthenticated(self):
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/stats/me/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

"""
N+1 Query regression tests.

Verifies that list endpoints use ≤ 5 SQL queries regardless of row count.
"""

from datetime import date, time, timedelta

from django.test import TestCase, override_settings
from django.test.utils import CaptureQueriesContext
from django.db import connection
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User, PlayerProfile
from core.enums import (
    MatchStatus,
    MatchType,
    ParticipantRole,
    ParticipantStatus,
    PlayMode,
    SkillLevel,
    SportType,
    TeamSide,
)
from matches.models import Match, MatchParticipant, OpenMatch


MAX_QUERIES = 5  # hard ceiling


def _create_user(email):
    user = User.objects.create_user(email=email, password="TestPass123!")
    profile = user.profile
    profile.first_name = email.split("@")[0]
    profile.last_name = "Test"
    profile.pseudo = email.split("@")[0]
    profile.birth_date = date(2000, 1, 1)
    profile.skill_level = SkillLevel.INTERMEDIATE
    profile.city = "Lausanne"
    profile.favorite_sport = SportType.PADEL
    profile.save()
    return user


def _auth(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@override_settings(
    CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}},
)
class MatchListN1Test(TestCase):
    """GET /api/matches/ must stay ≤ MAX_QUERIES even with 20 matches × 4 participants."""

    @classmethod
    def setUpTestData(cls):
        cls.users = [_create_user(f"player{i}@test.com") for i in range(20)]
        cls.client_user = cls.users[0]

        # Create 20 matches, each with 4 participants
        for i in range(20):
            creator = cls.users[i % len(cls.users)]
            match = Match.objects.create(
                sport=SportType.PADEL,
                match_type=MatchType.DOUBLES,
                play_mode=PlayMode.FRIENDLY,
                scheduled_date=date(2026, 6, 1) + timedelta(days=i),
                scheduled_time=time(10, 0),
                created_by=creator,
                max_participants=4,
                status=MatchStatus.CONFIRMED,
            )
            for j in range(4):
                player = cls.users[(i + j) % len(cls.users)]
                MatchParticipant.objects.create(
                    match=match,
                    player=player.profile,
                    role=ParticipantRole.JOINED,
                    status=ParticipantStatus.ACCEPTED,
                    team=TeamSide.TEAM_A if j < 2 else TeamSide.TEAM_B,
                )

    def test_match_list_queries(self):
        client = _auth(self.client_user)
        with CaptureQueriesContext(connection) as ctx:
            resp = client.get("/api/matches/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        n = len(ctx)
        self.assertLessEqual(
            n, MAX_QUERIES,
            f"MatchListView fired {n} queries (max {MAX_QUERIES}):\n"
            + "\n".join(q["sql"][:120] for q in ctx.captured_queries),
        )

    def test_my_matches_queries(self):
        # Make sure user is participant in some matches
        client = _auth(self.client_user)
        with CaptureQueriesContext(connection) as ctx:
            resp = client.get("/api/matches/my/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        n = len(ctx)
        self.assertLessEqual(
            n, MAX_QUERIES,
            f"MyMatchesView fired {n} queries (max {MAX_QUERIES}):\n"
            + "\n".join(q["sql"][:120] for q in ctx.captured_queries),
        )

    def test_match_detail_queries(self):
        match = Match.objects.first()
        client = _auth(self.client_user)
        with CaptureQueriesContext(connection) as ctx:
            resp = client.get(f"/api/matches/{match.pk}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        n = len(ctx)
        self.assertLessEqual(
            n, MAX_QUERIES,
            f"MatchDetailView fired {n} queries (max {MAX_QUERIES}):\n"
            + "\n".join(q["sql"][:120] for q in ctx.captured_queries),
        )


@override_settings(
    CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}},
)
class OpenMatchListN1Test(TestCase):
    """GET /api/matches/open/ must stay ≤ MAX_QUERIES."""

    @classmethod
    def setUpTestData(cls):
        cls.users = [_create_user(f"open{i}@test.com") for i in range(10)]

        for i in range(15):
            creator = cls.users[i % len(cls.users)]
            match = Match.objects.create(
                sport=SportType.PADEL,
                match_type=MatchType.DOUBLES,
                play_mode=PlayMode.FRIENDLY,
                scheduled_date=date(2026, 7, 1) + timedelta(days=i),
                scheduled_time=time(14, 0),
                created_by=creator,
                max_participants=4,
                status=MatchStatus.OPEN,
            )
            OpenMatch.objects.create(
                match=match,
                required_level_min=SkillLevel.BEGINNER,
                required_level_max=SkillLevel.ADVANCED,
                expires_at=timezone.now() + timedelta(days=30),
            )
            for j in range(2):
                player = cls.users[(i + j) % len(cls.users)]
                MatchParticipant.objects.create(
                    match=match,
                    player=player.profile,
                    role=ParticipantRole.JOINED,
                    status=ParticipantStatus.ACCEPTED,
                    team=TeamSide.TEAM_A,
                )

    def test_open_match_list_queries(self):
        client = _auth(self.users[0])
        with CaptureQueriesContext(connection) as ctx:
            resp = client.get("/api/matches/open/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        n = len(ctx)
        self.assertLessEqual(
            n, MAX_QUERIES,
            f"OpenMatchListView fired {n} queries (max {MAX_QUERIES}):\n"
            + "\n".join(q["sql"][:120] for q in ctx.captured_queries),
        )

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
    SkillLevel,
    SportType,
)
from matches.models import Match, MatchParticipant, OpenMatch

User = get_user_model()


class MatchModelTests(TestCase):
    """Tests for Match and MatchParticipant models."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="creator@test.com",
            password="testpass123",
        )

    def test_match_str(self):
        match = Match.objects.create(
            sport=SportType.TENNIS,
            match_type=MatchType.SINGLES,
            play_mode=PlayMode.FRIENDLY,
            scheduled_date=date(2026, 4, 10),
            scheduled_time=time(10, 0),
            created_by=self.user,
            max_participants=2,
        )
        self.assertIn("Tennis", str(match))
        self.assertIn("Singles", str(match))

    def test_auto_max_participants_singles(self):
        match = Match.objects.create(
            sport=SportType.TENNIS,
            match_type=MatchType.SINGLES,
            play_mode=PlayMode.FRIENDLY,
            scheduled_date=date(2026, 4, 10),
            scheduled_time=time(10, 0),
            created_by=self.user,
            max_participants=0,
        )
        self.assertEqual(match.max_participants, 2)

    def test_auto_max_participants_doubles(self):
        match = Match.objects.create(
            sport=SportType.PADEL,
            match_type=MatchType.DOUBLES,
            play_mode=PlayMode.COMPETITIVE,
            scheduled_date=date(2026, 4, 10),
            scheduled_time=time(14, 0),
            created_by=self.user,
            max_participants=0,
        )
        self.assertEqual(match.max_participants, 4)

    def test_is_full_property(self):
        match = Match.objects.create(
            sport=SportType.TENNIS,
            match_type=MatchType.SINGLES,
            play_mode=PlayMode.FRIENDLY,
            scheduled_date=date(2026, 4, 10),
            scheduled_time=time(10, 0),
            created_by=self.user,
            max_participants=2,
        )
        self.assertFalse(match.is_full)
        # Add 2 accepted participants
        user2 = User.objects.create_user(email="p2@test.com", password="pass123")
        MatchParticipant.objects.create(
            match=match,
            player=self.user.profile,
            role=ParticipantRole.CREATOR,
            status=ParticipantStatus.ACCEPTED,
        )
        MatchParticipant.objects.create(
            match=match,
            player=user2.profile,
            role=ParticipantRole.JOINED,
            status=ParticipantStatus.ACCEPTED,
        )
        self.assertTrue(match.is_full)
        self.assertEqual(match.current_participants_count, 2)


class CreateMatchAPITests(TestCase):
    """Tests for POST /api/matches/create/."""

    def setUp(self):
        self.client = APIClient()
        self.url = "/api/matches/create/"
        self.user = User.objects.create_user(
            email="creator@test.com",
            password="testpass123",
        )
        self.client.force_authenticate(user=self.user)

    def test_create_match(self):
        """Creating a match should return 201 with creator as participant."""
        data = {
            "sport": "tennis",
            "match_type": "singles",
            "play_mode": "friendly",
            "scheduled_date": "2026-04-15",
            "scheduled_time": "10:00",
        }
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["sport"], "tennis")
        self.assertEqual(response.data["max_participants"], 2)
        self.assertEqual(response.data["current_participants_count"], 1)
        # Creator is first participant
        self.assertEqual(len(response.data["participants"]), 1)
        participant = response.data["participants"][0]
        self.assertEqual(participant["role"], "creator")
        self.assertEqual(participant["status"], "accepted")

    def test_create_doubles_match(self):
        """Doubles match should have max_participants=4."""
        data = {
            "sport": "padel",
            "match_type": "doubles",
            "play_mode": "competitive",
            "scheduled_date": "2026-04-15",
            "scheduled_time": "14:00",
        }
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["max_participants"], 4)

    def test_create_padel_singles_fails(self):
        """Padel singles should be rejected (padel is always doubles)."""
        data = {
            "sport": "padel",
            "match_type": "singles",
            "play_mode": "friendly",
            "scheduled_date": "2026-04-15",
            "scheduled_time": "10:00",
        }
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_tennis_singles_succeeds(self):
        """Tennis singles should still be allowed."""
        data = {
            "sport": "tennis",
            "match_type": "singles",
            "play_mode": "friendly",
            "scheduled_date": "2026-04-15",
            "scheduled_time": "10:00",
        }
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["max_participants"], 2)


class JoinMatchAPITests(TestCase):
    """Tests for POST /api/matches/:id/join/."""

    def setUp(self):
        self.client = APIClient()
        self.creator = User.objects.create_user(
            email="creator@test.com",
            password="testpass123",
        )
        self.joiner = User.objects.create_user(
            email="joiner@test.com",
            password="testpass123",
        )
        # Create a singles match with creator as participant
        self.match = Match.objects.create(
            sport=SportType.TENNIS,
            match_type=MatchType.SINGLES,
            play_mode=PlayMode.FRIENDLY,
            scheduled_date=date(2026, 4, 15),
            scheduled_time=time(10, 0),
            created_by=self.creator,
            max_participants=2,
        )
        MatchParticipant.objects.create(
            match=self.match,
            player=self.creator.profile,
            role=ParticipantRole.CREATOR,
            status=ParticipantStatus.ACCEPTED,
        )

    def test_join_match(self):
        """Joining a match should add the user as accepted participant."""
        self.client.force_authenticate(user=self.joiner)
        url = f"/api/matches/{self.match.id}/join/"
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["current_participants_count"], 2)
        self.assertEqual(len(response.data["participants"]), 2)

    def test_join_singles_auto_confirms(self):
        """Joining a singles match that becomes full should auto-confirm."""
        self.client.force_authenticate(user=self.joiner)
        url = f"/api/matches/{self.match.id}/join/"
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "confirmed")
        self.match.refresh_from_db()
        self.assertEqual(self.match.status, MatchStatus.CONFIRMED)

    def test_join_full_match_fails(self):
        """Joining a full match should return 400."""
        # Fill the match first
        MatchParticipant.objects.create(
            match=self.match,
            player=self.joiner.profile,
            role=ParticipantRole.JOINED,
            status=ParticipantStatus.ACCEPTED,
        )
        third_user = User.objects.create_user(
            email="third@test.com",
            password="testpass123",
        )
        self.client.force_authenticate(user=third_user)
        url = f"/api/matches/{self.match.id}/join/"
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("full", response.data["detail"].lower())

    def test_join_twice_fails(self):
        """Joining the same match twice should return 400."""
        self.client.force_authenticate(user=self.joiner)
        url = f"/api/matches/{self.match.id}/join/"
        self.client.post(url)  # First join
        response = self.client.post(url)  # Second join
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already", response.data["detail"].lower())


class MyMatchesAPITests(TestCase):
    """Tests for GET /api/matches/my/."""

    def setUp(self):
        self.client = APIClient()
        self.url = "/api/matches/my/"
        self.user = User.objects.create_user(
            email="player@test.com",
            password="testpass123",
        )
        self.other_user = User.objects.create_user(
            email="other@test.com",
            password="testpass123",
        )
        self.client.force_authenticate(user=self.user)

        # Match where user is participant
        self.my_match = Match.objects.create(
            sport=SportType.TENNIS,
            match_type=MatchType.SINGLES,
            play_mode=PlayMode.FRIENDLY,
            scheduled_date=date(2026, 5, 1),
            scheduled_time=time(9, 0),
            created_by=self.user,
            max_participants=2,
        )
        MatchParticipant.objects.create(
            match=self.my_match,
            player=self.user.profile,
            role=ParticipantRole.CREATOR,
            status=ParticipantStatus.ACCEPTED,
        )

        # Match where user is NOT participant
        other_match = Match.objects.create(
            sport=SportType.PADEL,
            match_type=MatchType.DOUBLES,
            play_mode=PlayMode.COMPETITIVE,
            scheduled_date=date(2026, 5, 2),
            scheduled_time=time(14, 0),
            created_by=self.other_user,
            max_participants=4,
        )
        MatchParticipant.objects.create(
            match=other_match,
            player=self.other_user.profile,
            role=ParticipantRole.CREATOR,
            status=ParticipantStatus.ACCEPTED,
        )

    def test_my_matches(self):
        """Should only return matches where user is a participant."""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], str(self.my_match.id))


# ---------------------------------------------------------------------------
# OpenMatch tests
# ---------------------------------------------------------------------------


class CreateOpenMatchAPITests(TestCase):
    """Tests for POST /api/matches/open/create/."""

    def setUp(self):
        self.client = APIClient()
        self.url = "/api/matches/open/create/"
        self.user = User.objects.create_user(
            email="creator@test.com",
            password="testpass123",
        )
        self.client.force_authenticate(user=self.user)

    def test_create_open_match(self):
        """Creating an open match should return 201 with status OPEN."""
        data = {
            "sport": "tennis",
            "match_type": "singles",
            "play_mode": "friendly",
            "scheduled_date": "2026-04-20",
            "scheduled_time": "10:00",
            "required_level_min": "beginner",
            "required_level_max": "intermediate",
            "description": "Friendly tennis match in Geneva",
            "expires_at": (timezone.now() + timedelta(days=3)).isoformat(),
        }
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["sport"], "tennis")
        self.assertEqual(response.data["status"], "open")
        self.assertEqual(response.data["required_level_min"], "beginner")
        self.assertEqual(response.data["required_level_max"], "intermediate")
        self.assertEqual(response.data["spots_left"], 1)
        self.assertEqual(len(response.data["participants"]), 1)

    def test_create_open_padel_singles_fails(self):
        """Padel singles open match should be rejected."""
        data = {
            "sport": "padel",
            "match_type": "singles",
            "play_mode": "friendly",
            "scheduled_date": "2026-04-20",
            "scheduled_time": "10:00",
            "description": "Should fail",
            "expires_at": (timezone.now() + timedelta(days=3)).isoformat(),
        }
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class JoinOpenMatchAPITests(TestCase):
    """Tests for POST /api/matches/open/:id/join/."""

    def setUp(self):
        self.client = APIClient()
        self.creator = User.objects.create_user(
            email="creator@test.com",
            password="testpass123",
        )
        self.joiner = User.objects.create_user(
            email="joiner@test.com",
            password="testpass123",
        )
        # Set joiner level to intermediate tennis
        self.joiner.profile.level_tennis = SkillLevel.INTERMEDIATE
        self.joiner.profile.save()

        # Create an open singles match
        self.match = Match.objects.create(
            sport=SportType.TENNIS,
            match_type=MatchType.SINGLES,
            play_mode=PlayMode.FRIENDLY,
            scheduled_date=date(2026, 4, 20),
            scheduled_time=time(10, 0),
            created_by=self.creator,
            max_participants=2,
            status=MatchStatus.OPEN,
        )
        self.open_match = OpenMatch.objects.create(
            match=self.match,
            required_level_min=SkillLevel.BEGINNER,
            required_level_max=SkillLevel.ADVANCED,
            description="Friendly match in Geneva",
            expires_at=timezone.now() + timedelta(days=3),
        )
        MatchParticipant.objects.create(
            match=self.match,
            player=self.creator.profile,
            role=ParticipantRole.CREATOR,
            status=ParticipantStatus.ACCEPTED,
        )

    def test_join_open_match(self):
        """Joining an open match should add the user as accepted participant."""
        self.client.force_authenticate(user=self.joiner)
        url = f"/api/matches/open/{self.open_match.id}/join/"
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["spots_left"], 0)
        self.assertEqual(len(response.data["participants"]), 2)

    def test_join_full_fails(self):
        """Joining a full open match should return 400."""
        # Fill the match first
        MatchParticipant.objects.create(
            match=self.match,
            player=self.joiner.profile,
            role=ParticipantRole.JOINED,
            status=ParticipantStatus.ACCEPTED,
        )
        third_user = User.objects.create_user(
            email="third@test.com",
            password="testpass123",
        )
        self.client.force_authenticate(user=third_user)
        url = f"/api/matches/open/{self.open_match.id}/join/"
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("full", response.data["detail"].lower())

    def test_join_expired_fails(self):
        """Joining an expired open match should return 400."""
        self.open_match.expires_at = timezone.now() - timedelta(hours=1)
        self.open_match.save()
        self.client.force_authenticate(user=self.joiner)
        url = f"/api/matches/open/{self.open_match.id}/join/"
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("expired", response.data["detail"].lower())

    def test_level_filter(self):
        """Joining with a skill level outside range should return 400."""
        # Set required to advanced only
        self.open_match.required_level_min = SkillLevel.ADVANCED
        self.open_match.required_level_max = SkillLevel.ADVANCED
        self.open_match.save()
        # Joiner is intermediate -> too low
        self.client.force_authenticate(user=self.joiner)
        url = f"/api/matches/open/{self.open_match.id}/join/"
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("level", response.data["detail"].lower())

    def test_auto_confirm_when_full(self):
        """Match should auto-confirm when the last spot is taken."""
        self.client.force_authenticate(user=self.joiner)
        url = f"/api/matches/open/{self.open_match.id}/join/"
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "confirmed")
        self.match.refresh_from_db()
        self.assertEqual(self.match.status, MatchStatus.CONFIRMED)


class OpenMatchListAPITests(TestCase):
    """Tests for GET /api/matches/open/."""

    def setUp(self):
        self.client = APIClient()
        self.url = "/api/matches/open/"
        self.user = User.objects.create_user(
            email="viewer@test.com",
            password="testpass123",
        )
        self.client.force_authenticate(user=self.user)

        creator = User.objects.create_user(
            email="creator@test.com",
            password="testpass123",
        )

        # Active open match
        match1 = Match.objects.create(
            sport=SportType.TENNIS,
            match_type=MatchType.SINGLES,
            play_mode=PlayMode.FRIENDLY,
            scheduled_date=date(2026, 5, 1),
            scheduled_time=time(10, 0),
            created_by=creator,
            max_participants=2,
            status=MatchStatus.OPEN,
        )
        OpenMatch.objects.create(
            match=match1,
            description="Active match",
            expires_at=timezone.now() + timedelta(days=2),
        )
        MatchParticipant.objects.create(
            match=match1,
            player=creator.profile,
            role=ParticipantRole.CREATOR,
            status=ParticipantStatus.ACCEPTED,
        )

        # Expired open match (should not appear)
        match2 = Match.objects.create(
            sport=SportType.PADEL,
            match_type=MatchType.DOUBLES,
            play_mode=PlayMode.COMPETITIVE,
            scheduled_date=date(2026, 5, 2),
            scheduled_time=time(14, 0),
            created_by=creator,
            max_participants=4,
            status=MatchStatus.OPEN,
        )
        OpenMatch.objects.create(
            match=match2,
            description="Expired match",
            expires_at=timezone.now() - timedelta(hours=1),
        )

    def test_list_open_matches(self):
        """Should only return non-expired OPEN matches."""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["description"], "Active match")

    def test_filter_by_sport(self):
        """Filtering by sport should return matching open matches."""
        response = self.client.get(self.url, {"sport": "padel"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["results"]
        # Padel match is expired, so 0 results
        self.assertEqual(len(results), 0)


class MatchStatusTransitionTests(TestCase):
    """Tests for match status transition validation."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="transition@test.com",
            password="testpass123",
        )
        self.client.force_authenticate(user=self.user)
        self.match = Match.objects.create(
            sport=SportType.TENNIS,
            match_type=MatchType.SINGLES,
            play_mode=PlayMode.FRIENDLY,
            scheduled_date=date(2026, 6, 1),
            scheduled_time=time(10, 0),
            created_by=self.user,
            max_participants=2,
        )

    def _change_status_url(self):
        return f"/api/matches/{self.match.pk}/change-status/"

    def test_valid_transition_draft_to_open(self):
        """DRAFT -> OPEN should succeed."""
        response = self.client.post(
            self._change_status_url(), {"status": MatchStatus.OPEN}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.match.refresh_from_db()
        self.assertEqual(self.match.status, MatchStatus.OPEN)

    def test_valid_transition_draft_to_confirmed(self):
        """DRAFT -> CONFIRMED should succeed."""
        response = self.client.post(
            self._change_status_url(), {"status": MatchStatus.CONFIRMED}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.match.refresh_from_db()
        self.assertEqual(self.match.status, MatchStatus.CONFIRMED)

    def test_valid_transition_confirmed_to_in_progress(self):
        """CONFIRMED -> IN_PROGRESS should succeed."""
        self.match.status = MatchStatus.CONFIRMED
        self.match.save()
        response = self.client.post(
            self._change_status_url(), {"status": MatchStatus.IN_PROGRESS}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.match.refresh_from_db()
        self.assertEqual(self.match.status, MatchStatus.IN_PROGRESS)

    def test_valid_transition_in_progress_to_completed(self):
        """IN_PROGRESS -> COMPLETED should succeed."""
        self.match.status = MatchStatus.IN_PROGRESS
        self.match.save()
        response = self.client.post(
            self._change_status_url(), {"status": MatchStatus.COMPLETED}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.match.refresh_from_db()
        self.assertEqual(self.match.status, MatchStatus.COMPLETED)

    def test_invalid_transition_completed_to_draft(self):
        """COMPLETED -> DRAFT should be rejected."""
        self.match.status = MatchStatus.COMPLETED
        self.match.save()
        response = self.client.post(
            self._change_status_url(), {"status": MatchStatus.DRAFT}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Cannot transition", response.data["detail"])
        self.match.refresh_from_db()
        self.assertEqual(self.match.status, MatchStatus.COMPLETED)

    def test_invalid_transition_cancelled_to_open(self):
        """CANCELLED -> OPEN should be rejected."""
        self.match.status = MatchStatus.CANCELLED
        self.match.save()
        response = self.client.post(
            self._change_status_url(), {"status": MatchStatus.OPEN}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.match.refresh_from_db()
        self.assertEqual(self.match.status, MatchStatus.CANCELLED)

    def test_can_transition_to_method(self):
        """Model method should correctly report allowed transitions."""
        self.assertTrue(self.match.can_transition_to(MatchStatus.OPEN))
        self.assertTrue(self.match.can_transition_to(MatchStatus.CONFIRMED))
        self.assertFalse(self.match.can_transition_to(MatchStatus.COMPLETED))
        self.assertFalse(self.match.can_transition_to(MatchStatus.IN_PROGRESS))

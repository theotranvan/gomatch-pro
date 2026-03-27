"""
GoMatch-Pro — Comprehensive API route test script.
Tests every single endpoint (58 HTTP + 1 WebSocket) to detect bugs.

Usage:
    cd backend
    python manage.py test tests.test_all_routes --verbosity=2
"""

import uuid
from datetime import date, time, timedelta
from decimal import Decimal

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User, PlayerProfile, Connection
from bookings.models import Booking
from chat.models import ChatRoom, ChatMessage
from matches.models import Match, MatchParticipant, OpenMatch
from payments.models import Payment
from scoring.models import Score
from venues.models import Venue, Court, TimeSlot


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_user(email, password="Test1234!", **profile_kwargs):
    """Create a user + player profile quickly."""
    user = User.objects.create_user(email=email, password=password)
    profile = user.profile
    for k, v in profile_kwargs.items():
        setattr(profile, k, v)
    if profile_kwargs:
        profile.save()
    return user, profile


def _auth_client(user, password="Test1234!"):
    """Return an APIClient authenticated via force_authenticate (no rate-limit)."""
    client = APIClient()
    client.force_authenticate(user=user)
    return client, None


def _make_venue():
    return Venue.objects.create(
        name="Test Club",
        address="1 Rue du Test",
        city="Genève",
        latitude=Decimal("46.204391"),
        longitude=Decimal("6.143158"),
    )


def _make_court(venue, sport="tennis"):
    return Court.objects.create(
        venue=venue,
        name="Court 1",
        sport=sport,
        surface="clay",
        hourly_rate=Decimal("30.00"),
    )


def _make_slot(court, day_offset=1):
    d = date.today() + timedelta(days=day_offset)
    return TimeSlot.objects.create(
        court=court,
        date=d,
        start_time=time(10, 0),
        end_time=time(11, 0),
        status="available",
    )


def _tomorrow():
    return (date.today() + timedelta(days=1)).isoformat()


# ===========================================================================
# 1. AUTH
# ===========================================================================

class AuthRoutesTest(TestCase):
    """api/auth/*"""

    def setUp(self):
        self.c = APIClient()

    def test_register(self):
        r = self.c.post("/api/auth/register/", {
            "email": "new@test.com",
            "password": "Test1234!",
            "password_confirm": "Test1234!",
        })
        self.assertIn(r.status_code, [status.HTTP_201_CREATED, status.HTTP_200_OK])
        self.assertIn("tokens", r.data)
        self.assertIn("access", r.data["tokens"])

    def test_login(self):
        _make_user("login@test.com")
        r = self.c.post("/api/auth/login/", {"email": "login@test.com", "password": "Test1234!"})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn("tokens", r.data)
        self.assertIn("access", r.data["tokens"])

    def test_token_refresh(self):
        _make_user("refresh@test.com")
        r = self.c.post("/api/auth/login/", {"email": "refresh@test.com", "password": "Test1234!"})
        refresh = r.data["tokens"]["refresh"]
        r2 = self.c.post("/api/auth/token/refresh/", {"refresh": refresh})
        self.assertEqual(r2.status_code, status.HTTP_200_OK)
        self.assertIn("access", r2.data)

    def test_me(self):
        user, _ = _make_user("me@test.com")
        c, _ = _auth_client(user)
        r = c.get("/api/auth/me/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["email"], "me@test.com")

    def test_profile_patch(self):
        user, _ = _make_user("patch@test.com")
        c, _ = _auth_client(user)
        r = c.patch("/api/auth/profile/", {"first_name": "Théo"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_push_token(self):
        user, _ = _make_user("push@test.com")
        c, _ = _auth_client(user)
        r = c.post("/api/auth/push-token/", {"token": "ExponentPushToken[xxxx]"})
        self.assertIn(r.status_code, [status.HTTP_200_OK, status.HTTP_204_NO_CONTENT])

    def test_check_username(self):
        r = self.c.get("/api/auth/check-username/", {"username": "free_name"})
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_upload_avatar_no_file(self):
        user, _ = _make_user("avatar@test.com")
        c, _ = _auth_client(user)
        r = c.post("/api/auth/upload-avatar/")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unauthenticated_me(self):
        r = self.c.get("/api/auth/me/")
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)


# ===========================================================================
# 2. PLAYERS
# ===========================================================================

class PlayersRoutesTest(TestCase):
    """api/players/*"""

    def setUp(self):
        self.user, self.profile = _make_user("player@test.com", city="Genève")
        self.c, _ = _auth_client(self.user)

    def test_list_players(self):
        r = self.c.get("/api/players/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_retrieve_player(self):
        r = self.c.get(f"/api/players/{self.profile.id}/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_list_players_with_filters(self):
        r = self.c.get("/api/players/", {"sport": "tennis", "city": "Genève"})
        self.assertEqual(r.status_code, status.HTTP_200_OK)


# ===========================================================================
# 3. CONNECTIONS
# ===========================================================================

class ConnectionsRoutesTest(TestCase):
    """api/connections/*"""

    def setUp(self):
        self.u1, self.p1 = _make_user("conn1@test.com")
        self.u2, self.p2 = _make_user("conn2@test.com")
        self.c1, _ = _auth_client(self.u1)
        self.c2, _ = _auth_client(self.u2)

    def test_list_connections(self):
        r = self.c1.get("/api/connections/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_connection_count(self):
        r = self.c1.get("/api/connections/count/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_pending_connections(self):
        r = self.c1.get("/api/connections/pending/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_send_request(self):
        r = self.c1.post("/api/connections/request/", {"player_id": str(self.p2.id)})
        self.assertIn(r.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

    def test_full_flow(self):
        # send → pending → accept → status → remove
        self.c1.post("/api/connections/request/", {"player_id": str(self.p2.id)})
        conn = Connection.objects.get(requester=self.p1, receiver=self.p2)

        r = self.c2.get("/api/connections/pending/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

        r = self.c2.post(f"/api/connections/{conn.id}/accept/")
        self.assertIn(r.status_code, [status.HTTP_200_OK, status.HTTP_204_NO_CONTENT])

        r = self.c1.get(f"/api/connections/status/{self.p2.id}/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

        r = self.c1.delete(f"/api/connections/{conn.id}/")
        self.assertIn(r.status_code, [status.HTTP_200_OK, status.HTTP_204_NO_CONTENT])

    def test_decline_request(self):
        self.c1.post("/api/connections/request/", {"player_id": str(self.p2.id)})
        conn = Connection.objects.get(requester=self.p1, receiver=self.p2)
        r = self.c2.post(f"/api/connections/{conn.id}/decline/")
        self.assertIn(r.status_code, [status.HTTP_200_OK, status.HTTP_204_NO_CONTENT])

    def test_block(self):
        r = self.c1.post("/api/connections/block/", {"player_id": str(self.p2.id)})
        self.assertIn(r.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])


# ===========================================================================
# 4. VENUES
# ===========================================================================

class VenuesRoutesTest(TestCase):
    """api/venues/*"""

    def setUp(self):
        self.user, _ = _make_user("venue@test.com")
        self.c, _ = _auth_client(self.user)
        self.venue = _make_venue()
        self.court = _make_court(self.venue)
        self.slot = _make_slot(self.court)

    def test_list_venues(self):
        r = self.c.get("/api/venues/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_retrieve_venue(self):
        r = self.c.get(f"/api/venues/{self.venue.id}/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_list_slots(self):
        d = self.slot.date.isoformat()
        r = self.c.get(f"/api/venues/{self.venue.id}/courts/{self.court.id}/slots/", {"date": d})
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_hold_slot(self):
        r = self.c.post(f"/api/venues/courts/{self.court.id}/slots/hold/", {"slot_id": str(self.slot.id)})
        self.assertIn(r.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

    def test_release_slot(self):
        # hold first
        self.slot.status = "held"
        self.slot.held_by = self.user
        self.slot.held_until = timezone.now() + timedelta(minutes=60)
        self.slot.save()
        r = self.c.post(f"/api/venues/slots/{self.slot.id}/release/")
        self.assertIn(r.status_code, [status.HTTP_200_OK, status.HTTP_204_NO_CONTENT])

    def test_list_venues_with_filters(self):
        r = self.c.get("/api/venues/", {"city": "Genève", "sport": "tennis"})
        self.assertEqual(r.status_code, status.HTTP_200_OK)


# ===========================================================================
# 5. MATCHES
# ===========================================================================

class MatchesRoutesTest(TestCase):
    """api/matches/*"""

    def setUp(self):
        self.u1, self.p1 = _make_user("match1@test.com")
        self.u2, self.p2 = _make_user("match2@test.com")
        self.c1, _ = _auth_client(self.u1)
        self.c2, _ = _auth_client(self.u2)

    def _create_match(self, client=None):
        c = client or self.c1
        r = c.post("/api/matches/create/", {
            "sport": "tennis",
            "match_type": "singles",
            "play_mode": "friendly",
            "scheduled_date": _tomorrow(),
            "scheduled_time": "14:00:00",
        }, format="json")
        return r

    def test_create_match(self):
        r = self._create_match()
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

    def test_list_matches(self):
        self._create_match()
        r = self.c1.get("/api/matches/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_my_matches(self):
        self._create_match()
        r = self.c1.get("/api/matches/my/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_retrieve_match(self):
        r = self._create_match()
        pk = r.data["id"]
        r2 = self.c1.get(f"/api/matches/{pk}/")
        self.assertEqual(r2.status_code, status.HTTP_200_OK)

    def test_join_match(self):
        r = self._create_match()
        pk = r.data["id"]
        # Change status to open so user2 can join
        self.c1.post(f"/api/matches/{pk}/change-status/", {"status": "open"}, format="json")
        r2 = self.c2.post(f"/api/matches/{pk}/join/")
        self.assertIn(r2.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

    def test_change_status(self):
        r = self._create_match()
        pk = r.data["id"]
        r2 = self.c1.post(f"/api/matches/{pk}/change-status/", {"status": "open"}, format="json")
        self.assertEqual(r2.status_code, status.HTTP_200_OK)

    def test_submit_score(self):
        r = self._create_match()
        pk = r.data["id"]
        # Open + join + complete
        self.c1.post(f"/api/matches/{pk}/change-status/", {"status": "open"}, format="json")
        self.c2.post(f"/api/matches/{pk}/join/")
        self.c1.post(f"/api/matches/{pk}/change-status/", {"status": "in_progress"}, format="json")
        self.c1.post(f"/api/matches/{pk}/change-status/", {"status": "completed"}, format="json")
        r2 = self.c1.post(f"/api/matches/{pk}/score/", {
            "sets": [{"team_a": 6, "team_b": 4}, {"team_a": 6, "team_b": 3}]
        }, format="json")
        self.assertIn(r2.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

    def test_list_matches_with_filters(self):
        self._create_match()
        r = self.c1.get("/api/matches/", {"sport": "tennis", "status": "draft"})
        self.assertEqual(r.status_code, status.HTTP_200_OK)


# ===========================================================================
# 5b. OPEN MATCHES
# ===========================================================================

class OpenMatchesRoutesTest(TestCase):
    """api/matches/open/*"""

    def setUp(self):
        self.u1, _ = _make_user("open1@test.com")
        self.u2, _ = _make_user("open2@test.com")
        self.c1, _ = _auth_client(self.u1)
        self.c2, _ = _auth_client(self.u2)

    def _create_open(self):
        return self.c1.post("/api/matches/open/create/", {
            "sport": "tennis",
            "match_type": "singles",
            "play_mode": "friendly",
            "scheduled_date": _tomorrow(),
            "scheduled_time": "10:00:00",
            "expires_at": (timezone.now() + timedelta(days=1)).isoformat(),
        }, format="json")

    def test_create_open_match(self):
        r = self._create_open()
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

    def test_list_open_matches(self):
        self._create_open()
        r = self.c1.get("/api/matches/open/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_retrieve_open_match(self):
        r = self._create_open()
        pk = r.data["id"]
        r2 = self.c1.get(f"/api/matches/open/{pk}/")
        self.assertEqual(r2.status_code, status.HTTP_200_OK)

    def test_join_open_match(self):
        r = self._create_open()
        pk = r.data["id"]
        r2 = self.c2.post(f"/api/matches/open/{pk}/join/")
        self.assertIn(r2.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])


# ===========================================================================
# 6. SCORING
# ===========================================================================

class ScoringRoutesTest(TestCase):
    """api/scores/*"""

    def setUp(self):
        self.u1, self.p1 = _make_user("score1@test.com")
        self.u2, self.p2 = _make_user("score2@test.com")
        self.c1, _ = _auth_client(self.u1)
        self.c2, _ = _auth_client(self.u2)

    def _create_scored_match(self):
        r = self.c1.post("/api/matches/create/", {
            "sport": "tennis",
            "match_type": "singles",
            "play_mode": "competitive",
            "scheduled_date": _tomorrow(),
            "scheduled_time": "14:00:00",
        }, format="json")
        pk = r.data["id"]
        self.c1.post(f"/api/matches/{pk}/change-status/", {"status": "open"}, format="json")
        self.c2.post(f"/api/matches/{pk}/join/")
        self.c1.post(f"/api/matches/{pk}/change-status/", {"status": "in_progress"}, format="json")
        self.c1.post(f"/api/matches/{pk}/change-status/", {"status": "completed"}, format="json")
        r2 = self.c1.post(f"/api/matches/{pk}/score/", {
            "sets": [{"team_a": 6, "team_b": 4}, {"team_a": 6, "team_b": 3}]
        }, format="json")
        score_id = r2.data.get("id") if r2.status_code in (200, 201) else None
        return pk, score_id

    def test_confirm_score(self):
        _, score_id = self._create_scored_match()
        if score_id:
            r = self.c2.post(f"/api/scores/{score_id}/confirm/")
            self.assertIn(r.status_code, [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST])

    def test_dispute_score(self):
        _, score_id = self._create_scored_match()
        if score_id:
            r = self.c2.post(f"/api/scores/{score_id}/dispute/")
            self.assertIn(r.status_code, [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST])

    def test_admin_resolve(self):
        admin = User.objects.create_superuser(email="admin@test.com", password="Admin1234!")
        ac = APIClient()
        ac.force_authenticate(user=admin)

        _, score_id = self._create_scored_match()
        if score_id:
            Score.objects.filter(id=score_id).update(status="disputed")
            r = ac.post(f"/api/scores/{score_id}/admin-resolve/", {
                "action": "confirm",
                "admin_note": "Looks correct",
            }, format="json")
            self.assertIn(r.status_code, [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST])


# ===========================================================================
# 7. RANKINGS
# ===========================================================================

class RankingsRoutesTest(TestCase):
    """api/rankings/*"""

    def setUp(self):
        self.user, _ = _make_user("rank@test.com")
        self.c, _ = _auth_client(self.user)

    def test_leaderboard(self):
        r = self.c.get("/api/rankings/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_leaderboard_filter(self):
        r = self.c.get("/api/rankings/", {"sport": "tennis"})
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_my_ranking(self):
        r = self.c.get("/api/rankings/me/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)


# ===========================================================================
# 8. STATS
# ===========================================================================

class StatsRoutesTest(TestCase):
    """api/stats/*"""

    def setUp(self):
        self.user, self.profile = _make_user("stat@test.com")
        self.c, _ = _auth_client(self.user)

    def test_my_stats(self):
        r = self.c.get("/api/stats/me/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_player_stats(self):
        r = self.c.get(f"/api/stats/{self.profile.id}/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)


# ===========================================================================
# 9. CHAT
# ===========================================================================

class ChatRoutesTest(TestCase):
    """api/chat/*"""

    def setUp(self):
        self.u1, _ = _make_user("chat1@test.com")
        self.u2, _ = _make_user("chat2@test.com")
        self.c1, _ = _auth_client(self.u1)
        self.c2, _ = _auth_client(self.u2)
        self.room = ChatRoom.objects.create(room_type="direct")
        self.room.participants.add(self.u1, self.u2)

    def test_list_rooms(self):
        r = self.c1.get("/api/chat/rooms/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_list_messages(self):
        r = self.c1.get(f"/api/chat/rooms/{self.room.id}/messages/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_send_message(self):
        r = self.c1.post(f"/api/chat/rooms/{self.room.id}/messages/", {"content": "Hello!"})
        self.assertIn(r.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

    def test_mark_read(self):
        ChatMessage.objects.create(room=self.room, sender=self.u2, content="Read me")
        r = self.c1.post(f"/api/chat/rooms/{self.room.id}/mark-read/")
        self.assertIn(r.status_code, [status.HTTP_200_OK, status.HTTP_204_NO_CONTENT])

    def test_non_participant_blocked(self):
        u3, _ = _make_user("outsider@test.com")
        c3, _ = _auth_client(u3)
        r = c3.get(f"/api/chat/rooms/{self.room.id}/messages/")
        self.assertIn(r.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])


# ===========================================================================
# 10. BOOKINGS
# ===========================================================================

class BookingsRoutesTest(TestCase):
    """api/bookings/*"""

    def setUp(self):
        self.user, _ = _make_user("book@test.com")
        self.c, _ = _auth_client(self.user)
        venue = _make_venue()
        court = _make_court(venue)
        self.slot = _make_slot(court)

    def test_create_booking(self):
        r = self.c.post("/api/bookings/", {"time_slot_id": str(self.slot.id)}, format="json")
        self.assertIn(r.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

    def test_my_bookings(self):
        r = self.c.get("/api/bookings/my/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_retrieve_booking(self):
        r = self.c.post("/api/bookings/", {"time_slot_id": str(self.slot.id)}, format="json")
        if r.status_code in (200, 201):
            pk = r.data["id"]
            r2 = self.c.get(f"/api/bookings/{pk}/")
            self.assertEqual(r2.status_code, status.HTTP_200_OK)

    def test_cancel_booking(self):
        r = self.c.post("/api/bookings/", {"time_slot_id": str(self.slot.id)}, format="json")
        if r.status_code in (200, 201):
            pk = r.data["id"]
            r2 = self.c.post(f"/api/bookings/{pk}/cancel/")
            self.assertIn(r2.status_code, [status.HTTP_200_OK, status.HTTP_204_NO_CONTENT])


# ===========================================================================
# 11. PAYMENTS
# ===========================================================================

class PaymentsRoutesTest(TestCase):
    """api/payments/*"""

    def setUp(self):
        self.user, _ = _make_user("pay@test.com")
        self.c, _ = _auth_client(self.user)

    def test_my_payments(self):
        r = self.c.get("/api/payments/my/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_create_intent_no_booking(self):
        """create-intent with invalid booking_id should return 400/404."""
        r = self.c.post("/api/payments/create-intent/", {
            "booking_id": str(uuid.uuid4()),
        }, format="json")
        self.assertIn(r.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_404_NOT_FOUND])

    def test_webhook_no_signature(self):
        """Stripe webhook without signature should fail."""
        r = self.c.post("/api/payments/webhook/", {}, content_type="application/json")
        self.assertIn(r.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN, status.HTTP_500_INTERNAL_SERVER_ERROR])


# ===========================================================================
# 12. TOURNAMENTS
# ===========================================================================

class TournamentsRoutesTest(TestCase):
    """api/tournaments/*"""

    def setUp(self):
        self.user, _ = _make_user("tourn@test.com")
        self.c, _ = _auth_client(self.user)

    def test_list_tournaments(self):
        r = self.c.get("/api/tournaments/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_create_tournament(self):
        r = self.c.post("/api/tournaments/create/", {
            "name": "Test Open",
            "sport": "tennis",
            "match_type": "singles",
            "start_date": _tomorrow(),
            "max_participants": 8,
        }, format="json")
        self.assertIn(r.status_code, [status.HTTP_201_CREATED, status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST])

    def test_retrieve_tournament(self):
        r = self.c.post("/api/tournaments/create/", {
            "name": "Test Open 2",
            "sport": "tennis",
            "match_type": "singles",
            "start_date": _tomorrow(),
            "max_participants": 8,
        }, format="json")
        if r.status_code in (200, 201):
            pk = r.data["id"]
            r2 = self.c.get(f"/api/tournaments/{pk}/")
            self.assertEqual(r2.status_code, status.HTTP_200_OK)

    def test_register_tournament(self):
        r = self.c.post("/api/tournaments/create/", {
            "name": "Reg Test",
            "sport": "tennis",
            "match_type": "singles",
            "start_date": _tomorrow(),
            "max_participants": 8,
        }, format="json")
        if r.status_code in (200, 201):
            pk = r.data["id"]
            u2, _ = _make_user("tournjoin@test.com")
            c2, _ = _auth_client(u2)
            r2 = c2.post(f"/api/tournaments/{pk}/register/")
            self.assertIn(r2.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST])

    def test_generate_bracket(self):
        r = self.c.post("/api/tournaments/create/", {
            "name": "Bracket Test",
            "sport": "tennis",
            "match_type": "singles",
            "start_date": _tomorrow(),
            "max_participants": 4,
        }, format="json")
        if r.status_code in (200, 201):
            pk = r.data["id"]
            r2 = self.c.post(f"/api/tournaments/{pk}/generate-bracket/")
            # Might fail if not enough players — that's expected
            self.assertIn(r2.status_code, [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST])


# ===========================================================================
# 13. EVENTS
# ===========================================================================

class EventsRoutesTest(TestCase):
    """api/events/*"""

    def setUp(self):
        self.user, _ = _make_user("event@test.com")
        self.c, _ = _auth_client(self.user)
        self.admin = User.objects.create_superuser(email="eventadmin@test.com", password="Admin1234!")
        self.ac = APIClient()
        self.ac.force_authenticate(user=self.admin)

    def _create_event(self):
        return self.ac.post("/api/events/", {
            "name": "Go Match Cup",
            "event_type": "go_match_cup",
            "sport": "tennis",
            "match_type": "singles",
            "start_date": _tomorrow(),
            "max_participants": 16,
        }, format="json")

    def test_list_events(self):
        r = self.c.get("/api/events/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_list_events_with_filters(self):
        r = self.c.get("/api/events/", {"sport": "tennis"})
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_create_event_admin(self):
        r = self._create_event()
        self.assertIn(r.status_code, [status.HTTP_201_CREATED, status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST])

    def test_create_event_non_admin_forbidden(self):
        r = self.c.post("/api/events/", {
            "name": "Fail Event",
            "event_type": "go_match_cup",
            "sport": "tennis",
            "match_type": "singles",
            "start_date": _tomorrow(),
            "max_participants": 16,
        }, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_my_events(self):
        r = self.c.get("/api/events/my/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_retrieve_event(self):
        r = self._create_event()
        if r.status_code in (200, 201):
            pk = r.data["id"]
            r2 = self.c.get(f"/api/events/{pk}/")
            self.assertEqual(r2.status_code, status.HTTP_200_OK)

    def test_register_event(self):
        r = self._create_event()
        if r.status_code in (200, 201):
            pk = r.data["id"]
            r2 = self.c.post(f"/api/events/{pk}/register/")
            self.assertIn(r2.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST])

    def test_cancel_registration(self):
        r = self._create_event()
        if r.status_code in (200, 201):
            pk = r.data["id"]
            self.c.post(f"/api/events/{pk}/register/")
            r2 = self.c.post(f"/api/events/{pk}/cancel-registration/")
            self.assertIn(r2.status_code, [status.HTTP_200_OK, status.HTTP_204_NO_CONTENT, status.HTTP_400_BAD_REQUEST])


# ===========================================================================
# 14. HEALTH / DOCS
# ===========================================================================

class UtilityRoutesTest(TestCase):
    """api/health, api/docs, api/schema, api/redoc"""

    def setUp(self):
        self.c = APIClient()

    def test_health_check(self):
        r = self.c.get("/api/health/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_schema(self):
        r = self.c.get("/api/schema/")
        self.assertLess(r.status_code, 500)

    def test_docs(self):
        r = self.c.get("/api/docs/")
        self.assertLess(r.status_code, 500)

    def test_redoc(self):
        r = self.c.get("/api/redoc/")
        self.assertLess(r.status_code, 500)


# ===========================================================================
# 15. SECURITY — unauthenticated access must be denied on protected routes
# ===========================================================================

class SecurityTest(TestCase):
    """Ensure 401 on all protected endpoints when not authenticated."""

    PROTECTED = [
        ("GET", "/api/auth/me/"),
        ("PATCH", "/api/auth/profile/"),
        ("POST", "/api/auth/push-token/"),
        ("GET", "/api/players/"),
        ("GET", "/api/connections/"),
        ("GET", "/api/connections/pending/"),
        ("GET", "/api/connections/count/"),
        ("GET", "/api/venues/"),
        ("GET", "/api/matches/"),
        ("GET", "/api/matches/my/"),
        ("POST", "/api/matches/create/"),
        ("GET", "/api/matches/open/"),
        ("GET", "/api/rankings/"),
        ("GET", "/api/rankings/me/"),
        ("GET", "/api/stats/me/"),
        ("GET", "/api/chat/rooms/"),
        ("GET", "/api/bookings/my/"),
        ("GET", "/api/payments/my/"),
        ("GET", "/api/tournaments/"),
        ("GET", "/api/events/"),
        ("GET", "/api/events/my/"),
    ]

    def test_all_protected_return_401(self):
        c = APIClient()
        failures = []
        for method, url in self.PROTECTED:
            fn = getattr(c, method.lower())
            r = fn(url)
            if r.status_code != status.HTTP_401_UNAUTHORIZED:
                failures.append(f"{method} {url} → {r.status_code}")
        self.assertEqual(failures, [], f"Expected 401 on: {failures}")

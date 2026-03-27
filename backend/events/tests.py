import datetime
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User
from core.enums import EventStatus, RegistrationStatus
from events.models import Event, EventRegistration


def _create_user(email, is_staff=False):
    user = User.objects.create_user(email=email, password="Test1234!")
    user.is_staff = is_staff
    user.save()
    return user


def _create_event(user, **overrides):
    defaults = {
        "name": "Go Match Cup #1",
        "event_type": "cup",
        "date": datetime.date.today() + datetime.timedelta(days=7),
        "location": "Lausanne, Suisse",
        "price": Decimal("25.00"),
    }
    defaults.update(overrides)
    return Event.objects.create(created_by=user, **defaults)


class CreateEventTests(TestCase):
    """Tests for event creation (admin only)."""

    def setUp(self):
        self.admin = _create_user("admin@test.com", is_staff=True)
        self.player = _create_user("player@test.com")
        self.client = APIClient()

    def test_create_event_admin(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post("/api/events/", {
            "name": "Cup Test",
            "event_type": "cup",
            "date": "2026-06-15",
            "location": "Genève",
            "price": "30.00",
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Event.objects.count(), 1)

    def test_create_event_non_admin_forbidden(self):
        self.client.force_authenticate(user=self.player)
        resp = self.client.post("/api/events/", {
            "name": "Cup Test",
            "event_type": "cup",
            "date": "2026-06-15",
            "location": "Genève",
        })
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


class RegisterTests(TestCase):
    """Tests for event registration."""

    def setUp(self):
        self.admin = _create_user("admin@test.com", is_staff=True)
        self.player = _create_user("player@test.com")
        self.event = _create_event(self.admin, max_attendees=10)
        self.client = APIClient()

    def test_register(self):
        self.client.force_authenticate(user=self.player)
        resp = self.client.post(f"/api/events/{self.event.id}/register/")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["status"], RegistrationStatus.REGISTERED)

    def test_register_duplicate(self):
        self.client.force_authenticate(user=self.player)
        self.client.post(f"/api/events/{self.event.id}/register/")
        resp = self.client.post(f"/api/events/{self.event.id}/register/")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


class WaitlistTests(TestCase):
    """Tests for waitlist when event is full."""

    def setUp(self):
        self.admin = _create_user("admin@test.com", is_staff=True)
        self.event = _create_event(self.admin, max_attendees=2)
        self.client = APIClient()

    def test_register_full_waitlist(self):
        # Fill the event
        for i in range(2):
            u = _create_user(f"p{i}@test.com")
            self.client.force_authenticate(user=u)
            self.client.post(f"/api/events/{self.event.id}/register/")

        # Third player → waitlist
        u3 = _create_user("p3@test.com")
        self.client.force_authenticate(user=u3)
        resp = self.client.post(f"/api/events/{self.event.id}/register/")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["status"], RegistrationStatus.WAITLISTED)


class CancelTests(TestCase):
    """Tests for cancelling a registration."""

    def setUp(self):
        self.admin = _create_user("admin@test.com", is_staff=True)
        self.player = _create_user("player@test.com")
        self.event = _create_event(self.admin)
        self.client = APIClient()

    def test_cancel(self):
        self.client.force_authenticate(user=self.player)
        self.client.post(f"/api/events/{self.event.id}/register/")
        resp = self.client.post(f"/api/events/{self.event.id}/cancel-registration/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["status"], RegistrationStatus.CANCELLED)

    def test_cancel_not_registered(self):
        self.client.force_authenticate(user=self.player)
        resp = self.client.post(f"/api/events/{self.event.id}/cancel-registration/")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


class DeadlineTests(TestCase):
    """Tests for registration deadline."""

    def setUp(self):
        self.admin = _create_user("admin@test.com", is_staff=True)
        self.player = _create_user("player@test.com")
        self.client = APIClient()

    def test_deadline_passed(self):
        event = _create_event(
            self.admin,
            registration_deadline=timezone.now() - datetime.timedelta(hours=1),
        )
        self.client.force_authenticate(user=self.player)
        resp = self.client.post(f"/api/events/{event.id}/register/")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


class EventListTests(TestCase):
    """Tests for listing events."""

    def setUp(self):
        self.admin = _create_user("admin@test.com", is_staff=True)
        self.player = _create_user("player@test.com")
        _create_event(self.admin, name="Cup A")
        _create_event(self.admin, name="Cup B", event_type="social")
        self.client = APIClient()

    def test_list_events(self):
        self.client.force_authenticate(user=self.player)
        resp = self.client.get("/api/events/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["count"], 2)

    def test_filter_by_type(self):
        self.client.force_authenticate(user=self.player)
        resp = self.client.get("/api/events/?event_type=cup")
        self.assertEqual(resp.data["count"], 1)
        self.assertEqual(resp.data["results"][0]["name"], "Cup A")

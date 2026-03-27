from datetime import date, time, timedelta
from decimal import Decimal
from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from core.enums import TimeSlotStatus
from venues.models import Court, TimeSlot, Venue

User = get_user_model()


class VenueModelTests(TestCase):
    """Tests for the Venue and Court models."""

    def setUp(self):
        self.venue = Venue.objects.create(
            name="Tennis Club Genève",
            address="Rue du Tennis 1",
            city="Genève",
            latitude=Decimal("46.204391"),
            longitude=Decimal("6.143158"),
        )

    def test_venue_str(self):
        """__str__ should return name (city)."""
        self.assertEqual(str(self.venue), "Tennis Club Genève (Genève)")

    def test_court_str(self):
        """__str__ should return court name - venue name."""
        court = Court.objects.create(
            venue=self.venue,
            name="Court 1",
            sport="tennis",
            surface="clay",
            is_indoor=False,
            hourly_rate=Decimal("40.00"),
        )
        self.assertEqual(str(court), "Court 1 - Tennis Club Genève")


class VenueListAPITests(TestCase):
    """Tests for GET /api/venues/."""

    def setUp(self):
        self.client = APIClient()
        self.url = "/api/venues/"
        self.user = User.objects.create_user(
            email="player@test.com",
            password="testpass123",
        )
        self.client.force_authenticate(user=self.user)
        # Clear venue cache to avoid stale data between tests
        from django.core.cache import cache
        cache.delete("venues_active")

        # Venue 1: Genève, tennis
        self.venue_geneva = Venue.objects.create(
            name="Tennis Club Genève",
            address="Rue du Tennis 1",
            city="Genève",
            latitude=Decimal("46.204391"),
            longitude=Decimal("6.143158"),
        )
        Court.objects.create(
            venue=self.venue_geneva,
            name="Court 1",
            sport="tennis",
            surface="clay",
            is_indoor=False,
            hourly_rate=Decimal("40.00"),
        )
        Court.objects.create(
            venue=self.venue_geneva,
            name="Court 2",
            sport="tennis",
            surface="hard",
            is_indoor=True,
            hourly_rate=Decimal("50.00"),
        )

        # Venue 2: Lausanne, padel
        self.venue_lausanne = Venue.objects.create(
            name="Padel Center Lausanne",
            address="Avenue du Padel 5",
            city="Lausanne",
            latitude=Decimal("46.519653"),
            longitude=Decimal("6.632273"),
        )
        Court.objects.create(
            venue=self.venue_lausanne,
            name="Padel A",
            sport="padel",
            surface="artificial",
            is_indoor=True,
            hourly_rate=Decimal("60.00"),
        )

        # Venue 3: Genève, padel (inactive)
        self.venue_inactive = Venue.objects.create(
            name="Old Club",
            address="Old Street 99",
            city="Genève",
            latitude=Decimal("46.200000"),
            longitude=Decimal("6.140000"),
            is_active=False,
        )

    def test_list_venues(self):
        """Listing venues should return only active venues with court_count."""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["results"]
        # Only 2 active venues
        self.assertEqual(len(results), 2)
        # Check court_count on Geneva venue
        geneva = next(v for v in results if v["name"] == "Tennis Club Genève")
        self.assertEqual(geneva["court_count"], 2)

    def test_filter_by_city(self):
        """Filtering by city should return matching venues only."""
        response = self.client.get(self.url, {"city": "Lausanne"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["name"], "Padel Center Lausanne")

    def test_filter_by_sport(self):
        """Filtering by sport should return venues having courts with that sport."""
        response = self.client.get(self.url, {"sport": "padel"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["name"], "Padel Center Lausanne")

    def test_filter_by_city_and_sport(self):
        """Filtering by both city and sport should combine filters."""
        response = self.client.get(self.url, {"city": "Genève", "sport": "tennis"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["name"], "Tennis Club Genève")

    def test_list_venues_unauthenticated(self):
        """Unauthenticated request should return 401."""
        self.client.force_authenticate(user=None)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class TimeSlotTestMixin:
    """Shared setup for TimeSlot tests."""

    def _create_fixtures(self):
        self.user = User.objects.create_user(
            email="slot@test.com", password="testpass123"
        )
        self.venue = Venue.objects.create(
            name="Slot Venue",
            address="Rue 1",
            city="Genève",
            latitude=Decimal("46.204"),
            longitude=Decimal("6.143"),
        )
        self.court = Court.objects.create(
            venue=self.venue,
            name="Court 1",
            sport="tennis",
            surface="clay",
            is_indoor=False,
            hourly_rate=Decimal("40.00"),
        )


class HoldSlotTests(TimeSlotTestMixin, TestCase):
    """Tests for holding and releasing time slots via the API."""

    def setUp(self):
        self._create_fixtures()
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.slot = TimeSlot.objects.create(
            court=self.court,
            date=date(2026, 7, 1),
            start_time=time(10, 0),
            end_time=time(11, 0),
        )
        self.hold_url = f"/api/venues/courts/{self.court.pk}/slots/hold/"
        self.release_url = f"/api/venues/slots/{self.slot.pk}/release/"

    def test_hold_slot(self):
        """Holding an available slot should set HELD status."""
        response = self.client.post(self.hold_url, {"slot_id": str(self.slot.pk)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.slot.refresh_from_db()
        self.assertEqual(self.slot.status, TimeSlotStatus.HELD)
        self.assertEqual(self.slot.held_by, self.user)
        self.assertIsNotNone(self.slot.held_until)

    def test_hold_already_held_fails(self):
        """Holding an already-held slot should return 400."""
        self.slot.status = TimeSlotStatus.HELD
        self.slot.held_by = self.user
        self.slot.held_until = timezone.now() + timedelta(minutes=60)
        self.slot.save()
        response = self.client.post(self.hold_url, {"slot_id": str(self.slot.pk)})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("not available", response.data["detail"])

    def test_release_slot(self):
        """Releasing a held slot should set it back to AVAILABLE."""
        self.slot.status = TimeSlotStatus.HELD
        self.slot.held_by = self.user
        self.slot.held_until = timezone.now() + timedelta(minutes=60)
        self.slot.save()
        response = self.client.post(self.release_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.slot.refresh_from_db()
        self.assertEqual(self.slot.status, TimeSlotStatus.AVAILABLE)
        self.assertIsNone(self.slot.held_by)
        self.assertIsNone(self.slot.held_until)


class GenerateTimeSlotsTests(TimeSlotTestMixin, TestCase):
    """Tests for the generate_time_slots management command."""

    def setUp(self):
        self._create_fixtures()

    def test_generate_slots(self):
        """Command should create 14 one-hour slots (8h-22h)."""
        out = StringIO()
        call_command(
            "generate_time_slots",
            str(self.court.pk),
            "2026-08-01",
            stdout=out,
        )
        slots = TimeSlot.objects.filter(court=self.court, date=date(2026, 8, 1))
        self.assertEqual(slots.count(), 14)
        self.assertIn("Created 14", out.getvalue())


class ReleaseExpiredHoldsTests(TimeSlotTestMixin, TestCase):
    """Tests for the release_expired_holds management command."""

    def setUp(self):
        self._create_fixtures()

    def test_release_expired(self):
        """Expired held slots should be released back to AVAILABLE."""
        slot = TimeSlot.objects.create(
            court=self.court,
            date=date(2026, 7, 1),
            start_time=time(14, 0),
            end_time=time(15, 0),
            status=TimeSlotStatus.HELD,
            held_by=self.user,
            held_until=timezone.now() - timedelta(minutes=1),
        )
        out = StringIO()
        call_command("release_expired_holds", stdout=out)
        slot.refresh_from_db()
        self.assertEqual(slot.status, TimeSlotStatus.AVAILABLE)
        self.assertIsNone(slot.held_by)
        self.assertIn("Released 1", out.getvalue())


class VenueDetailAPITests(TestCase):
    """Tests for GET /api/venues/:id/."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="player@test.com",
            password="testpass123",
        )
        self.client.force_authenticate(user=self.user)

        self.venue = Venue.objects.create(
            name="Tennis Club Montreux",
            address="Quai du Tennis 10",
            city="Montreux",
            latitude=Decimal("46.431019"),
            longitude=Decimal("6.910694"),
            phone="+41 21 123 45 67",
            website_url="https://tcmontreux.ch",
        )
        self.court1 = Court.objects.create(
            venue=self.venue,
            name="Centre Court",
            sport="tennis",
            surface="clay",
            is_indoor=False,
            hourly_rate=Decimal("45.00"),
        )
        self.court2 = Court.objects.create(
            venue=self.venue,
            name="Indoor Court",
            sport="tennis",
            surface="hard",
            is_indoor=True,
            hourly_rate=Decimal("55.00"),
        )

    def test_venue_detail_with_courts(self):
        """Detail should return full venue data with nested courts."""
        url = f"/api/venues/{self.venue.id}/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Tennis Club Montreux")
        self.assertEqual(response.data["phone"], "+41 21 123 45 67")
        self.assertEqual(len(response.data["courts"]), 2)
        court_names = [c["name"] for c in response.data["courts"]]
        self.assertIn("Centre Court", court_names)
        self.assertIn("Indoor Court", court_names)

    def test_venue_detail_not_found(self):
        """Non-existent venue should return 404."""
        url = "/api/venues/00000000-0000-0000-0000-000000000000/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

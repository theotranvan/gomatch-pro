from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from venues.models import Venue, Court

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

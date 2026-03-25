from datetime import date, time, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from bookings.models import Booking
from bookings.services import BookingService
from core.enums import BookingStatus, TimeSlotStatus
from matches.models import Match
from venues.models import Court, TimeSlot, Venue

User = get_user_model()


class BookingTestMixin:
    """Shared fixtures for booking tests."""

    def _create_fixtures(self):
        self.user = User.objects.create_user(
            email="booker@test.com", password="testpass123"
        )
        self.venue = Venue.objects.create(
            name="Test Venue",
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
        self.slot = TimeSlot.objects.create(
            court=self.court,
            date=date(2026, 7, 1),
            start_time=time(10, 0),
            end_time=time(11, 0),
        )


class BookingServiceTests(BookingTestMixin, TestCase):
    """Tests for BookingService."""

    def setUp(self):
        self._create_fixtures()

    def test_create_booking_available_slot(self):
        """Booking an AVAILABLE slot should work and set slot to BOOKED."""
        booking = BookingService.create_booking(self.user, self.slot.pk)
        self.assertEqual(booking.status, BookingStatus.PENDING)
        self.assertEqual(booking.total_amount, Decimal("40.00"))
        self.assertEqual(booking.per_player_amount, Decimal("40.00"))
        self.slot.refresh_from_db()
        self.assertEqual(self.slot.status, TimeSlotStatus.BOOKED)

    def test_create_booking_held_by_user(self):
        """Booking a slot HELD by the same user should succeed."""
        self.slot.status = TimeSlotStatus.HELD
        self.slot.held_by = self.user
        self.slot.held_until = timezone.now() + timedelta(minutes=30)
        self.slot.save()
        booking = BookingService.create_booking(self.user, self.slot.pk)
        self.assertEqual(booking.booked_by, self.user)
        self.slot.refresh_from_db()
        self.assertEqual(self.slot.status, TimeSlotStatus.BOOKED)

    def test_create_booking_held_by_other_fails(self):
        """Booking a slot HELD by another user should fail."""
        other = User.objects.create_user(email="other@test.com", password="pass")
        self.slot.status = TimeSlotStatus.HELD
        self.slot.held_by = other
        self.slot.held_until = timezone.now() + timedelta(minutes=30)
        self.slot.save()
        with self.assertRaises(ValueError):
            BookingService.create_booking(self.user, self.slot.pk)

    def test_create_booking_already_booked_fails(self):
        """Booking an already BOOKED slot should fail."""
        self.slot.status = TimeSlotStatus.BOOKED
        self.slot.save()
        with self.assertRaises(ValueError):
            BookingService.create_booking(self.user, self.slot.pk)

    def test_create_booking_with_match_splits_cost(self):
        """Per-player amount should be total / max_participants when match given."""
        match = Match.objects.create(
            sport="tennis",
            match_type="doubles",
            play_mode="friendly",
            scheduled_date=date(2026, 7, 1),
            scheduled_time=time(10, 0),
            created_by=self.user,
            max_participants=4,
        )
        booking = BookingService.create_booking(
            self.user, self.slot.pk, match_id=match.pk
        )
        self.assertEqual(booking.total_amount, Decimal("40.00"))
        self.assertEqual(booking.per_player_amount, Decimal("10.00"))
        self.assertEqual(booking.match, match)

    def test_cancel_booking(self):
        """Cancelling a booking should release the slot."""
        booking = BookingService.create_booking(self.user, self.slot.pk)
        cancelled = BookingService.cancel_booking(self.user, booking.pk)
        self.assertEqual(cancelled.status, BookingStatus.CANCELLED)
        self.assertIsNotNone(cancelled.cancelled_at)
        self.slot.refresh_from_db()
        self.assertEqual(self.slot.status, TimeSlotStatus.AVAILABLE)

    def test_cancel_other_user_fails(self):
        """Cancelling another user's booking should fail."""
        booking = BookingService.create_booking(self.user, self.slot.pk)
        other = User.objects.create_user(email="other2@test.com", password="pass")
        with self.assertRaises(ValueError):
            BookingService.cancel_booking(other, booking.pk)


class BookingAPITests(BookingTestMixin, TestCase):
    """Tests for booking API endpoints."""

    def setUp(self):
        self._create_fixtures()
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_create_booking_api(self):
        """POST /api/bookings/ should create a booking."""
        response = self.client.post(
            "/api/bookings/", {"time_slot_id": str(self.slot.pk)}
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], BookingStatus.PENDING)

    def test_my_bookings_api(self):
        """GET /api/bookings/my/ should list user's bookings."""
        BookingService.create_booking(self.user, self.slot.pk)
        response = self.client.get("/api/bookings/my/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)

    def test_booking_detail_api(self):
        """GET /api/bookings/:id/ should return the booking."""
        booking = BookingService.create_booking(self.user, self.slot.pk)
        response = self.client.get(f"/api/bookings/{booking.pk}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], str(booking.pk))

    def test_cancel_booking_api(self):
        """POST /api/bookings/:id/cancel/ should cancel the booking."""
        booking = BookingService.create_booking(self.user, self.slot.pk)
        response = self.client.post(f"/api/bookings/{booking.pk}/cancel/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], BookingStatus.CANCELLED)

    def test_create_booking_booked_slot_fails(self):
        """Booking an already-booked slot via API should return 400."""
        self.slot.status = TimeSlotStatus.BOOKED
        self.slot.save()
        response = self.client.post(
            "/api/bookings/", {"time_slot_id": str(self.slot.pk)}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

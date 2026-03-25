import json
from datetime import date, time
from decimal import Decimal
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from bookings.models import Booking
from core.enums import BookingStatus, PaymentStatus, TimeSlotStatus
from matches.models import Match, MatchParticipant
from payments.models import Payment
from payments.services import PaymentService
from venues.models import Court, TimeSlot, Venue

User = get_user_model()


class PaymentTestMixin:
    """Shared fixtures for payment tests."""

    def _create_fixtures(self):
        self.user = User.objects.create_user(
            email="payer@test.com", password="testpass123"
        )
        self.other_user = User.objects.create_user(
            email="other@test.com", password="testpass123"
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
            status=TimeSlotStatus.BOOKED,
        )
        self.match = Match.objects.create(
            sport="tennis",
            match_type="doubles",
            play_mode="friendly",
            scheduled_date=date(2026, 7, 1),
            scheduled_time=time(10, 0),
            created_by=self.user,
            max_participants=4,
        )
        # Add user as participant
        MatchParticipant.objects.create(
            match=self.match,
            player=self.user.profile,
            role="creator",
            status="accepted",
        )
        self.booking = Booking.objects.create(
            time_slot=self.slot,
            match=self.match,
            booked_by=self.user,
            total_amount=Decimal("40.00"),
            per_player_amount=Decimal("10.00"),
        )


class PaymentServiceTests(PaymentTestMixin, TestCase):
    """Tests for PaymentService."""

    def setUp(self):
        self._create_fixtures()

    @patch("payments.services.stripe.PaymentIntent.create")
    def test_create_intent(self, mock_create):
        """Creating a payment intent returns client_secret, amount, payment_id."""
        mock_create.return_value = MagicMock(
            id="pi_test_123",
            client_secret="pi_test_123_secret_abc",
        )

        result = PaymentService.create_payment_intent(
            user=self.user, booking_id=str(self.booking.id)
        )

        self.assertIn("client_secret", result)
        self.assertEqual(result["client_secret"], "pi_test_123_secret_abc")
        self.assertEqual(result["amount"], "10.00")
        self.assertIn("payment_id", result)

        # Verify Stripe was called with correct amount in centimes
        mock_create.assert_called_once()
        call_kwargs = mock_create.call_args[1]
        self.assertEqual(call_kwargs["amount"], 1000)  # 10.00 CHF * 100
        self.assertEqual(call_kwargs["currency"], "chf")

        # Verify Payment record created
        payment = Payment.objects.get(pk=result["payment_id"])
        self.assertEqual(payment.status, PaymentStatus.PENDING)
        self.assertEqual(payment.stripe_payment_intent_id, "pi_test_123")
        self.assertEqual(payment.amount, Decimal("10.00"))

    @patch("payments.services.stripe.PaymentIntent.create")
    def test_double_payment_blocked(self, mock_create):
        """A user cannot create two payment intents for the same booking."""
        mock_create.return_value = MagicMock(
            id="pi_test_first",
            client_secret="secret_first",
        )

        # First payment should succeed
        PaymentService.create_payment_intent(
            user=self.user, booking_id=str(self.booking.id)
        )

        # Second payment should be blocked
        with self.assertRaises(ValueError) as ctx:
            PaymentService.create_payment_intent(
                user=self.user, booking_id=str(self.booking.id)
            )
        self.assertIn("already initiated", str(ctx.exception))

    @patch("payments.services.stripe.Webhook.construct_event")
    def test_webhook_success(self, mock_construct):
        """Webhook payment_intent.succeeded marks payment COMPLETED."""
        # Create a pending payment first
        payment = Payment.objects.create(
            booking=self.booking,
            payer=self.user,
            amount=Decimal("10.00"),
            stripe_payment_intent_id="pi_webhook_test",
            stripe_client_secret="secret_wh",
        )

        mock_construct.return_value = {
            "type": "payment_intent.succeeded",
            "data": {
                "object": {"id": "pi_webhook_test"},
            },
        }

        PaymentService.handle_webhook(b"payload", "sig_header")

        payment.refresh_from_db()
        self.assertEqual(payment.status, PaymentStatus.COMPLETED)
        self.assertIsNotNone(payment.completed_at)

        # Booking should be CONFIRMED (only one payment, and it's completed)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, BookingStatus.CONFIRMED)

    @patch("payments.services.stripe.Webhook.construct_event")
    def test_webhook_failure(self, mock_construct):
        """Webhook payment_intent.payment_failed marks payment FAILED."""
        payment = Payment.objects.create(
            booking=self.booking,
            payer=self.user,
            amount=Decimal("10.00"),
            stripe_payment_intent_id="pi_fail_test",
            stripe_client_secret="secret_fail",
        )

        mock_construct.return_value = {
            "type": "payment_intent.payment_failed",
            "data": {
                "object": {"id": "pi_fail_test"},
            },
        }

        PaymentService.handle_webhook(b"payload", "sig_header")

        payment.refresh_from_db()
        self.assertEqual(payment.status, PaymentStatus.FAILED)


class PaymentAPITests(PaymentTestMixin, TestCase):
    """Tests for payment API endpoints."""

    def setUp(self):
        self._create_fixtures()
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    @patch("payments.services.stripe.PaymentIntent.create")
    def test_create_intent_api(self, mock_create):
        """POST /api/payments/create-intent/ returns 201 with client_secret."""
        mock_create.return_value = MagicMock(
            id="pi_api_test",
            client_secret="pi_api_secret",
        )

        response = self.client.post(
            "/api/payments/create-intent/",
            {"booking_id": str(self.booking.id)},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["client_secret"], "pi_api_secret")
        self.assertEqual(response.data["amount"], "10.00")

    def test_my_payments(self):
        """GET /api/payments/my/ returns user's payments."""
        Payment.objects.create(
            booking=self.booking,
            payer=self.user,
            amount=Decimal("10.00"),
            stripe_payment_intent_id="pi_my",
            stripe_client_secret="secret_my",
        )

        response = self.client.get("/api/payments/my/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["amount"], "10.00")

    @patch("payments.services.stripe.Webhook.construct_event")
    def test_webhook_endpoint(self, mock_construct):
        """POST /api/payments/webhook/ returns 200 (no auth required)."""
        Payment.objects.create(
            booking=self.booking,
            payer=self.user,
            amount=Decimal("10.00"),
            stripe_payment_intent_id="pi_wh_api",
            stripe_client_secret="secret_wh_api",
        )

        mock_construct.return_value = {
            "type": "payment_intent.succeeded",
            "data": {
                "object": {"id": "pi_wh_api"},
            },
        }

        # Use unauthenticated client for webhook
        anon_client = APIClient()
        response = anon_client.post(
            "/api/payments/webhook/",
            data=b"raw_payload",
            content_type="application/json",
            HTTP_STRIPE_SIGNATURE="test_sig",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

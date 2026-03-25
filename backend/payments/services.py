import stripe
from django.conf import settings
from django.utils import timezone

from bookings.models import Booking
from core.enums import BookingStatus, PaymentStatus
from payments.models import Payment


stripe.api_key = settings.STRIPE_SECRET_KEY


class PaymentService:
    """Service for creating Stripe PaymentIntents and handling webhooks."""

    @staticmethod
    def create_payment_intent(user, booking_id):
        """
        Create a Stripe PaymentIntent for a booking.
        1. Verify user is a participant of the match linked to the booking.
        2. Verify user hasn't already paid for this booking.
        3. Calculate amount = booking.per_player_amount.
        4. Create Stripe PaymentIntent in CHF (amount in centimes).
        5. Create Payment record in PENDING.
        6. Return client_secret, amount, payment_id.
        """
        try:
            booking = Booking.objects.select_related("match").get(pk=booking_id)
        except Booking.DoesNotExist:
            raise ValueError("Booking not found.")

        # 1. Check user is participant of the linked match
        if booking.match:
            is_participant = booking.match.participants.filter(
                player__user=user
            ).exists()
            if not is_participant:
                raise ValueError("You are not a participant of this match.")
        elif booking.booked_by != user:
            raise ValueError("You are not allowed to pay for this booking.")

        # 2. Check for duplicate payment
        existing = Payment.objects.filter(
            booking=booking,
            payer=user,
            status__in=[PaymentStatus.PENDING, PaymentStatus.COMPLETED],
        ).exists()
        if existing:
            raise ValueError("You have already initiated a payment for this booking.")

        # 3. Amount
        amount = booking.per_player_amount
        amount_centimes = int(amount * 100)

        # 4. Create Stripe PaymentIntent
        intent = stripe.PaymentIntent.create(
            amount=amount_centimes,
            currency="chf",
            payment_method_types=["card"],
            metadata={
                "booking_id": str(booking.id),
                "user_id": str(user.id),
            },
        )

        # 5. Create Payment record
        payment = Payment.objects.create(
            booking=booking,
            payer=user,
            amount=amount,
            stripe_payment_intent_id=intent.id,
            stripe_client_secret=intent.client_secret,
        )

        return {
            "client_secret": intent.client_secret,
            "amount": str(amount),
            "payment_id": str(payment.id),
        }

    @staticmethod
    def handle_webhook(payload, sig_header):
        """
        Handle a Stripe webhook event.
        Verifies signature, then handles:
        - payment_intent.succeeded → COMPLETED
        - payment_intent.payment_failed → FAILED
        """
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except (ValueError, stripe.error.SignatureVerificationError):
            raise ValueError("Invalid webhook signature.")

        event_type = event["type"]
        intent = event["data"]["object"]
        pi_id = intent["id"]

        if event_type == "payment_intent.succeeded":
            try:
                payment = Payment.objects.select_related("booking").get(
                    stripe_payment_intent_id=pi_id
                )
            except Payment.DoesNotExist:
                return  # Ignore unknown payment intents

            payment.status = PaymentStatus.COMPLETED
            payment.completed_at = timezone.now()
            payment.save(update_fields=["status", "completed_at"])

            # Check if all payments for this booking are completed
            booking = payment.booking
            all_payments = booking.payments.all()
            if all_payments.exists() and all(
                p.status == PaymentStatus.COMPLETED for p in all_payments
            ):
                booking.status = BookingStatus.CONFIRMED
                booking.save(update_fields=["status"])

        elif event_type == "payment_intent.payment_failed":
            try:
                payment = Payment.objects.get(stripe_payment_intent_id=pi_id)
            except Payment.DoesNotExist:
                return

            payment.status = PaymentStatus.FAILED
            payment.save(update_fields=["status"])

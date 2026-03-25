import uuid

from django.conf import settings
from django.db import models

from bookings.models import Booking
from core.enums import PaymentMethod, PaymentStatus


class Payment(models.Model):
    """A payment for a booking, linked to a Stripe PaymentIntent."""

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    booking = models.ForeignKey(
        Booking,
        on_delete=models.CASCADE,
        related_name="payments",
        verbose_name="booking",
    )
    payer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="payments",
        verbose_name="payer",
    )
    amount = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        verbose_name="amount (CHF)",
    )
    status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
        verbose_name="status",
    )
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        default=PaymentMethod.STRIPE,
        verbose_name="payment method",
    )
    stripe_payment_intent_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        verbose_name="Stripe PaymentIntent ID",
    )
    stripe_client_secret = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        verbose_name="Stripe client secret",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="created at",
    )
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="completed at",
    )

    class Meta:
        db_table = "payments"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Payment {self.id} – {self.amount} CHF ({self.status})"

import uuid

from django.conf import settings
from django.db import models

from core.enums import BookingStatus
from matches.models import Match
from venues.models import TimeSlot


class Booking(models.Model):
    """A court booking linked to a time slot and optionally to a match."""

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    time_slot = models.OneToOneField(
        TimeSlot,
        on_delete=models.CASCADE,
        related_name="booking",
        verbose_name="time slot",
    )
    match = models.ForeignKey(
        Match,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="booking",
        verbose_name="match",
    )
    booked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="bookings",
        verbose_name="booked by",
    )
    total_amount = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        verbose_name="total amount",
    )
    per_player_amount = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        verbose_name="per player amount",
    )
    status = models.CharField(
        max_length=20,
        choices=BookingStatus.choices,
        default=BookingStatus.PENDING,
        verbose_name="status",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="created at",
    )
    cancelled_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="cancelled at",
    )

    class Meta:
        db_table = "bookings"
        verbose_name = "booking"
        verbose_name_plural = "bookings"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Booking {self.pk} — {self.time_slot}"

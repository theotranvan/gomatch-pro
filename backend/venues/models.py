import uuid

from django.conf import settings
from django.db import models

from core.enums import CourtSurface, SportType, TimeSlotStatus


class Venue(models.Model):
    """A sports venue containing one or more courts."""

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    name = models.CharField(
        max_length=100,
        verbose_name="venue name",
    )
    address = models.CharField(
        max_length=255,
        verbose_name="address",
    )
    city = models.CharField(
        max_length=100,
        verbose_name="city",
    )
    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        verbose_name="latitude",
    )
    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        verbose_name="longitude",
    )
    phone = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name="phone",
    )
    website_url = models.URLField(
        blank=True,
        null=True,
        verbose_name="website URL",
    )
    image_url = models.URLField(
        blank=True,
        null=True,
        verbose_name="image URL",
    )
    booking_url = models.URLField(
        blank=True,
        null=True,
        verbose_name="booking URL",
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="active",
    )
    managed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="managed_venues",
        verbose_name="managed by",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="created at",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="updated at",
    )

    class Meta:
        db_table = "venues"
        verbose_name = "venue"
        verbose_name_plural = "venues"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.city})"


class Court(models.Model):
    """A single court within a venue."""

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    venue = models.ForeignKey(
        Venue,
        on_delete=models.CASCADE,
        related_name="courts",
        verbose_name="venue",
    )
    name = models.CharField(
        max_length=50,
        verbose_name="court name",
    )
    sport = models.CharField(
        max_length=20,
        choices=SportType.choices,
        verbose_name="sport",
    )
    surface = models.CharField(
        max_length=20,
        choices=CourtSurface.choices,
        verbose_name="surface",
    )
    is_indoor = models.BooleanField(
        default=False,
        verbose_name="indoor",
    )
    hourly_rate = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        verbose_name="hourly rate",
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="active",
    )

    class Meta:
        db_table = "courts"
        verbose_name = "court"
        verbose_name_plural = "courts"
        ordering = ["venue", "name"]

    def __str__(self):
        return f"{self.name} - {self.venue.name}"


class TimeSlot(models.Model):
    """A bookable time slot on a court."""

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    court = models.ForeignKey(
        Court,
        on_delete=models.CASCADE,
        related_name="time_slots",
        verbose_name="court",
    )
    date = models.DateField(
        verbose_name="date",
    )
    start_time = models.TimeField(
        verbose_name="start time",
    )
    end_time = models.TimeField(
        verbose_name="end time",
    )
    status = models.CharField(
        max_length=20,
        choices=TimeSlotStatus.choices,
        default=TimeSlotStatus.AVAILABLE,
        verbose_name="status",
    )
    held_until = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="held until",
    )
    held_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="held_slots",
        verbose_name="held by",
    )

    class Meta:
        db_table = "time_slots"
        verbose_name = "time slot"
        verbose_name_plural = "time slots"
        unique_together = ("court", "date", "start_time")
        ordering = ["date", "start_time"]
        indexes = [
            models.Index(fields=["status", "date"], name="idx_slot_status_date"),
        ]

    def __str__(self):
        return (
            f"{self.court} | {self.date} {self.start_time}-{self.end_time}"
        )

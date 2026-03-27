import uuid

from django.conf import settings
from django.db import models

from accounts.models import PlayerProfile
from core.enums import EventStatus, EventType, RegistrationStatus, SportType
from venues.models import Venue


class Event(models.Model):
    """A Go Match Cup event (cup, social, clinic, etc.)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, verbose_name="name")
    description = models.TextField(blank=True, default="", verbose_name="description")
    event_type = models.CharField(
        max_length=20, choices=EventType.choices, default=EventType.CUP, verbose_name="event type"
    )
    sport = models.CharField(
        max_length=20, choices=SportType.choices, blank=True, null=True, verbose_name="sport"
    )
    date = models.DateField(verbose_name="date")
    end_date = models.DateField(blank=True, null=True, verbose_name="end date")
    start_time = models.TimeField(blank=True, null=True, verbose_name="start time")
    location = models.CharField(max_length=255, verbose_name="location")
    venue = models.ForeignKey(
        Venue, on_delete=models.SET_NULL, blank=True, null=True,
        related_name="events", verbose_name="venue",
    )
    max_attendees = models.IntegerField(blank=True, null=True, verbose_name="max attendees")
    registration_deadline = models.DateTimeField(
        blank=True, null=True, verbose_name="registration deadline"
    )
    price = models.DecimalField(
        max_digits=6, decimal_places=2, default=0, verbose_name="price"
    )
    image_url = models.URLField(blank=True, null=True, verbose_name="image URL")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="created_events", verbose_name="created by",
    )
    status = models.CharField(
        max_length=20, choices=EventStatus.choices, default=EventStatus.UPCOMING, verbose_name="status"
    )
    is_featured = models.BooleanField(default=False, verbose_name="featured")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="created at")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="updated at")

    class Meta:
        db_table = "events"
        ordering = ["date", "start_time"]
        verbose_name = "event"
        verbose_name_plural = "events"

    def __str__(self):
        return self.name

    @property
    def registrations_count(self):
        return self.registrations.exclude(status=RegistrationStatus.CANCELLED).count()

    @property
    def spots_left(self):
        if self.max_attendees is None:
            return None
        return max(0, self.max_attendees - self.registrations_count)


class EventRegistration(models.Model):
    """A player's registration for an event."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(
        Event, on_delete=models.CASCADE, related_name="registrations", verbose_name="event"
    )
    player = models.ForeignKey(
        PlayerProfile, on_delete=models.CASCADE, related_name="event_registrations", verbose_name="player"
    )
    partner = models.ForeignKey(
        PlayerProfile, on_delete=models.SET_NULL, blank=True, null=True,
        related_name="event_partner_registrations", verbose_name="partner",
    )
    status = models.CharField(
        max_length=20, choices=RegistrationStatus.choices,
        default=RegistrationStatus.REGISTERED, verbose_name="status",
    )
    registered_at = models.DateTimeField(auto_now_add=True, verbose_name="registered at")

    class Meta:
        db_table = "event_registrations"
        unique_together = ("event", "player")
        ordering = ["registered_at"]
        verbose_name = "event registration"
        verbose_name_plural = "event registrations"

    def __str__(self):
        return f"{self.player} → {self.event.name}"

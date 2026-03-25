import uuid

from django.conf import settings
from django.db import models

from core.enums import (
    MatchStatus,
    MatchType,
    ParticipantRole,
    ParticipantStatus,
    PlayMode,
    SkillLevel,
    SportType,
    TeamSide,
)


class Match(models.Model):
    """A scheduled match between players."""

    VALID_TRANSITIONS = {
        MatchStatus.DRAFT: [MatchStatus.OPEN, MatchStatus.CONFIRMED],
        MatchStatus.OPEN: [MatchStatus.CONFIRMED, MatchStatus.CANCELLED],
        MatchStatus.CONFIRMED: [MatchStatus.IN_PROGRESS, MatchStatus.CANCELLED],
        MatchStatus.IN_PROGRESS: [MatchStatus.COMPLETED],
        MatchStatus.COMPLETED: [],
        MatchStatus.CANCELLED: [],
    }

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    sport = models.CharField(
        max_length=20,
        choices=SportType.choices,
        verbose_name="sport",
    )
    match_type = models.CharField(
        max_length=20,
        choices=MatchType.choices,
        verbose_name="match type",
    )
    play_mode = models.CharField(
        max_length=20,
        choices=PlayMode.choices,
        verbose_name="play mode",
    )
    status = models.CharField(
        max_length=20,
        choices=MatchStatus.choices,
        default=MatchStatus.DRAFT,
        verbose_name="status",
    )
    scheduled_date = models.DateField(
        verbose_name="scheduled date",
    )
    scheduled_time = models.TimeField(
        verbose_name="scheduled time",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="created_matches",
        verbose_name="created by",
    )
    max_participants = models.IntegerField(
        verbose_name="max participants",
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
        db_table = "matches"
        verbose_name = "match"
        verbose_name_plural = "matches"
        ordering = ["-scheduled_date", "-scheduled_time"]
        indexes = [
            models.Index(
                fields=["status", "scheduled_date"],
                name="idx_match_status_date",
            ),
        ]

    def __str__(self):
        return (
            f"{self.get_sport_display()} {self.get_match_type_display()} "
            f"- {self.scheduled_date}"
        )

    @property
    def current_participants_count(self):
        """Number of accepted participants."""
        return self.participants.filter(
            status=ParticipantStatus.ACCEPTED,
        ).count()

    @property
    def is_full(self):
        """Whether the match has reached max participants."""
        return self.current_participants_count >= self.max_participants

    def can_transition_to(self, new_status):
        """Check if the match can transition to the given status."""
        allowed = self.VALID_TRANSITIONS.get(self.status, [])
        return new_status in allowed

    def save(self, *args, **kwargs):
        # Auto-calculate max_participants from match_type
        if not self.max_participants:
            self.max_participants = (
                2 if self.match_type == MatchType.SINGLES else 4
            )
        super().save(*args, **kwargs)


class MatchParticipant(models.Model):
    """A player participating in a match."""

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    match = models.ForeignKey(
        Match,
        on_delete=models.CASCADE,
        related_name="participants",
        verbose_name="match",
    )
    player = models.ForeignKey(
        "accounts.PlayerProfile",
        on_delete=models.CASCADE,
        related_name="match_participations",
        verbose_name="player",
    )
    role = models.CharField(
        max_length=20,
        choices=ParticipantRole.choices,
        verbose_name="role",
    )
    status = models.CharField(
        max_length=20,
        choices=ParticipantStatus.choices,
        default=ParticipantStatus.PENDING,
        verbose_name="status",
    )
    team = models.CharField(
        max_length=10,
        choices=TeamSide.choices,
        blank=True,
        null=True,
        verbose_name="team side",
    )
    joined_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="joined at",
    )

    class Meta:
        db_table = "match_participants"
        verbose_name = "match participant"
        verbose_name_plural = "match participants"
        unique_together = ("match", "player")

    def __str__(self):
        return f"{self.player} in {self.match}"


class OpenMatch(models.Model):
    """An open match that players can discover and join."""

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    match = models.OneToOneField(
        Match,
        on_delete=models.CASCADE,
        related_name="open_match",
        verbose_name="match",
    )
    required_level_min = models.CharField(
        max_length=20,
        choices=SkillLevel.choices,
        blank=True,
        null=True,
        verbose_name="minimum skill level",
    )
    required_level_max = models.CharField(
        max_length=20,
        choices=SkillLevel.choices,
        blank=True,
        null=True,
        verbose_name="maximum skill level",
    )
    description = models.TextField(
        max_length=500,
        blank=True,
        default="",
        verbose_name="description",
    )
    expires_at = models.DateTimeField(
        verbose_name="expires at",
    )

    class Meta:
        db_table = "open_matches"
        verbose_name = "open match"
        verbose_name_plural = "open matches"
        ordering = ["-match__scheduled_date"]

    def __str__(self):
        return f"Open: {self.match}"

    @property
    def is_full(self):
        """Delegate to associated match."""
        return self.match.is_full

    @property
    def spots_left(self):
        """Number of open spots remaining."""
        return self.match.max_participants - self.match.current_participants_count

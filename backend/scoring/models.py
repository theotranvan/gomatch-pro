import uuid

from django.conf import settings
from django.db import models

from core.enums import ScoreStatus, SportType


class Score(models.Model):
    """Score submitted for a completed match."""

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    match = models.OneToOneField(
        "matches.Match",
        on_delete=models.CASCADE,
        related_name="score",
        verbose_name="match",
    )
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="submitted_scores",
        verbose_name="submitted by",
    )
    sets = models.JSONField(
        verbose_name="sets",
        help_text='Example: [{"team_a": 6, "team_b": 4}, {"team_a": 3, "team_b": 6}]',
    )
    winner = models.ForeignKey(
        "accounts.PlayerProfile",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="won_scores",
        verbose_name="winner",
    )
    status = models.CharField(
        max_length=20,
        choices=ScoreStatus.choices,
        default=ScoreStatus.PENDING,
        verbose_name="status",
    )
    confirmed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="confirmed_scores",
        verbose_name="confirmed by",
    )
    confirmed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="confirmed at",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="created at",
    )

    class Meta:
        db_table = "scores"
        verbose_name = "score"
        verbose_name_plural = "scores"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Score for {self.match} ({self.get_status_display()})"


class Ranking(models.Model):
    """Player ranking for a given sport."""

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    player = models.ForeignKey(
        "accounts.PlayerProfile",
        on_delete=models.CASCADE,
        related_name="rankings",
        verbose_name="player",
    )
    sport = models.CharField(
        max_length=20,
        choices=SportType.choices,
        verbose_name="sport",
    )
    points = models.IntegerField(
        default=1000,
        verbose_name="points",
    )
    wins = models.IntegerField(
        default=0,
        verbose_name="wins",
    )
    losses = models.IntegerField(
        default=0,
        verbose_name="losses",
    )
    rank_position = models.IntegerField(
        null=True,
        blank=True,
        verbose_name="rank position",
    )
    last_match_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="last match at",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="updated at",
    )

    class Meta:
        db_table = "rankings"
        verbose_name = "ranking"
        verbose_name_plural = "rankings"
        unique_together = ("player", "sport")
        ordering = ["-points"]

    def __str__(self):
        return (
            f"{self.player} - {self.get_sport_display()} "
            f"({self.points} pts)"
        )

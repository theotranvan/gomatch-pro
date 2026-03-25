import uuid

from django.conf import settings
from django.db import models

from core.enums import (
    MatchType,
    SkillLevel,
    SportType,
    TournamentFormat,
    TournamentMatchStatus,
    TournamentParticipantStatus,
    TournamentRoundStatus,
    TournamentStatus,
)


class Tournament(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    sport = models.CharField(max_length=20, choices=SportType.choices)
    match_type = models.CharField(max_length=20, choices=MatchType.choices)
    format = models.CharField(max_length=30, choices=TournamentFormat.choices)
    max_participants = models.IntegerField()
    required_level_min = models.CharField(
        max_length=20, choices=SkillLevel.choices, blank=True, null=True,
    )
    status = models.CharField(
        max_length=20, choices=TournamentStatus.choices,
        default=TournamentStatus.REGISTRATION,
    )
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    venue = models.ForeignKey(
        "venues.Venue", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="tournaments",
    )
    entry_fee = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="created_tournaments",
    )
    description = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "tournaments"
        ordering = ["-start_date"]

    def __str__(self):
        return f"{self.name} ({self.get_sport_display()})"

    @property
    def current_participants_count(self):
        return self.participants.count()

    @property
    def is_full(self):
        return self.current_participants_count >= self.max_participants


class TournamentParticipant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tournament = models.ForeignKey(
        Tournament, on_delete=models.CASCADE, related_name="participants",
    )
    player = models.ForeignKey(
        "accounts.PlayerProfile", on_delete=models.CASCADE,
        related_name="tournament_participations",
    )
    partner = models.ForeignKey(
        "accounts.PlayerProfile", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="tournament_partner_participations",
    )
    seed = models.IntegerField(null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=TournamentParticipantStatus.choices,
        default=TournamentParticipantStatus.REGISTERED,
    )
    registered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "tournament_participants"
        unique_together = ("tournament", "player")

    def __str__(self):
        return f"{self.player} in {self.tournament}"


class TournamentRound(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tournament = models.ForeignKey(
        Tournament, on_delete=models.CASCADE, related_name="rounds",
    )
    round_number = models.IntegerField()
    round_name = models.CharField(max_length=50)
    status = models.CharField(
        max_length=20, choices=TournamentRoundStatus.choices,
        default=TournamentRoundStatus.PENDING,
    )

    class Meta:
        db_table = "tournament_rounds"
        ordering = ["round_number"]
        unique_together = ("tournament", "round_number")

    def __str__(self):
        return f"{self.tournament.name} — {self.round_name}"


class TournamentMatch(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    round = models.ForeignKey(
        TournamentRound, on_delete=models.CASCADE, related_name="matches",
    )
    match = models.OneToOneField(
        "matches.Match", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="tournament_match",
    )
    position = models.IntegerField()
    participant_a = models.ForeignKey(
        TournamentParticipant, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="matches_as_a",
    )
    participant_b = models.ForeignKey(
        TournamentParticipant, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="matches_as_b",
    )
    winner = models.ForeignKey(
        TournamentParticipant, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="won_tournament_matches",
    )
    status = models.CharField(
        max_length=20, choices=TournamentMatchStatus.choices,
        default=TournamentMatchStatus.SCHEDULED,
    )

    class Meta:
        db_table = "tournament_matches"
        ordering = ["round__round_number", "position"]

    def __str__(self):
        a = self.participant_a or "BYE"
        b = self.participant_b or "BYE"
        return f"{self.round.round_name} #{self.position}: {a} vs {b}"

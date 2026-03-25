from django.contrib import admin

from competitions.models import (
    Tournament,
    TournamentMatch,
    TournamentParticipant,
    TournamentRound,
)


class TournamentParticipantInline(admin.TabularInline):
    model = TournamentParticipant
    extra = 0
    readonly_fields = ["id", "registered_at"]


class TournamentRoundInline(admin.TabularInline):
    model = TournamentRound
    extra = 0
    readonly_fields = ["id"]


@admin.register(Tournament)
class TournamentAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "sport",
        "format",
        "status",
        "max_participants",
        "start_date",
        "created_at",
    ]
    list_filter = ["sport", "format", "status"]
    search_fields = ["name"]
    inlines = [TournamentParticipantInline, TournamentRoundInline]


class TournamentMatchInline(admin.TabularInline):
    model = TournamentMatch
    extra = 0
    readonly_fields = ["id"]


@admin.register(TournamentRound)
class TournamentRoundAdmin(admin.ModelAdmin):
    list_display = ["tournament", "round_number", "round_name", "status"]
    list_filter = ["status"]
    inlines = [TournamentMatchInline]


@admin.register(TournamentParticipant)
class TournamentParticipantAdmin(admin.ModelAdmin):
    list_display = ["tournament", "player", "seed", "status", "registered_at"]
    list_filter = ["status"]


@admin.register(TournamentMatch)
class TournamentMatchAdmin(admin.ModelAdmin):
    list_display = ["round", "position", "participant_a", "participant_b", "winner", "status"]
    list_filter = ["status"]

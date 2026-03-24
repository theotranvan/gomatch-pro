from django.contrib import admin
from django.utils.html import format_html

from core.enums import ScoreStatus
from scoring.models import Ranking, Score


@admin.register(Score)
class ScoreAdmin(admin.ModelAdmin):
    """Admin configuration for Score model."""

    list_display = (
        "match",
        "status_badge",
        "sets_display",
        "winner",
        "submitted_by",
        "confirmed_by",
        "confirmed_at",
        "created_at",
    )
    list_filter = ("status", "match__sport")
    search_fields = (
        "submitted_by__email",
        "confirmed_by__email",
        "winner__first_name",
        "winner__last_name",
    )
    readonly_fields = ("id", "created_at")
    list_select_related = ("match", "submitted_by", "confirmed_by", "winner")
    list_per_page = 25
    date_hierarchy = "created_at"

    fieldsets = (
        (None, {"fields": ("match", "status")}),
        ("Score details", {"fields": ("sets", "winner")}),
        ("Submission", {"fields": ("submitted_by", "confirmed_by", "confirmed_at")}),
        ("Metadata", {"fields": ("id", "created_at"), "classes": ("collapse",)}),
    )

    @admin.display(description="Status")
    def status_badge(self, obj):
        colors = {
            ScoreStatus.PENDING: "#ffc107",
            ScoreStatus.CONFIRMED: "#28a745",
            ScoreStatus.DISPUTED: "#dc3545",
        }
        color = colors.get(obj.status, "#6c757d")
        return format_html(
            '<span style="background:{}; color:#fff; padding:2px 8px; '
            'border-radius:4px; font-size:11px">{}</span>',
            color,
            obj.get_status_display(),
        )

    @admin.display(description="Sets")
    def sets_display(self, obj):
        if not obj.sets:
            return "—"
        parts = [f"{s['team_a']}-{s['team_b']}" for s in obj.sets]
        return " / ".join(parts)


@admin.register(Ranking)
class RankingAdmin(admin.ModelAdmin):
    """Admin configuration for Ranking model."""

    list_display = (
        "player_name",
        "sport",
        "points",
        "wins",
        "losses",
        "win_rate",
        "rank_position",
        "last_match_at",
    )
    list_filter = ("sport",)
    search_fields = (
        "player__first_name",
        "player__last_name",
        "player__user__email",
    )
    readonly_fields = ("id", "updated_at")
    list_select_related = ("player", "player__user")
    ordering = ("sport", "rank_position")
    list_per_page = 25

    @admin.display(description="Player", ordering="player__first_name")
    def player_name(self, obj):
        name = f"{obj.player.first_name} {obj.player.last_name}".strip()
        return name or obj.player.user.email

    @admin.display(description="Win rate")
    def win_rate(self, obj):
        total = obj.wins + obj.losses
        if total == 0:
            return "—"
        rate = (obj.wins / total) * 100
        color = "#28a745" if rate >= 50 else "#dc3545"
        return format_html(
            '<span style="color:{}">{}</span>', color, f"{rate:.0f}%"
        )

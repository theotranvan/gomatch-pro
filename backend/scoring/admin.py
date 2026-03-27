from django.contrib import admin
from django.utils.html import format_html

from core.enums import PlayMode, ScoreStatus
from scoring.models import Ranking, Score
from scoring.services import RankingService


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
    readonly_fields = ("id", "created_at", "resolved_by")
    list_select_related = ("match", "submitted_by", "confirmed_by", "winner", "resolved_by")
    list_per_page = 25
    date_hierarchy = "created_at"
    actions = ["resolve_confirm", "resolve_reject"]

    fieldsets = (
        (None, {"fields": ("match", "status")}),
        ("Score details", {"fields": ("sets", "winner")}),
        ("Submission", {"fields": ("submitted_by", "confirmed_by", "confirmed_at")}),
        ("Resolution", {"fields": ("admin_note", "resolved_by")}),
        ("Metadata", {"fields": ("id", "created_at"), "classes": ("collapse",)}),
    )

    @admin.display(description="Status")
    def status_badge(self, obj):
        colors = {
            ScoreStatus.PENDING: "#ffc107",
            ScoreStatus.CONFIRMED: "#28a745",
            ScoreStatus.DISPUTED: "#dc3545",
            ScoreStatus.EXPIRED: "#6c757d",
            ScoreStatus.REJECTED: "#dc3545",
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

    @admin.action(description="Résoudre le litige → Confirmer le score")
    def resolve_confirm(self, request, queryset):
        from django.utils import timezone
        count = 0
        for score in queryset.filter(status=ScoreStatus.DISPUTED):
            score.status = ScoreStatus.CONFIRMED
            score.confirmed_by = request.user
            score.confirmed_at = timezone.now()
            score.resolved_by = request.user
            score.admin_note = "Confirmé via l'admin"
            score.save(update_fields=[
                "status", "confirmed_by", "confirmed_at",
                "resolved_by", "admin_note",
            ])
            if score.match.play_mode == PlayMode.COMPETITIVE:
                RankingService.update_rankings(score)
            count += 1
        self.message_user(request, f"{count} score(s) confirmé(s).")

    @admin.action(description="Résoudre le litige → Rejeter le score")
    def resolve_reject(self, request, queryset):
        count = 0
        for score in queryset.filter(status=ScoreStatus.DISPUTED):
            score.status = ScoreStatus.REJECTED
            score.resolved_by = request.user
            score.admin_note = "Rejeté via l'admin"
            score.save(update_fields=["status", "resolved_by", "admin_note"])
            count += 1
        self.message_user(request, f"{count} score(s) rejeté(s).")


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

from django.contrib import admin
from django.db.models import Count, Q
from django.utils.html import format_html

from core.enums import MatchStatus, ParticipantStatus
from matches.models import Match, MatchParticipant, OpenMatch


class MatchParticipantInline(admin.TabularInline):
    """Inline admin for participants within a match."""

    model = MatchParticipant
    extra = 0
    fields = ("player", "role", "status", "team", "joined_at")
    readonly_fields = ("joined_at",)
    raw_id_fields = ("player",)


@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    """Admin view for Match with inline participants."""

    inlines = [MatchParticipantInline]
    list_display = (
        "__str__",
        "sport",
        "match_type",
        "play_mode",
        "status_badge",
        "scheduled_date",
        "scheduled_time",
        "participant_count",
        "created_by",
    )
    list_filter = ("sport", "match_type", "status", "play_mode", "scheduled_date")
    search_fields = ("created_by__email", "id")
    ordering = ("-scheduled_date", "-scheduled_time")
    readonly_fields = ("id", "created_at", "updated_at")
    date_hierarchy = "scheduled_date"
    list_per_page = 25
    list_select_related = ("created_by",)
    actions = ["mark_confirmed", "mark_completed", "cancel_matches"]

    fieldsets = (
        (
            "Match details",
            {"fields": ("sport", "match_type", "play_mode", "max_participants")},
        ),
        ("Schedule", {"fields": ("scheduled_date", "scheduled_time")}),
        ("Status", {"fields": ("status", "created_by")}),
        (
            "Metadata",
            {"fields": ("id", "created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .annotate(
                accepted_count=Count(
                    "participants",
                    filter=Q(participants__status=ParticipantStatus.ACCEPTED),
                ),
            )
        )

    @admin.display(description="Participants", ordering="accepted_count")
    def participant_count(self, obj):
        count = obj.accepted_count
        total = obj.max_participants
        color = "#28a745" if count >= total else "#6c757d"
        return format_html(
            '<span style="color:{}">{} / {}</span>', color, count, total
        )

    @admin.display(description="Status")
    def status_badge(self, obj):
        colors = {
            MatchStatus.DRAFT: "#6c757d",
            MatchStatus.CONFIRMED: "#007bff",
            MatchStatus.IN_PROGRESS: "#ffc107",
            MatchStatus.COMPLETED: "#28a745",
            MatchStatus.CANCELLED: "#dc3545",
        }
        color = colors.get(obj.status, "#6c757d")
        return format_html(
            '<span style="background:{}; color:#fff; padding:2px 8px; '
            'border-radius:4px; font-size:11px">{}</span>',
            color,
            obj.get_status_display(),
        )

    @admin.action(description="Mark selected matches as confirmed")
    def mark_confirmed(self, request, queryset):
        updated = queryset.filter(status=MatchStatus.DRAFT).update(
            status=MatchStatus.CONFIRMED
        )
        self.message_user(request, f"{updated} match(es) confirmed.")

    @admin.action(description="Mark selected matches as completed")
    def mark_completed(self, request, queryset):
        updated = queryset.exclude(status=MatchStatus.CANCELLED).update(
            status=MatchStatus.COMPLETED
        )
        self.message_user(request, f"{updated} match(es) completed.")

    @admin.action(description="Cancel selected matches")
    def cancel_matches(self, request, queryset):
        updated = queryset.exclude(status=MatchStatus.COMPLETED).update(
            status=MatchStatus.CANCELLED
        )
        self.message_user(request, f"{updated} match(es) cancelled.")


@admin.register(OpenMatch)
class OpenMatchAdmin(admin.ModelAdmin):
    """Admin view for OpenMatch."""

    list_display = (
        "match",
        "required_level_min",
        "required_level_max",
        "spots_left_display",
        "expires_at",
        "is_expired",
    )
    list_filter = ("required_level_min", "required_level_max", "match__sport")
    search_fields = ("match__created_by__email", "description")
    readonly_fields = ("id",)
    list_select_related = ("match",)
    list_per_page = 25

    @admin.display(description="Spots left")
    def spots_left_display(self, obj):
        left = obj.spots_left
        color = "#dc3545" if left == 0 else "#28a745"
        return format_html('<span style="color:{}">{}</span>', color, left)

    @admin.display(description="Expired?", boolean=True)
    def is_expired(self, obj):
        from django.utils import timezone
        return obj.expires_at and obj.expires_at < timezone.now()


@admin.register(MatchParticipant)
class MatchParticipantAdmin(admin.ModelAdmin):
    """Standalone admin for MatchParticipant (for searching / filtering)."""

    list_display = ("player", "match", "role", "status", "team", "joined_at")
    list_filter = ("role", "status", "team")
    search_fields = (
        "player__first_name",
        "player__last_name",
        "match__created_by__email",
    )
    list_select_related = ("player", "match")
    ordering = ("-joined_at",)
    list_per_page = 25

from django.contrib import admin
from django.db.models import Count
from django.utils.html import format_html

from chat.models import ChatMessage, ChatRoom


class ChatMessageInline(admin.TabularInline):
    """Recent messages inline for ChatRoom."""

    model = ChatMessage
    extra = 0
    max_num = 10
    fields = ("sender", "short_content", "message_type", "is_read", "created_at")
    readonly_fields = ("sender", "short_content", "message_type", "is_read", "created_at")
    ordering = ("-created_at",)

    def has_add_permission(self, request, obj=None):
        return False

    @admin.display(description="Content")
    def short_content(self, obj):
        if len(obj.content) > 80:
            return obj.content[:80] + "…"
        return obj.content


@admin.register(ChatRoom)
class ChatRoomAdmin(admin.ModelAdmin):
    """Admin configuration for ChatRoom model."""

    inlines = [ChatMessageInline]
    list_display = (
        "id_short",
        "room_type",
        "match",
        "participant_count",
        "message_count",
        "is_active",
        "created_at",
    )
    list_filter = ("room_type", "is_active")
    search_fields = ("match__created_by__email", "participants__email")
    readonly_fields = ("id", "created_at")
    list_per_page = 25
    actions = ["activate_rooms", "deactivate_rooms"]

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .annotate(
                num_participants=Count("participants", distinct=True),
                num_messages=Count("messages", distinct=True),
            )
        )

    @admin.display(description="ID")
    def id_short(self, obj):
        return str(obj.id)[:8] + "…"

    @admin.display(description="Participants", ordering="num_participants")
    def participant_count(self, obj):
        return obj.num_participants

    @admin.display(description="Messages", ordering="num_messages")
    def message_count(self, obj):
        return obj.num_messages

    @admin.action(description="Activate selected rooms")
    def activate_rooms(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f"{updated} room(s) activated.")

    @admin.action(description="Deactivate selected rooms")
    def deactivate_rooms(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f"{updated} room(s) deactivated.")


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    """Admin configuration for ChatMessage model."""

    list_display = (
        "id_short",
        "room",
        "sender",
        "short_content",
        "message_type",
        "is_read",
        "created_at",
    )
    list_filter = ("message_type", "is_read")
    search_fields = ("sender__email", "content")
    readonly_fields = ("id", "created_at")
    list_select_related = ("room", "sender")
    ordering = ("-created_at",)
    list_per_page = 50
    date_hierarchy = "created_at"
    actions = ["mark_as_read"]

    @admin.display(description="ID")
    def id_short(self, obj):
        return str(obj.id)[:8] + "…"

    @admin.display(description="Content")
    def short_content(self, obj):
        if len(obj.content) > 100:
            return obj.content[:100] + "…"
        return obj.content

    @admin.action(description="Mark selected messages as read")
    def mark_as_read(self, request, queryset):
        updated = queryset.update(is_read=True)
        self.message_user(request, f"{updated} message(s) marked as read.")

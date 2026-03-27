from django.contrib import admin
from django.core.cache import cache
from django.db.models import Count

from venues.models import Court, TimeSlot, Venue


class CourtInline(admin.TabularInline):
    """Inline admin for courts within a venue."""

    model = Court
    extra = 1
    fields = ("name", "sport", "surface", "is_indoor", "hourly_rate", "is_active")
    show_change_link = True


@admin.register(Venue)
class VenueAdmin(admin.ModelAdmin):
    """Admin view for Venue with inline courts."""

    inlines = [CourtInline]
    list_display = (
        "name",
        "city",
        "court_count",
        "phone",
        "is_active",
        "managed_by",
        "created_at",
    )
    list_filter = ("city", "is_active")
    search_fields = ("name", "city", "address")
    ordering = ("name",)
    readonly_fields = ("id", "created_at", "updated_at")
    list_per_page = 25
    actions = ["activate_venues", "deactivate_venues"]

    fieldsets = (
        (None, {"fields": ("name", "address", "city")}),
        ("Coordinates", {"fields": ("latitude", "longitude"), "classes": ("collapse",)}),
        ("Contact", {"fields": ("phone", "website_url", "image_url")}),
        ("Management", {"fields": ("managed_by", "is_active")}),
        (
            "Metadata",
            {"fields": ("id", "created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .annotate(num_courts=Count("courts"))
        )

    @admin.display(description="Courts", ordering="num_courts")
    def court_count(self, obj):
        return obj.num_courts

    @admin.action(description="Activate selected venues")
    def activate_venues(self, request, queryset):
        updated = queryset.update(is_active=True)
        cache.delete("venues_active")
        self.message_user(request, f"{updated} venue(s) activated.")

    @admin.action(description="Deactivate selected venues")
    def deactivate_venues(self, request, queryset):
        updated = queryset.update(is_active=False)
        cache.delete("venues_active")
        self.message_user(request, f"{updated} venue(s) deactivated.")

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        cache.delete("venues_active")

    def delete_model(self, request, obj):
        super().delete_model(request, obj)
        cache.delete("venues_active")


@admin.register(Court)
class CourtAdmin(admin.ModelAdmin):
    """Standalone admin view for Court (for filtering / searching)."""

    list_display = ("name", "venue", "sport", "surface", "is_indoor", "hourly_rate", "is_active")
    list_filter = ("sport", "surface", "is_indoor", "is_active")
    search_fields = ("name", "venue__name", "venue__city")
    list_select_related = ("venue",)
    ordering = ("venue__name", "name")
    list_per_page = 25


@admin.register(TimeSlot)
class TimeSlotAdmin(admin.ModelAdmin):
    """Admin view for TimeSlot with filters."""

    list_display = ("court", "date", "start_time", "end_time", "status", "held_by")
    list_filter = ("court", "date", "status")
    search_fields = ("court__name", "court__venue__name")
    list_select_related = ("court", "court__venue", "held_by")
    ordering = ("date", "start_time")
    list_per_page = 50

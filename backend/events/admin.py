from django.contrib import admin

from events.models import Event, EventRegistration


class EventRegistrationInline(admin.TabularInline):
    model = EventRegistration
    extra = 0
    readonly_fields = ("id", "registered_at")


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ("name", "event_type", "sport", "date", "status", "is_featured", "registrations_count")
    list_filter = ("event_type", "sport", "status", "is_featured")
    search_fields = ("name", "location")
    readonly_fields = ("id", "created_at", "updated_at")
    inlines = [EventRegistrationInline]


@admin.register(EventRegistration)
class EventRegistrationAdmin(admin.ModelAdmin):
    list_display = ("player", "event", "status", "registered_at")
    list_filter = ("status",)
    readonly_fields = ("id", "registered_at")

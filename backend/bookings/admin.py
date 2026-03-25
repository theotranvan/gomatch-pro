from django.contrib import admin

from bookings.models import Booking


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "time_slot",
        "booked_by",
        "total_amount",
        "per_player_amount",
        "status",
        "created_at",
        "cancelled_at",
    )
    list_filter = ("status", "created_at")
    search_fields = ("booked_by__email", "time_slot__court__name")
    list_select_related = ("time_slot", "booked_by")
    ordering = ("-created_at",)
    list_per_page = 25

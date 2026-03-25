from django.urls import path

from bookings.views import (
    BookingDetailView,
    CancelBookingView,
    CreateBookingView,
    MyBookingsView,
)

app_name = "bookings"

urlpatterns = [
    path("", CreateBookingView.as_view(), name="booking-create"),
    path("my/", MyBookingsView.as_view(), name="booking-my"),
    path("<uuid:pk>/", BookingDetailView.as_view(), name="booking-detail"),
    path("<uuid:pk>/cancel/", CancelBookingView.as_view(), name="booking-cancel"),
]

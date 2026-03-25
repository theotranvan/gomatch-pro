from django.urls import path

from venues.views import (
    HoldSlotView,
    ReleaseSlotView,
    TimeSlotListView,
    VenueDetailView,
    VenueListView,
)

app_name = "venues"

urlpatterns = [
    path("", VenueListView.as_view(), name="venue-list"),
    path("<uuid:pk>/", VenueDetailView.as_view(), name="venue-detail"),
    path(
        "<uuid:venue_id>/courts/<uuid:court_id>/slots/",
        TimeSlotListView.as_view(),
        name="timeslot-list",
    ),
    path(
        "courts/<uuid:court_id>/slots/hold/",
        HoldSlotView.as_view(),
        name="timeslot-hold",
    ),
    path(
        "slots/<uuid:slot_id>/release/",
        ReleaseSlotView.as_view(),
        name="timeslot-release",
    ),
]

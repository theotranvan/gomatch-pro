from django.urls import path

from venues.views import VenueListView, VenueDetailView

app_name = "venues"

urlpatterns = [
    path("", VenueListView.as_view(), name="venue-list"),
    path("<uuid:pk>/", VenueDetailView.as_view(), name="venue-detail"),
]

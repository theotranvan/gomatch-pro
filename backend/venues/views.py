from django.db.models import Count
from rest_framework import generics, permissions
from drf_spectacular.utils import extend_schema

from venues.filters import VenueFilter
from venues.models import Venue
from venues.serializers import VenueListSerializer, VenueDetailSerializer


@extend_schema(tags=["Venues"])
class VenueListView(generics.ListAPIView):
    """
    GET /api/venues/
    List all active venues. Filterable by city and sport.
    """

    serializer_class = VenueListSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_class = VenueFilter

    def get_queryset(self):
        return (
            Venue.objects.filter(is_active=True)
            .annotate(court_count=Count("courts"))
            .order_by("name")
        )


@extend_schema(tags=["Venues"])
class VenueDetailView(generics.RetrieveAPIView):
    """
    GET /api/venues/:id/
    Retrieve venue details with all its courts.
    """

    serializer_class = VenueDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "pk"

    def get_queryset(self):
        return Venue.objects.filter(is_active=True).prefetch_related("courts")

from datetime import timedelta

from django.db.models import Count
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from core.enums import TimeSlotStatus
from venues.filters import VenueFilter
from venues.models import Court, TimeSlot, Venue
from venues.serializers import (
    TimeSlotSerializer,
    VenueDetailSerializer,
    VenueListSerializer,
)


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


@extend_schema(tags=["Venues"])
class TimeSlotListView(generics.ListAPIView):
    """
    GET /api/venues/:venue_id/courts/:court_id/slots/?date=YYYY-MM-DD
    List available time slots for a court on a given date.
    """

    serializer_class = TimeSlotSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        court_id = self.kwargs["court_id"]
        qs = TimeSlot.objects.filter(court_id=court_id)
        date = self.request.query_params.get("date")
        if date:
            qs = qs.filter(date=date)
        return qs


@extend_schema(tags=["Venues"])
class HoldSlotView(APIView):
    """
    POST /api/venues/courts/:court_id/slots/hold/
    Hold an available slot for 60 minutes.
    Body: {"slot_id": "<uuid>"}
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, court_id):
        slot_id = request.data.get("slot_id")
        if not slot_id:
            return Response(
                {"detail": "slot_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            slot = TimeSlot.objects.get(pk=slot_id, court_id=court_id)
        except TimeSlot.DoesNotExist:
            return Response(
                {"detail": "Slot not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if slot.status != TimeSlotStatus.AVAILABLE:
            return Response(
                {"detail": "Slot is not available."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        slot.status = TimeSlotStatus.HELD
        slot.held_until = timezone.now() + timedelta(minutes=60)
        slot.held_by = request.user
        slot.save(update_fields=["status", "held_until", "held_by"])
        return Response(TimeSlotSerializer(slot).data)


@extend_schema(tags=["Venues"])
class ReleaseSlotView(APIView):
    """
    POST /api/venues/slots/:slot_id/release/
    Release a held slot back to available.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, slot_id):
        try:
            slot = TimeSlot.objects.get(pk=slot_id)
        except TimeSlot.DoesNotExist:
            return Response(
                {"detail": "Slot not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if slot.status != TimeSlotStatus.HELD:
            return Response(
                {"detail": "Slot is not held."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if slot.held_by != request.user and not request.user.is_staff:
            return Response(
                {"detail": "You can only release your own holds."},
                status=status.HTTP_403_FORBIDDEN,
            )
        slot.status = TimeSlotStatus.AVAILABLE
        slot.held_until = None
        slot.held_by = None
        slot.save(update_fields=["status", "held_until", "held_by"])
        return Response(TimeSlotSerializer(slot).data)

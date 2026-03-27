from django_filters import rest_framework as filters
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from events.models import Event, EventRegistration
from events.serializers import (
    EventCreateSerializer,
    EventDetailSerializer,
    EventListSerializer,
    EventRegistrationSerializer,
    RegisterForEventSerializer,
)
from events.services import EventService


class EventFilter(filters.FilterSet):
    event_type = filters.CharFilter(field_name="event_type")
    sport = filters.CharFilter(field_name="sport")
    status = filters.CharFilter(field_name="status")

    class Meta:
        model = Event
        fields = ["event_type", "sport", "status"]


class EventListCreateView(generics.ListCreateAPIView):
    """GET /api/events/ — list events; POST — create (admin only)."""
    queryset = Event.objects.all()
    filterset_class = EventFilter

    def get_serializer_class(self):
        if self.request.method == "POST":
            return EventCreateSerializer
        return EventListSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class EventDetailView(generics.RetrieveAPIView):
    """GET /api/events/:id/."""
    queryset = Event.objects.prefetch_related("registrations__player", "registrations__partner")
    serializer_class = EventDetailSerializer
    permission_classes = [IsAuthenticated]


class RegisterForEventView(APIView):
    """POST /api/events/:id/register/."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        serializer = RegisterForEventSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reg = EventService.register_for_event(
            request.user, pk, partner_id=serializer.validated_data.get("partner_id"),
        )
        return Response(
            EventRegistrationSerializer(reg).data, status=status.HTTP_201_CREATED,
        )


class CancelRegistrationView(APIView):
    """POST /api/events/:id/cancel-registration/."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        reg = EventService.cancel_registration(request.user, pk)
        return Response(EventRegistrationSerializer(reg).data)


class MyRegistrationsView(generics.ListAPIView):
    """GET /api/events/my/ — current user's event registrations."""
    serializer_class = EventRegistrationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            EventRegistration.objects.filter(player=self.request.user.profile)
            .select_related("event", "player", "partner")
            .order_by("-registered_at")
        )

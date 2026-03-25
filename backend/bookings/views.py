from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from bookings.models import Booking
from bookings.serializers import BookingSerializer, CreateBookingSerializer
from bookings.services import BookingService


@extend_schema(tags=["Bookings"])
class CreateBookingView(APIView):
    """
    POST /api/bookings/
    Create a booking for a time slot.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = CreateBookingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            booking = BookingService.create_booking(
                user=request.user,
                time_slot_id=serializer.validated_data["time_slot_id"],
                match_id=serializer.validated_data.get("match_id"),
            )
        except ValueError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            BookingSerializer(booking).data,
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=["Bookings"])
class MyBookingsView(generics.ListAPIView):
    """
    GET /api/bookings/my/
    List bookings for the authenticated user.
    """

    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Booking.objects.filter(
            booked_by=self.request.user,
        ).select_related("time_slot", "match")


@extend_schema(tags=["Bookings"])
class BookingDetailView(generics.RetrieveAPIView):
    """
    GET /api/bookings/:id/
    Retrieve a single booking.
    """

    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "pk"

    def get_queryset(self):
        return Booking.objects.filter(
            booked_by=self.request.user,
        ).select_related("time_slot", "match")


@extend_schema(tags=["Bookings"])
class CancelBookingView(APIView):
    """
    POST /api/bookings/:id/cancel/
    Cancel a booking.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            booking = BookingService.cancel_booking(
                user=request.user,
                booking_id=pk,
            )
        except ValueError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(BookingSerializer(booking).data)

from rest_framework import serializers

from bookings.models import Booking


class BookingSerializer(serializers.ModelSerializer):
    """Full serializer for Booking model."""

    class Meta:
        model = Booking
        fields = [
            "id",
            "time_slot",
            "match",
            "booked_by",
            "total_amount",
            "per_player_amount",
            "status",
            "created_at",
            "cancelled_at",
        ]
        read_only_fields = [
            "id",
            "booked_by",
            "total_amount",
            "per_player_amount",
            "status",
            "created_at",
            "cancelled_at",
        ]


class CreateBookingSerializer(serializers.Serializer):
    """Input serializer for booking creation."""

    time_slot_id = serializers.UUIDField()
    match_id = serializers.UUIDField(required=False, allow_null=True)

from rest_framework import serializers

from accounts.serializers import ConnectionPlayerSerializer
from events.models import Event, EventRegistration


class EventRegistrationSerializer(serializers.ModelSerializer):
    player = ConnectionPlayerSerializer(read_only=True)
    partner = ConnectionPlayerSerializer(read_only=True)
    event = serializers.UUIDField(source="event_id", read_only=True)

    class Meta:
        model = EventRegistration
        fields = ["id", "event", "player", "partner", "status", "registered_at"]
        read_only_fields = fields


class EventListSerializer(serializers.ModelSerializer):
    registrations_count = serializers.IntegerField(read_only=True)
    spots_left = serializers.IntegerField(read_only=True)

    class Meta:
        model = Event
        fields = [
            "id", "name", "event_type", "sport", "date", "end_date",
            "start_time", "location", "price", "image_url", "status",
            "is_featured", "max_attendees", "registrations_count", "spots_left",
        ]
        read_only_fields = fields


class EventDetailSerializer(serializers.ModelSerializer):
    registrations_count = serializers.IntegerField(read_only=True)
    spots_left = serializers.IntegerField(read_only=True)
    registrations = EventRegistrationSerializer(many=True, read_only=True)

    class Meta:
        model = Event
        fields = [
            "id", "name", "description", "event_type", "sport",
            "date", "end_date", "start_time", "location", "venue",
            "max_attendees", "registration_deadline", "price",
            "image_url", "status", "is_featured",
            "registrations_count", "spots_left", "registrations",
            "created_by", "created_at", "updated_at",
        ]
        read_only_fields = fields


class EventCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = [
            "name", "description", "event_type", "sport",
            "date", "end_date", "start_time", "location", "venue",
            "max_attendees", "registration_deadline", "price",
            "image_url", "status", "is_featured",
        ]


class RegisterForEventSerializer(serializers.Serializer):
    partner_id = serializers.UUIDField(required=False, allow_null=True)

from rest_framework import serializers

from venues.models import Venue, Court


class CourtSerializer(serializers.ModelSerializer):
    """Serializer for Court model."""

    class Meta:
        model = Court
        fields = [
            "id",
            "name",
            "sport",
            "surface",
            "is_indoor",
            "hourly_rate",
            "is_active",
        ]
        read_only_fields = ["id"]


class VenueListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for venue listings."""

    court_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Venue
        fields = [
            "id",
            "name",
            "city",
            "image_url",
            "latitude",
            "longitude",
            "court_count",
        ]
        read_only_fields = ["id"]


class VenueDetailSerializer(serializers.ModelSerializer):
    """Full serializer for venue detail with nested courts."""

    courts = CourtSerializer(many=True, read_only=True)

    class Meta:
        model = Venue
        fields = [
            "id",
            "name",
            "address",
            "city",
            "latitude",
            "longitude",
            "phone",
            "website_url",
            "image_url",
            "is_active",
            "managed_by",
            "courts",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

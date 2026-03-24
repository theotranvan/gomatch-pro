from rest_framework import serializers

from matches.models import Match, MatchParticipant, OpenMatch
from scoring.serializers import ScoreSerializer


class MatchParticipantSerializer(serializers.ModelSerializer):
    """Serializer for match participants."""

    player_name = serializers.SerializerMethodField()

    class Meta:
        model = MatchParticipant
        fields = [
            "id",
            "player",
            "player_name",
            "role",
            "status",
            "team",
            "joined_at",
        ]
        read_only_fields = ["id", "joined_at"]

    def get_player_name(self, obj):
        profile = obj.player
        if profile.first_name or profile.last_name:
            return f"{profile.first_name} {profile.last_name}".strip()
        return profile.user.email


class MatchListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for match listings."""

    created_by_name = serializers.SerializerMethodField()
    current_participants_count = serializers.SerializerMethodField()

    class Meta:
        model = Match
        fields = [
            "id",
            "sport",
            "match_type",
            "play_mode",
            "status",
            "scheduled_date",
            "scheduled_time",
            "created_by_name",
            "current_participants_count",
            "max_participants",
        ]
        read_only_fields = ["id"]

    def get_created_by_name(self, obj):
        profile = obj.created_by.profile
        if profile.first_name or profile.last_name:
            return f"{profile.first_name} {profile.last_name}".strip()
        return obj.created_by.email

    def get_current_participants_count(self, obj):
        return obj.current_participants_count


class MatchDetailSerializer(serializers.ModelSerializer):
    """Full serializer for match detail with nested participants."""

    created_by_name = serializers.SerializerMethodField()
    current_participants_count = serializers.SerializerMethodField()
    participants = MatchParticipantSerializer(many=True, read_only=True)
    score = ScoreSerializer(read_only=True)

    class Meta:
        model = Match
        fields = [
            "id",
            "sport",
            "match_type",
            "play_mode",
            "status",
            "scheduled_date",
            "scheduled_time",
            "created_by",
            "created_by_name",
            "max_participants",
            "current_participants_count",
            "participants",
            "score",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_created_by_name(self, obj):
        profile = obj.created_by.profile
        if profile.first_name or profile.last_name:
            return f"{profile.first_name} {profile.last_name}".strip()
        return obj.created_by.email

    def get_current_participants_count(self, obj):
        return obj.current_participants_count


class CreateMatchSerializer(serializers.Serializer):
    """Serializer for match creation input."""

    sport = serializers.ChoiceField(choices=Match._meta.get_field("sport").choices)
    match_type = serializers.ChoiceField(
        choices=Match._meta.get_field("match_type").choices
    )
    play_mode = serializers.ChoiceField(
        choices=Match._meta.get_field("play_mode").choices
    )
    scheduled_date = serializers.DateField()
    scheduled_time = serializers.TimeField()


# ---------------------------------------------------------------------------
# OpenMatch serializers
# ---------------------------------------------------------------------------

class OpenMatchListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for open match listings."""

    sport = serializers.CharField(source="match.sport")
    match_type = serializers.CharField(source="match.match_type")
    play_mode = serializers.CharField(source="match.play_mode")
    status = serializers.CharField(source="match.status")
    scheduled_date = serializers.DateField(source="match.scheduled_date")
    scheduled_time = serializers.TimeField(source="match.scheduled_time")
    max_participants = serializers.IntegerField(source="match.max_participants")
    spots_left = serializers.IntegerField(read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = OpenMatch
        fields = [
            "id",
            "sport",
            "match_type",
            "play_mode",
            "status",
            "scheduled_date",
            "scheduled_time",
            "max_participants",
            "spots_left",
            "required_level_min",
            "required_level_max",
            "description",
            "expires_at",
            "created_by_name",
        ]
        read_only_fields = ["id"]

    def get_created_by_name(self, obj):
        profile = obj.match.created_by.profile
        if profile.first_name or profile.last_name:
            return f"{profile.first_name} {profile.last_name}".strip()
        return obj.match.created_by.email


class OpenMatchDetailSerializer(serializers.ModelSerializer):
    """Full serializer for open match detail with nested match + participants."""

    sport = serializers.CharField(source="match.sport")
    match_type = serializers.CharField(source="match.match_type")
    play_mode = serializers.CharField(source="match.play_mode")
    status = serializers.CharField(source="match.status")
    scheduled_date = serializers.DateField(source="match.scheduled_date")
    scheduled_time = serializers.TimeField(source="match.scheduled_time")
    max_participants = serializers.IntegerField(source="match.max_participants")
    spots_left = serializers.IntegerField(read_only=True)
    created_by_name = serializers.SerializerMethodField()
    current_participants_count = serializers.SerializerMethodField()
    participants = serializers.SerializerMethodField()
    match_id = serializers.UUIDField(source="match.id", read_only=True)

    class Meta:
        model = OpenMatch
        fields = [
            "id",
            "match_id",
            "sport",
            "match_type",
            "play_mode",
            "status",
            "scheduled_date",
            "scheduled_time",
            "max_participants",
            "spots_left",
            "current_participants_count",
            "required_level_min",
            "required_level_max",
            "description",
            "expires_at",
            "created_by_name",
            "participants",
        ]
        read_only_fields = ["id"]

    def get_created_by_name(self, obj):
        profile = obj.match.created_by.profile
        if profile.first_name or profile.last_name:
            return f"{profile.first_name} {profile.last_name}".strip()
        return obj.match.created_by.email

    def get_current_participants_count(self, obj):
        return obj.match.current_participants_count

    def get_participants(self, obj):
        return MatchParticipantSerializer(
            obj.match.participants.all(), many=True
        ).data


class CreateOpenMatchSerializer(serializers.Serializer):
    """Serializer for open match creation input."""

    sport = serializers.ChoiceField(choices=Match._meta.get_field("sport").choices)
    match_type = serializers.ChoiceField(
        choices=Match._meta.get_field("match_type").choices
    )
    play_mode = serializers.ChoiceField(
        choices=Match._meta.get_field("play_mode").choices
    )
    scheduled_date = serializers.DateField()
    scheduled_time = serializers.TimeField()
    required_level_min = serializers.ChoiceField(
        choices=OpenMatch._meta.get_field("required_level_min").choices,
        required=False,
        allow_null=True,
        allow_blank=True,
    )
    required_level_max = serializers.ChoiceField(
        choices=OpenMatch._meta.get_field("required_level_max").choices,
        required=False,
        allow_null=True,
        allow_blank=True,
    )
    description = serializers.CharField(max_length=500, required=False, default="")
    expires_at = serializers.DateTimeField()

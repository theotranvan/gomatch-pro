from rest_framework import serializers

from scoring.models import Ranking, Score


class ScoreSerializer(serializers.ModelSerializer):
    """Read serializer for Score."""

    submitted_by = serializers.UUIDField(source="submitted_by.id", read_only=True)
    confirmed_by = serializers.SerializerMethodField()
    winner = serializers.SerializerMethodField()

    class Meta:
        model = Score
        fields = [
            "id",
            "match",
            "submitted_by",
            "sets",
            "winner",
            "status",
            "confirmed_by",
            "confirmed_at",
            "created_at",
        ]
        read_only_fields = fields

    def get_confirmed_by(self, obj):
        if obj.confirmed_by:
            return str(obj.confirmed_by.id)
        return None

    def get_winner(self, obj):
        if obj.winner:
            return str(obj.winner.id)
        return None


class SubmitScoreSerializer(serializers.Serializer):
    """Write serializer for submitting a score."""

    sets = serializers.ListField(
        child=serializers.DictField(),
        min_length=1,
        help_text='List of set scores, e.g. [{"team_a": 6, "team_b": 4}]',
    )


class RankingSerializer(serializers.ModelSerializer):
    """Read serializer for Ranking."""

    player_name = serializers.SerializerMethodField()

    class Meta:
        model = Ranking
        fields = [
            "id",
            "player",
            "player_name",
            "sport",
            "points",
            "wins",
            "losses",
            "rank_position",
            "last_match_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_player_name(self, obj):
        profile = obj.player
        if profile.first_name:
            return f"{profile.first_name} {profile.last_name}".strip()
        return profile.user.email

from rest_framework import serializers

from competitions.models import (
    Tournament,
    TournamentMatch,
    TournamentParticipant,
    TournamentRound,
)
from core.enums import MatchType, SportType


class TournamentParticipantSerializer(serializers.ModelSerializer):
    player_name = serializers.SerializerMethodField()
    partner_name = serializers.SerializerMethodField()

    class Meta:
        model = TournamentParticipant
        fields = [
            "id",
            "player",
            "player_name",
            "partner",
            "partner_name",
            "seed",
            "status",
            "registered_at",
        ]
        read_only_fields = ["id", "seed", "status", "registered_at"]

    def get_player_name(self, obj):
        p = obj.player
        if p.first_name or p.last_name:
            return f"{p.first_name} {p.last_name}".strip()
        return p.user.email

    def get_partner_name(self, obj):
        if not obj.partner:
            return None
        p = obj.partner
        if p.first_name or p.last_name:
            return f"{p.first_name} {p.last_name}".strip()
        return p.user.email


class TournamentMatchSerializer(serializers.ModelSerializer):
    participant_a_name = serializers.SerializerMethodField()
    participant_b_name = serializers.SerializerMethodField()
    winner_name = serializers.SerializerMethodField()

    class Meta:
        model = TournamentMatch
        fields = [
            "id",
            "position",
            "participant_a",
            "participant_a_name",
            "participant_b",
            "participant_b_name",
            "winner",
            "winner_name",
            "match",
            "status",
        ]
        read_only_fields = fields

    def _participant_display(self, participant):
        if not participant:
            return None
        p = participant.player
        if p.first_name or p.last_name:
            return f"{p.first_name} {p.last_name}".strip()
        return p.user.email

    def get_participant_a_name(self, obj):
        return self._participant_display(obj.participant_a)

    def get_participant_b_name(self, obj):
        return self._participant_display(obj.participant_b)

    def get_winner_name(self, obj):
        return self._participant_display(obj.winner)


class TournamentRoundSerializer(serializers.ModelSerializer):
    matches = TournamentMatchSerializer(many=True, read_only=True)

    class Meta:
        model = TournamentRound
        fields = ["id", "round_number", "round_name", "status", "matches"]
        read_only_fields = fields


class TournamentListSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    current_participants_count = serializers.SerializerMethodField()
    venue_name = serializers.SerializerMethodField()

    class Meta:
        model = Tournament
        fields = [
            "id",
            "name",
            "sport",
            "match_type",
            "format",
            "status",
            "max_participants",
            "current_participants_count",
            "start_date",
            "end_date",
            "venue",
            "venue_name",
            "entry_fee",
            "required_level_min",
            "created_by_name",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_created_by_name(self, obj):
        p = obj.created_by.profile
        if p.first_name or p.last_name:
            return f"{p.first_name} {p.last_name}".strip()
        return obj.created_by.email

    def get_current_participants_count(self, obj):
        return obj.current_participants_count

    def get_venue_name(self, obj):
        return obj.venue.name if obj.venue else None


class TournamentDetailSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    current_participants_count = serializers.SerializerMethodField()
    venue_name = serializers.SerializerMethodField()
    participants = TournamentParticipantSerializer(many=True, read_only=True)
    rounds = TournamentRoundSerializer(many=True, read_only=True)

    class Meta:
        model = Tournament
        fields = [
            "id",
            "name",
            "sport",
            "match_type",
            "format",
            "status",
            "max_participants",
            "current_participants_count",
            "start_date",
            "end_date",
            "venue",
            "venue_name",
            "entry_fee",
            "required_level_min",
            "description",
            "created_by",
            "created_by_name",
            "participants",
            "rounds",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_created_by_name(self, obj):
        p = obj.created_by.profile
        if p.first_name or p.last_name:
            return f"{p.first_name} {p.last_name}".strip()
        return obj.created_by.email

    def get_current_participants_count(self, obj):
        return obj.current_participants_count

    def get_venue_name(self, obj):
        return obj.venue.name if obj.venue else None


class CreateTournamentSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    sport = serializers.ChoiceField(choices=SportType.choices)
    match_type = serializers.ChoiceField(choices=MatchType.choices, required=False)
    format = serializers.ChoiceField(choices=Tournament._meta.get_field("format").choices)
    max_participants = serializers.IntegerField(min_value=2)
    start_date = serializers.DateField()
    end_date = serializers.DateField(required=False, allow_null=True)
    venue = serializers.UUIDField(required=False, allow_null=True)
    entry_fee = serializers.DecimalField(max_digits=8, decimal_places=2, required=False, default=0)
    required_level_min = serializers.ChoiceField(
        choices=Tournament._meta.get_field("required_level_min").choices,
        required=False,
        allow_blank=True,
    )
    description = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs):
        if attrs.get("sport") == SportType.PADEL and attrs.get("match_type") == MatchType.SINGLES:
            raise serializers.ValidationError("Le padel se joue uniquement en double.")
        return attrs


class RegisterTournamentSerializer(serializers.Serializer):
    partner_id = serializers.UUIDField(required=False, allow_null=True)


class SetWinnerSerializer(serializers.Serializer):
    winner_participant_id = serializers.UUIDField()

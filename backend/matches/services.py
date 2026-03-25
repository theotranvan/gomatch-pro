from django.utils import timezone

from matches.models import Match, MatchParticipant, OpenMatch
from core.enums import (
    MatchStatus,
    MatchType,
    ParticipantRole,
    ParticipantStatus,
    SkillLevel,
    SportType,
)


SKILL_LEVEL_ORDER = [
    SkillLevel.BEGINNER,
    SkillLevel.INTERMEDIATE,
    SkillLevel.ADVANCED,
]


class MatchCreationService:
    """Service for creating matches with business logic."""

    @staticmethod
    def create_match(user, validated_data):
        """
        Create a new match and add the creator as the first participant.
        1. Validate scheduled_date is not in the past.
        2. Compute max_participants from match_type.
        3. Create the Match.
        4. Create a MatchParticipant (role=CREATOR, status=ACCEPTED).
        5. Return the match.
        """
        # 1. Validate scheduled_date
        scheduled_date = validated_data["scheduled_date"]
        if scheduled_date < timezone.now().date():
            raise ValueError("Scheduled date cannot be in the past.")

        # 1b. Padel is always doubles
        match_type = validated_data.get("match_type")
        if validated_data.get("sport") == SportType.PADEL and match_type == MatchType.SINGLES:
            raise ValueError("Le padel se joue uniquement en double (4 joueurs).")
        max_participants = 2 if match_type == MatchType.SINGLES else 4

        match = Match.objects.create(
            sport=validated_data["sport"],
            match_type=match_type,
            play_mode=validated_data["play_mode"],
            scheduled_date=validated_data["scheduled_date"],
            scheduled_time=validated_data["scheduled_time"],
            created_by=user,
            max_participants=max_participants,
        )

        MatchParticipant.objects.create(
            match=match,
            player=user.profile,
            role=ParticipantRole.CREATOR,
            status=ParticipantStatus.ACCEPTED,
        )

        return match


class OpenMatchService:
    """Service for open match creation and join logic."""

    @staticmethod
    def create_open_match(user, validated_data):
        """
        Create an open match.
        1. Validate expires_at is in the future.
        2. Create the Match with status=OPEN.
        3. Create the OpenMatch linked to it.
        4. Create a MatchParticipant (CREATOR/ACCEPTED).
        5. Return the OpenMatch.
        """
        # 1. Validate expires_at
        if validated_data["expires_at"] <= timezone.now():
            raise ValueError("Expiry date must be in the future.")

        # 1b. Padel is always doubles
        match_type = validated_data.get("match_type")
        if validated_data.get("sport") == SportType.PADEL and match_type == MatchType.SINGLES:
            raise ValueError("Le padel se joue uniquement en double (4 joueurs).")
        max_participants = 2 if match_type == MatchType.SINGLES else 4

        match = Match.objects.create(
            sport=validated_data["sport"],
            match_type=match_type,
            play_mode=validated_data["play_mode"],
            scheduled_date=validated_data["scheduled_date"],
            scheduled_time=validated_data["scheduled_time"],
            created_by=user,
            max_participants=max_participants,
            status=MatchStatus.OPEN,
        )

        open_match = OpenMatch.objects.create(
            match=match,
            required_level_min=validated_data.get("required_level_min"),
            required_level_max=validated_data.get("required_level_max"),
            description=validated_data.get("description", ""),
            expires_at=validated_data["expires_at"],
        )

        MatchParticipant.objects.create(
            match=match,
            player=user.profile,
            role=ParticipantRole.CREATOR,
            status=ParticipantStatus.ACCEPTED,
        )

        return open_match

    @staticmethod
    def join_open_match(user, open_match_id):
        """
        Join an open match.
        1. Verify not full.
        2. Verify not expired.
        3. Verify player level (if constraints set).
        4. Create MatchParticipant (JOINED/ACCEPTED).
        5. Auto-confirm if full.
        6. Return the MatchParticipant.
        """
        try:
            open_match = OpenMatch.objects.select_related("match").get(
                pk=open_match_id
            )
        except OpenMatch.DoesNotExist:
            raise ValueError("Open match not found.")

        match = open_match.match
        profile = user.profile

        # 1. Check already joined
        if MatchParticipant.objects.filter(match=match, player=profile).exists():
            raise ValueError("You have already joined this match.")

        # 2. Check full
        if open_match.is_full:
            raise ValueError("This match is already full.")

        # 3. Check expired
        if timezone.now() >= open_match.expires_at:
            raise ValueError("This open match has expired.")

        # 4. Check player level
        player_level = (
            profile.level_tennis
            if match.sport == "tennis"
            else profile.level_padel
        )
        if player_level and open_match.required_level_min:
            min_idx = SKILL_LEVEL_ORDER.index(open_match.required_level_min)
            player_idx = SKILL_LEVEL_ORDER.index(player_level)
            if player_idx < min_idx:
                raise ValueError("Your skill level is too low for this match.")

        if player_level and open_match.required_level_max:
            max_idx = SKILL_LEVEL_ORDER.index(open_match.required_level_max)
            player_idx = SKILL_LEVEL_ORDER.index(player_level)
            if player_idx > max_idx:
                raise ValueError("Your skill level is too high for this match.")

        # 5. Create participant
        participant = MatchParticipant.objects.create(
            match=match,
            player=profile,
            role=ParticipantRole.JOINED,
            status=ParticipantStatus.ACCEPTED,
        )

        # 6. Auto-confirm when full
        if match.is_full and match.status == MatchStatus.OPEN:
            match.status = MatchStatus.CONFIRMED
            match.save(update_fields=["status", "updated_at"])

        return participant

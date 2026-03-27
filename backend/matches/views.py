from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from core.enums import MatchStatus, ParticipantRole, ParticipantStatus
from matches.filters import MatchFilter, OpenMatchFilter
from matches.models import Match, MatchParticipant, OpenMatch
from matches.serializers import (
    CreateMatchSerializer,
    CreateOpenMatchSerializer,
    MatchDetailSerializer,
    MatchListSerializer,
    OpenMatchDetailSerializer,
    OpenMatchListSerializer,
)
from matches.services import MatchCreationService, OpenMatchService


class MatchCreateView(APIView):
    """
    POST /api/matches/
    Create a new match via MatchCreationService.
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=["Matches"],
        summary="Create a match",
        request=CreateMatchSerializer,
        responses={201: MatchDetailSerializer},
    )
    def post(self, request):
        serializer = CreateMatchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            match = MatchCreationService.create_match(
                user=request.user,
                validated_data=serializer.validated_data,
            )
        except ValueError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        output = MatchDetailSerializer(match).data
        return Response(output, status=status.HTTP_201_CREATED)


@extend_schema(tags=["Matches"])
class MatchListView(generics.ListAPIView):
    """
    GET /api/matches/
    List matches. Filterable by sport, status, play_mode, match_type,
    scheduled_date range, city.
    """

    serializer_class = MatchListSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_class = MatchFilter

    def get_queryset(self):
        # Optimized: 3 queries (matches + participants + profiles) instead of N+1
        return Match.objects.select_related(
            "created_by__profile"
        ).prefetch_related(
            "participants__player"
        ).order_by("-scheduled_date", "-scheduled_time")


@extend_schema(tags=["Matches"])
class MatchDetailView(generics.RetrieveAPIView):
    """
    GET /api/matches/:id/
    Retrieve match details with participants.
    """

    serializer_class = MatchDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "pk"

    def get_queryset(self):
        # Optimized: 4 queries (match + creator + participants + score) instead of N+1
        return Match.objects.select_related(
            "created_by__profile"
        ).prefetch_related("participants__player__user", "score")


class MatchJoinView(APIView):
    """
    POST /api/matches/:id/join/
    Join an existing match as a participant.
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=["Matches"],
        summary="Join a match",
        request=None,
        responses={200: MatchDetailSerializer},
    )
    def post(self, request, pk):
        try:
            match = Match.objects.get(pk=pk)
        except Match.DoesNotExist:
            return Response(
                {"detail": "Match not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        profile = request.user.profile

        # Check if already a participant
        if MatchParticipant.objects.filter(match=match, player=profile).exists():
            return Response(
                {"detail": "You have already joined this match."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if match is full
        if match.is_full:
            return Response(
                {"detail": "This match is already full."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        MatchParticipant.objects.create(
            match=match,
            player=profile,
            role=ParticipantRole.JOINED,
            status=ParticipantStatus.ACCEPTED,
        )

        # Auto-confirm match when it becomes full
        if match.is_full and match.status in (MatchStatus.DRAFT, MatchStatus.OPEN):
            match.status = MatchStatus.CONFIRMED
            match.save(update_fields=["status", "updated_at"])

        # Return updated match detail
        match.refresh_from_db()
        output = MatchDetailSerializer(match).data
        return Response(output, status=status.HTTP_200_OK)


@extend_schema(tags=["Matches"])
class MyMatchesView(generics.ListAPIView):
    """
    GET /api/matches/my/
    List matches where the current user is a participant.
    """

    serializer_class = MatchListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Optimized: 3 queries (matches + participants + profiles) instead of N+1
        return Match.objects.filter(
            participants__player=self.request.user.profile
        ).select_related(
            "created_by__profile"
        ).prefetch_related(
            "participants__player"
        ).order_by("-scheduled_date", "-scheduled_time")


class MatchChangeStatusView(APIView):
    """
    POST /api/matches/:id/change-status/
    Change match status (for testing / admin purposes).
    Only the match creator or staff can change the status.
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=["Matches"],
        summary="Change match status",
    )
    def post(self, request, pk):
        new_status = request.data.get("status")
        valid = [s.value for s in MatchStatus]
        if new_status not in valid:
            return Response(
                {"detail": f"Invalid status. Choose from: {valid}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            match = Match.objects.get(pk=pk)
        except Match.DoesNotExist:
            return Response(
                {"detail": "Match not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if match.created_by != request.user and not request.user.is_staff:
            return Response(
                {"detail": "Only the match creator or staff can change status."},
                status=status.HTTP_403_FORBIDDEN,
            )
        old = match.status
        if not match.can_transition_to(new_status):
            return Response(
                {
                    "detail": f"Cannot transition from '{old}' to '{new_status}'."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        match.status = new_status
        match.save(update_fields=["status", "updated_at"])
        return Response({"old_status": old, "new_status": new_status})


# ---------------------------------------------------------------------------
# OpenMatch views
# ---------------------------------------------------------------------------


class OpenMatchCreateView(APIView):
    """
    POST /api/open-matches/
    Create a new open match via OpenMatchService.
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=["Open Matches"],
        summary="Create an open match",
        request=CreateOpenMatchSerializer,
        responses={201: OpenMatchDetailSerializer},
    )
    def post(self, request):
        serializer = CreateOpenMatchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            open_match = OpenMatchService.create_open_match(
                user=request.user,
                validated_data=serializer.validated_data,
            )
        except ValueError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        output = OpenMatchDetailSerializer(open_match).data
        return Response(output, status=status.HTTP_201_CREATED)


@extend_schema(tags=["Open Matches"])
class OpenMatchListView(generics.ListAPIView):
    """
    GET /api/open-matches/
    List open matches that are not expired and not full.
    Filterable by sport, required_level_min, required_level_max,
    scheduled_date range.
    """

    serializer_class = OpenMatchListSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_class = OpenMatchFilter

    def get_queryset(self):
        from django.utils import timezone

        # Optimized: 3 queries (open_matches + participants + profiles) instead of N+1
        return (
            OpenMatch.objects.filter(
                match__status=MatchStatus.OPEN,
                expires_at__gt=timezone.now(),
            )
            .select_related("match__created_by__profile")
            .prefetch_related("match__participants__player")
            .order_by("-match__scheduled_date")
        )


@extend_schema(tags=["Open Matches"])
class OpenMatchDetailView(generics.RetrieveAPIView):
    """
    GET /api/open-matches/:id/
    Retrieve open match details with participants.
    """

    serializer_class = OpenMatchDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "pk"

    def get_queryset(self):
        return OpenMatch.objects.select_related(
            "match__created_by__profile"
        ).prefetch_related("match__participants__player__user")


class OpenMatchJoinView(APIView):
    """
    POST /api/open-matches/:id/join/
    Join an open match via OpenMatchService.
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=["Open Matches"],
        summary="Join an open match",
        request=None,
        responses={200: OpenMatchDetailSerializer},
    )
    def post(self, request, pk):
        try:
            OpenMatchService.join_open_match(
                user=request.user,
                open_match_id=pk,
            )
        except ValueError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        open_match = OpenMatch.objects.select_related(
            "match__created_by__profile"
        ).prefetch_related("match__participants__player__user").get(pk=pk)
        output = OpenMatchDetailSerializer(open_match).data
        return Response(output, status=status.HTTP_200_OK)

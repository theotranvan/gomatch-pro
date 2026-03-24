from django.db.models import Window, F
from django.db.models.functions import RowNumber
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from scoring.filters import RankingFilter
from scoring.models import Ranking, Score
from scoring.serializers import (
    RankingSerializer,
    ScoreSerializer,
    SubmitScoreSerializer,
)
from scoring.services import ScoreService


class SubmitScoreView(APIView):
    """POST /api/matches/:match_id/score/ — submit a score."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Scoring"],
        summary="Submit a score",
        request=SubmitScoreSerializer,
        responses={201: ScoreSerializer},
    )
    def post(self, request, match_id):
        serializer = SubmitScoreSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            score = ScoreService.submit_score(
                user=request.user,
                match_id=match_id,
                sets_data=serializer.validated_data["sets"],
            )
        except ValueError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            ScoreSerializer(score).data,
            status=status.HTTP_201_CREATED,
        )


class ConfirmScoreView(APIView):
    """POST /api/scores/:id/confirm/ — confirm a score."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Scoring"],
        summary="Confirm a score",
        request=None,
        responses=ScoreSerializer,
    )
    def post(self, request, pk):
        try:
            score = ScoreService.confirm_score(
                user=request.user,
                score_id=pk,
            )
        except ValueError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(ScoreSerializer(score).data)


class DisputeScoreView(APIView):
    """POST /api/scores/:id/dispute/ — dispute a score."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Scoring"],
        summary="Dispute a score",
        request=None,
        responses=ScoreSerializer,
    )
    def post(self, request, pk):
        try:
            score = ScoreService.dispute_score(
                user=request.user,
                score_id=pk,
            )
        except ValueError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(ScoreSerializer(score).data)


@extend_schema(tags=["Rankings"])
class RankingListView(generics.ListAPIView):
    """GET /api/rankings/ — leaderboard filtered by sport, ordered by points."""

    permission_classes = [IsAuthenticated]
    serializer_class = RankingSerializer
    filterset_class = RankingFilter

    def get_queryset(self):
        return Ranking.objects.select_related(
            "player", "player__user"
        ).annotate(
            computed_rank=Window(
                expression=RowNumber(),
                partition_by=[F("sport")],
                order_by=F("points").desc(),
            )
        ).order_by("-points")


class MyRankingsView(APIView):
    """GET /api/rankings/me/ — current user's rankings."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Rankings"],
        summary="My rankings",
        responses=RankingSerializer(many=True),
    )
    def get(self, request):
        rankings = list(
            Ranking.objects.filter(
                player=request.user.profile,
            ).select_related("player", "player__user").order_by("sport")
        )
        for ranking in rankings:
            ranking.computed_rank = (
                Ranking.objects.filter(
                    sport=ranking.sport,
                    points__gt=ranking.points,
                ).count()
                + 1
            )
        serializer = RankingSerializer(rankings, many=True)
        return Response(serializer.data)

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from accounts.models import PlayerProfile
from scoring.stats_service import StatsService


@extend_schema(tags=["Stats"])
class MyStatsView(APIView):
    """GET /api/stats/me/ — current user's detailed statistics."""

    permission_classes = [IsAuthenticated]

    @extend_schema(summary="My statistics")
    def get(self, request):
        stats = StatsService.get_player_stats(request.user.profile)
        return Response(stats)


@extend_schema(tags=["Stats"])
class PlayerStatsView(APIView):
    """GET /api/stats/:player_id/ — a player's detailed statistics."""

    permission_classes = [IsAuthenticated]

    @extend_schema(summary="Player statistics")
    def get(self, request, player_id):
        try:
            profile = PlayerProfile.objects.get(pk=player_id)
        except PlayerProfile.DoesNotExist:
            return Response({"detail": "Player not found."}, status=404)
        stats = StatsService.get_player_stats(profile)
        return Response(stats)

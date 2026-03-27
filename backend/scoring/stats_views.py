from django.core.cache import cache
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
        cache_key = f"stats_{request.user.profile.pk}"
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached, headers={"X-Cache": "HIT"})
        stats = StatsService.get_player_stats(request.user.profile)
        cache.set(cache_key, stats, timeout=300)
        return Response(stats, headers={"X-Cache": "MISS"})


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
        cache_key = f"stats_{player_id}"
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached, headers={"X-Cache": "HIT"})
        stats = StatsService.get_player_stats(profile)
        cache.set(cache_key, stats, timeout=300)
        return Response(stats, headers={"X-Cache": "MISS"})

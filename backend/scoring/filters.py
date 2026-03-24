import django_filters

from scoring.models import Ranking


class RankingFilter(django_filters.FilterSet):
    """Filter for Ranking listings."""

    sport = django_filters.CharFilter(field_name="sport")
    player = django_filters.UUIDFilter(field_name="player__id")

    class Meta:
        model = Ranking
        fields = ["sport", "player"]

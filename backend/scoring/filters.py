import django_filters

from scoring.models import Ranking


class RankingFilter(django_filters.FilterSet):
    """Filter for Ranking listings."""

    sport = django_filters.CharFilter(field_name="sport")

    class Meta:
        model = Ranking
        fields = ["sport"]

import django_filters
from django.db.models import Q

from accounts.models import PlayerProfile


class PlayerFilter(django_filters.FilterSet):
    """Filter for PlayerProfile listings."""

    search = django_filters.CharFilter(method="filter_by_search")
    city = django_filters.CharFilter(field_name="city", lookup_expr="icontains")
    level_tennis = django_filters.CharFilter(field_name="level_tennis")
    level_padel = django_filters.CharFilter(field_name="level_padel")
    preferred_play_mode = django_filters.CharFilter(
        field_name="preferred_play_mode"
    )
    sport = django_filters.CharFilter(method="filter_by_sport")

    class Meta:
        model = PlayerProfile
        fields = [
            "search",
            "city",
            "level_tennis",
            "level_padel",
            "preferred_play_mode",
            "sport",
        ]

    def filter_by_search(self, queryset, name, value):
        """Search players by first name or last name (case-insensitive)."""
        return queryset.filter(
            Q(first_name__icontains=value) | Q(last_name__icontains=value)
        )

    def filter_by_sport(self, queryset, name, value):
        """Filter players who have a level set for the given sport."""
        if value == "tennis":
            return queryset.filter(level_tennis__isnull=False)
        elif value == "padel":
            return queryset.filter(level_padel__isnull=False)
        return queryset

import django_filters

from matches.models import Match, OpenMatch


class MatchFilter(django_filters.FilterSet):
    """Filter for Match listings."""

    sport = django_filters.CharFilter(field_name="sport")
    status = django_filters.CharFilter(field_name="status")
    play_mode = django_filters.CharFilter(field_name="play_mode")
    match_type = django_filters.CharFilter(field_name="match_type")
    scheduled_date_min = django_filters.DateFilter(
        field_name="scheduled_date", lookup_expr="gte"
    )
    scheduled_date_max = django_filters.DateFilter(
        field_name="scheduled_date", lookup_expr="lte"
    )
    city = django_filters.CharFilter(
        field_name="created_by__profile__city", lookup_expr="icontains"
    )

    class Meta:
        model = Match
        fields = [
            "sport",
            "status",
            "play_mode",
            "match_type",
            "scheduled_date_min",
            "scheduled_date_max",
            "city",
        ]


class OpenMatchFilter(django_filters.FilterSet):
    """Filter for OpenMatch listings."""

    sport = django_filters.CharFilter(field_name="match__sport")
    required_level_min = django_filters.CharFilter(
        field_name="required_level_min"
    )
    required_level_max = django_filters.CharFilter(
        field_name="required_level_max"
    )
    scheduled_date_min = django_filters.DateFilter(
        field_name="match__scheduled_date", lookup_expr="gte"
    )
    scheduled_date_max = django_filters.DateFilter(
        field_name="match__scheduled_date", lookup_expr="lte"
    )

    class Meta:
        model = OpenMatch
        fields = [
            "sport",
            "required_level_min",
            "required_level_max",
            "scheduled_date_min",
            "scheduled_date_max",
        ]

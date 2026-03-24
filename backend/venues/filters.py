import django_filters

from venues.models import Venue


class VenueFilter(django_filters.FilterSet):
    """Filter for Venue listings."""

    city = django_filters.CharFilter(field_name="city", lookup_expr="icontains")
    sport = django_filters.CharFilter(
        field_name="courts__sport", distinct=True
    )

    class Meta:
        model = Venue
        fields = ["city", "sport"]

from venues.models import Venue, Court


class VenueService:
    """Service layer for venue-related business logic."""

    @staticmethod
    def get_active_venues():
        """Return all active venues."""
        return Venue.objects.filter(is_active=True)

    @staticmethod
    def get_venue_by_id(venue_id: str) -> Venue | None:
        """Retrieve a venue by its UUID."""
        try:
            return Venue.objects.get(id=venue_id, is_active=True)
        except Venue.DoesNotExist:
            return None

    @staticmethod
    def get_courts_for_venue(venue_id: str):
        """Retrieve all active courts for a venue."""
        return Court.objects.filter(venue_id=venue_id, is_active=True)

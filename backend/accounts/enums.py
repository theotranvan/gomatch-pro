from django.db import models


class UserRole(models.TextChoices):
    """Roles available for users in the platform."""
    PLAYER = "PLAYER", "Player"
    ADMIN = "ADMIN", "Admin"
    VENUE_MANAGER = "VENUE_MANAGER", "Venue Manager"

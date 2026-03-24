from django.db.models.signals import post_save
from django.dispatch import receiver

from accounts.models import User, PlayerProfile


@receiver(post_save, sender=User)
def create_player_profile(sender, instance, created, **kwargs):
    """Automatically create a PlayerProfile when a new User is created."""
    if created:
        PlayerProfile.objects.create(user=instance)

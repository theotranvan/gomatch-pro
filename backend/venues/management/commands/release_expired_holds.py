from django.core.management.base import BaseCommand
from django.utils import timezone

from core.enums import TimeSlotStatus
from venues.models import TimeSlot


class Command(BaseCommand):
    help = "Release time slots whose hold has expired."

    def handle(self, *args, **options):
        now = timezone.now()
        expired = TimeSlot.objects.filter(
            status=TimeSlotStatus.HELD,
            held_until__lt=now,
        )
        count = expired.update(
            status=TimeSlotStatus.AVAILABLE,
            held_until=None,
            held_by=None,
        )
        self.stdout.write(self.style.SUCCESS(f"Released {count} expired hold(s)."))

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from core.enums import MatchStatus, ParticipantStatus
from core.notifications import NotificationService
from matches.models import Match


class Command(BaseCommand):
    help = "Send push reminders for matches starting in ~2 hours."

    def handle(self, *args, **options):
        now = timezone.localtime()
        today = now.date()

        # Window: 1h45 to 2h15 from now — to be run every 30 min
        window_start = (now + timedelta(hours=1, minutes=45)).time()
        window_end = (now + timedelta(hours=2, minutes=15)).time()

        matches = Match.objects.filter(
            status=MatchStatus.CONFIRMED,
            scheduled_date=today,
            scheduled_time__gte=window_start,
            scheduled_time__lte=window_end,
        )

        sent = 0
        for match in matches:
            participant_ids = list(
                match.participants.filter(
                    status=ParticipantStatus.ACCEPTED,
                ).values_list("player__user_id", flat=True)
            )
            if participant_ids:
                sport_label = match.get_sport_display().lower()
                NotificationService.send_push(
                    user_ids=participant_ids,
                    title="Rappel de match",
                    body=f"Votre match de {sport_label} commence dans 2h !",
                    data={"type": "match", "match_id": str(match.pk)},
                )
                sent += 1

        self.stdout.write(self.style.SUCCESS(f"{sent} reminder(s) sent."))

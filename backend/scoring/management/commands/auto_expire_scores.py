from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from core.enums import ScoreStatus
from core.notifications import NotificationService
from matches.models import MatchParticipant
from scoring.models import Score


class Command(BaseCommand):
    help = "Expire pending scores older than 24 hours. Run via cron every hour."

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(hours=24)
        pending_scores = Score.objects.filter(
            status=ScoreStatus.PENDING,
            created_at__lt=cutoff,
        ).select_related("match")

        count = 0
        for score in pending_scores:
            score.status = ScoreStatus.EXPIRED
            score.save(update_fields=["status"])

            # Notify both players
            participant_ids = list(
                MatchParticipant.objects.filter(
                    match=score.match,
                    status="accepted",
                ).values_list("player__user_id", flat=True)
            )
            if participant_ids:
                NotificationService.send_push(
                    user_ids=participant_ids,
                    title="Score expiré",
                    body="Le score n'a pas été confirmé dans les 24h. Vous pouvez soumettre un nouveau score.",
                    data={"type": "score_expired", "match_id": str(score.match.pk)},
                )
            count += 1

        self.stdout.write(self.style.SUCCESS(f"{count} score(s) expired."))

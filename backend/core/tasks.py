"""
Celery tasks for GoMatch.

Offloads blocking work (push notifications, ranking computation,
periodic cleanup) so HTTP responses stay fast.
"""

import logging

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger("gomatch")


# ------------------------------------------------------------------
# Push notifications
# ------------------------------------------------------------------


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_push_notification_task(self, user_ids, title, body, data=None):
    """Send push notifications via the Expo API (async)."""
    from core.notifications import NotificationService

    try:
        NotificationService.send_push(user_ids, title, body, data)
    except Exception as exc:
        logger.warning("Push notification failed, retrying: %s", exc)
        raise self.retry(exc=exc)


# ------------------------------------------------------------------
# Rankings
# ------------------------------------------------------------------


@shared_task
def update_rankings_task(score_id):
    """Recompute rankings after a score is confirmed."""
    from scoring.models import Score
    from scoring.services import RankingService

    try:
        score = Score.objects.select_related("match").get(pk=score_id)
    except Score.DoesNotExist:
        logger.error("update_rankings_task: Score %s not found", score_id)
        return
    RankingService.update_rankings(score)


# ------------------------------------------------------------------
# Periodic: auto-expire pending scores (every hour)
# ------------------------------------------------------------------


@shared_task
def auto_expire_scores_task():
    """Expire pending scores older than 24 hours."""
    from datetime import timedelta

    from core.enums import ScoreStatus
    from matches.models import MatchParticipant
    from scoring.models import Score

    cutoff = timezone.now() - timedelta(hours=24)
    pending_scores = Score.objects.filter(
        status=ScoreStatus.PENDING,
        created_at__lt=cutoff,
    ).select_related("match")

    count = 0
    for score in pending_scores:
        score.status = ScoreStatus.EXPIRED
        score.save(update_fields=["status"])

        participant_ids = list(
            MatchParticipant.objects.filter(
                match=score.match,
                status="accepted",
            ).values_list("player__user_id", flat=True)
        )
        if participant_ids:
            send_push_notification_task.delay(
                [str(uid) for uid in participant_ids],
                "Score expiré",
                "Le score n'a pas été confirmé dans les 24h. "
                "Vous pouvez soumettre un nouveau score.",
                {"type": "score_expired", "match_id": str(score.match.pk)},
            )
        count += 1

    logger.info("auto_expire_scores_task: %d score(s) expired.", count)


# ------------------------------------------------------------------
# Periodic: release expired holds (every 5 minutes)
# ------------------------------------------------------------------


@shared_task
def release_expired_holds_task():
    """Release time slots whose hold has expired."""
    from core.enums import TimeSlotStatus
    from venues.models import TimeSlot

    count = TimeSlot.objects.filter(
        status=TimeSlotStatus.HELD,
        held_until__lt=timezone.now(),
    ).update(
        status=TimeSlotStatus.AVAILABLE,
        held_until=None,
        held_by=None,
    )
    logger.info("release_expired_holds_task: released %d hold(s).", count)


# ------------------------------------------------------------------
# Periodic: match reminders (every 30 minutes)
# ------------------------------------------------------------------


@shared_task
def send_match_reminders_task():
    """Send push reminders for matches starting in ~2 hours."""
    from datetime import timedelta

    from core.enums import MatchStatus, ParticipantStatus
    from matches.models import Match

    now = timezone.localtime()
    today = now.date()

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
            send_push_notification_task.delay(
                [str(uid) for uid in participant_ids],
                "Rappel de match",
                f"Votre match de {sport_label} commence dans 2h !",
                {"type": "match", "match_id": str(match.pk)},
            )
            sent += 1

    logger.info("send_match_reminders_task: %d reminder(s) sent.", sent)

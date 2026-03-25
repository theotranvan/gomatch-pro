import logging

import requests

from accounts.models import PlayerProfile

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


class NotificationService:
    """Send push notifications via the Expo Push API."""

    @staticmethod
    def send_push(user_ids, title, body, data=None):
        """
        Send a push notification to multiple users.
        user_ids: iterable of User UUIDs (not profile IDs).
        """
        if data is None:
            data = {}

        tokens = list(
            PlayerProfile.objects.filter(
                user_id__in=user_ids,
                expo_push_token__isnull=False,
            )
            .exclude(expo_push_token="")
            .values_list("expo_push_token", flat=True)
        )

        if not tokens:
            return

        messages = [
            {
                "to": token,
                "sound": "default",
                "title": title,
                "body": body,
                "data": data,
            }
            for token in tokens
        ]

        try:
            response = requests.post(
                EXPO_PUSH_URL,
                json=messages,
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                timeout=10,
            )
            response.raise_for_status()
        except requests.RequestException:
            logger.exception("Failed to send Expo push notifications")

"""
WebSocket consumer for real-time chat messaging.

Protocol:
  Client → Server:  { "content": "Hello!" }
  Server → Client:  { "type": "chat_message", "id": "...", "sender": "...",
                       "sender_name": "...", "content": "...", "created_at": "..." }
"""

import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import AnonymousUser

from chat.models import ChatMessage, ChatRoom
from core.enums import MessageType


class ChatConsumer(AsyncWebsocketConsumer):
    """Async WebSocket consumer for a chat room."""

    async def connect(self):
        self.room_id = str(self.scope["url_route"]["kwargs"]["room_id"])
        self.group_name = f"chat_{self.room_id}"
        user = self.scope.get("user")

        # Reject unauthenticated connections
        if not user or isinstance(user, AnonymousUser):
            await self.close()
            return

        # Verify user is a participant of this room
        is_participant = await self._is_participant(user)
        if not is_participant:
            await self.close()
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        """Handle incoming message from WebSocket client."""
        user = self.scope.get("user")
        if not user or isinstance(user, AnonymousUser):
            return

        try:
            data = json.loads(text_data)
        except (json.JSONDecodeError, TypeError):
            return

        content = data.get("content", "").strip()
        if not content or len(content) > 2000:
            return

        # Persist the message
        message = await self._create_message(user, content)

        # Broadcast to the channel group
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "chat_message",
                "id": str(message["id"]),
                "sender": str(message["sender"]),
                "sender_name": message["sender_name"],
                "content": message["content"],
                "message_type": message["message_type"],
                "created_at": message["created_at"],
            },
        )

    async def chat_message(self, event):
        """Relay a broadcasted message to the WebSocket client."""
        await self.send(text_data=json.dumps({
            "id": event["id"],
            "sender": event["sender"],
            "sender_name": event["sender_name"],
            "content": event["content"],
            "message_type": event["message_type"],
            "created_at": event["created_at"],
        }))

    # ── DB helpers (sync → async) ─────────────────────────────────────

    @database_sync_to_async
    def _is_participant(self, user) -> bool:
        try:
            room = ChatRoom.objects.get(pk=self.room_id)
            return room.participants.filter(pk=user.pk).exists()
        except ChatRoom.DoesNotExist:
            return False

    @database_sync_to_async
    def _create_message(self, user, content: str) -> dict:
        msg = ChatMessage.objects.create(
            room_id=self.room_id,
            sender=user,
            content=content,
            message_type=MessageType.TEXT,
        )
        profile = getattr(user, "profile", None)
        sender_name = profile.display_name if profile else user.email
        return {
            "id": str(msg.id),
            "sender": str(user.id),
            "sender_name": sender_name,
            "content": msg.content,
            "message_type": msg.message_type,
            "created_at": msg.created_at.isoformat(),
        }

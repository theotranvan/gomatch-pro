import uuid

from django.conf import settings
from django.db import models

from core.enums import ChatRoomType, MessageType


class ChatRoom(models.Model):
    """A chat room linked to a match."""

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    match = models.OneToOneField(
        "matches.Match",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="chat_room",
        verbose_name="match",
    )
    room_type = models.CharField(
        max_length=20,
        choices=ChatRoomType.choices,
        verbose_name="room type",
    )
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="chat_rooms",
        blank=True,
        verbose_name="participants",
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="active",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="created at",
    )

    class Meta:
        db_table = "chat_rooms"
        verbose_name = "chat room"
        verbose_name_plural = "chat rooms"
        ordering = ["-created_at"]

    def __str__(self):
        return f"ChatRoom {self.room_type} - {self.match}"


class ChatMessage(models.Model):
    """A message in a chat room."""

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    room = models.ForeignKey(
        ChatRoom,
        on_delete=models.CASCADE,
        related_name="messages",
        verbose_name="room",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        verbose_name="sender",
    )
    content = models.TextField(
        max_length=2000,
        verbose_name="content",
    )
    message_type = models.CharField(
        max_length=20,
        choices=MessageType.choices,
        default=MessageType.TEXT,
        verbose_name="message type",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name="created at",
    )
    is_read = models.BooleanField(
        default=False,
        verbose_name="read",
    )

    class Meta:
        db_table = "chat_messages"
        verbose_name = "chat message"
        verbose_name_plural = "chat messages"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["room", "-created_at"], name="idx_msg_room_date"),
            models.Index(fields=["is_read"], name="idx_msg_read"),
        ]

    def __str__(self):
        return f"{self.sender} in {self.room}: {self.content[:50]}"

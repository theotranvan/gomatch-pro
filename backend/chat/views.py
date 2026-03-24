from django.db.models import Max, Q, Subquery, OuterRef, Value
from django.db.models.functions import Coalesce
from rest_framework import serializers as drf_serializers, status
from rest_framework.generics import ListAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, inline_serializer

from chat.models import ChatMessage, ChatRoom
from chat.serializers import (
    ChatMessageSerializer,
    ChatRoomListSerializer,
    SendMessageSerializer,
)
from core.enums import MessageType


class ChatMessagePagination(PageNumberPagination):
    """Pagination for chat messages (50 per page)."""

    page_size = 50


@extend_schema(tags=["Chat"])
class ChatRoomListView(ListAPIView):
    """GET /api/chat/rooms/ — user's chat rooms, ordered by last message."""

    permission_classes = [IsAuthenticated]
    serializer_class = ChatRoomListSerializer

    def get_queryset(self):
        user = self.request.user
        last_msg = ChatMessage.objects.filter(
            room=OuterRef("pk"),
        ).order_by("-created_at").values("created_at")[:1]

        return (
            ChatRoom.objects.filter(participants=user, is_active=True)
            .annotate(
                last_message_at=Coalesce(
                    Subquery(last_msg),
                    "created_at",
                ),
            )
            .order_by("-last_message_at")
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context


class ChatMessageListCreateView(APIView):
    """GET + POST /api/chat/rooms/:id/messages/."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Chat"],
        summary="List messages",
        responses=ChatMessageSerializer(many=True),
    )
    def get(self, request, pk):
        """List messages for a chat room (paginated, most recent first)."""
        try:
            room = ChatRoom.objects.get(pk=pk)
        except ChatRoom.DoesNotExist:
            return Response(
                {"detail": "Chat room not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not room.participants.filter(pk=request.user.pk).exists():
            return Response(
                {"detail": "You are not a participant of this chat room."},
                status=status.HTTP_403_FORBIDDEN,
            )

        messages = room.messages.select_related("sender").order_by("-created_at")
        paginator = ChatMessagePagination()
        page = paginator.paginate_queryset(messages, request)
        serializer = ChatMessageSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        tags=["Chat"],
        summary="Send a message",
        request=SendMessageSerializer,
        responses={201: ChatMessageSerializer},
    )
    def post(self, request, pk):
        """Send a message in a chat room."""
        try:
            room = ChatRoom.objects.get(pk=pk)
        except ChatRoom.DoesNotExist:
            return Response(
                {"detail": "Chat room not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not room.participants.filter(pk=request.user.pk).exists():
            return Response(
                {"detail": "You are not a participant of this chat room."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = SendMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        message = ChatMessage.objects.create(
            room=room,
            sender=request.user,
            content=serializer.validated_data["content"],
            message_type=MessageType.TEXT,
        )
        return Response(
            ChatMessageSerializer(message).data,
            status=status.HTTP_201_CREATED,
        )


class MarkReadView(APIView):
    """POST /api/chat/rooms/:id/mark-read/ — mark all messages as read."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Chat"],
        summary="Mark messages as read",
        request=None,
        responses=inline_serializer(
            name="MarkReadResponse",
            fields={"marked_read": drf_serializers.IntegerField()},
        ),
    )
    def post(self, request, pk):
        try:
            room = ChatRoom.objects.get(pk=pk)
        except ChatRoom.DoesNotExist:
            return Response(
                {"detail": "Chat room not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not room.participants.filter(pk=request.user.pk).exists():
            return Response(
                {"detail": "You are not a participant of this chat room."},
                status=status.HTTP_403_FORBIDDEN,
            )

        updated = room.messages.filter(is_read=False).exclude(
            sender=request.user,
        ).update(is_read=True)

        return Response({"marked_read": updated})

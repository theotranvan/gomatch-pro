from rest_framework import serializers

from chat.models import ChatMessage, ChatRoom


class ChatMessageSerializer(serializers.ModelSerializer):
    """Read serializer for ChatMessage."""

    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = [
            "id",
            "sender",
            "sender_name",
            "content",
            "message_type",
            "created_at",
            "is_read",
        ]
        read_only_fields = fields

    def get_sender_name(self, obj):
        profile = getattr(obj.sender, "profile", None)
        if profile:
            return profile.display_name
        return obj.sender.email


class SendMessageSerializer(serializers.Serializer):
    """Write serializer for sending a chat message."""

    content = serializers.CharField(max_length=2000)


class ChatRoomListSerializer(serializers.ModelSerializer):
    """Read serializer for listing chat rooms."""

    match_id = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    participants_names = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = [
            "id",
            "room_type",
            "match_id",
            "last_message",
            "unread_count",
            "participants_names",
            "is_active",
            "created_at",
        ]
        read_only_fields = fields

    def get_match_id(self, obj):
        if obj.match_id:
            return str(obj.match_id)
        return None

    def get_last_message(self, obj):
        last = obj.messages.order_by("-created_at").first()
        if last:
            return ChatMessageSerializer(last).data
        return None

    def get_unread_count(self, obj):
        # Optimized: uses annotated _unread_count from queryset instead of per-room query
        if hasattr(obj, '_unread_count'):
            return obj._unread_count
        request = self.context.get("request")
        if not request:
            return 0
        return obj.messages.filter(is_read=False).exclude(
            sender=request.user,
        ).count()

    def get_participants_names(self, obj):
        # Optimized: uses prefetched participants (no extra queries)
        names = []
        for user in obj.participants.all():
            profile = getattr(user, "profile", None)
            if profile and profile.first_name:
                names.append(
                    f"{profile.first_name} {profile.last_name}".strip()
                )
            else:
                names.append(user.email)
        return names

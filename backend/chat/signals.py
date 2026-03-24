from django.db.models.signals import post_save
from django.dispatch import receiver

from chat.models import ChatMessage, ChatRoom
from core.enums import ChatRoomType, MessageType, ParticipantStatus
from matches.models import Match, MatchParticipant


@receiver(post_save, sender=Match)
def create_chatroom_for_match(sender, instance, created, **kwargs):
    """Auto-create a ChatRoom when a Match is created."""
    if not created:
        return

    # Determine room type based on whether an open_match exists
    # At creation time, open_match may not exist yet, default to MATCH
    room_type = ChatRoomType.MATCH

    room = ChatRoom.objects.create(
        match=instance,
        room_type=room_type,
    )
    room.participants.add(instance.created_by)


@receiver(post_save, sender=MatchParticipant)
def add_participant_to_chatroom(sender, instance, created, **kwargs):
    """
    When a MatchParticipant is created with ACCEPTED status,
    add the player's user to the ChatRoom and create a system message.
    """
    if not created:
        return
    if instance.status != ParticipantStatus.ACCEPTED:
        return

    match = instance.match
    try:
        room = match.chat_room
    except ChatRoom.DoesNotExist:
        return

    user = instance.player.user

    # Skip if user is already a participant (e.g. the creator)
    if room.participants.filter(pk=user.pk).exists():
        return

    room.participants.add(user)

    # Create a system message
    first_name = instance.player.first_name or user.email
    ChatMessage.objects.create(
        room=room,
        sender=user,
        content=f"{first_name} a rejoint le match",
        message_type=MessageType.SYSTEM,
    )

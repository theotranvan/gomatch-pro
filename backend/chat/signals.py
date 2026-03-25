from django.db.models.signals import post_save
from django.dispatch import receiver

from chat.models import ChatMessage, ChatRoom
from core.enums import ChatRoomType, MessageType, ParticipantStatus
from core.notifications import NotificationService
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
    Also notify the match creator.
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

    # Notify match creator that someone joined
    if match.created_by_id != user.pk:
        sport_label = match.get_sport_display()
        NotificationService.send_push(
            user_ids=[match.created_by_id],
            title="Nouveau joueur !",
            body=f"{first_name} a rejoint votre match de {sport_label}",
            data={"type": "match", "match_id": str(match.pk)},
        )


@receiver(post_save, sender=ChatMessage)
def notify_new_chat_message(sender, instance, created, **kwargs):
    """Notify chat room participants when a new text message is sent."""
    if not created:
        return
    if instance.message_type != MessageType.TEXT:
        return

    room = instance.room
    sender_name = ""
    try:
        sender_name = instance.sender.profile.first_name or instance.sender.email
    except Exception:
        sender_name = instance.sender.email

    # Notify all participants except the sender
    recipient_ids = list(
        room.participants.exclude(pk=instance.sender_id).values_list("pk", flat=True)
    )
    if recipient_ids:
        NotificationService.send_push(
            user_ids=recipient_ids,
            title="Nouveau message",
            body=f"Nouveau message de {sender_name} dans le chat du match",
            data={"type": "chat", "room_id": str(room.pk)},
        )

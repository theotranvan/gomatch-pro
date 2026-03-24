from datetime import date, time

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from chat.models import ChatMessage, ChatRoom
from core.enums import (
    ChatRoomType,
    MatchStatus,
    MatchType,
    MessageType,
    ParticipantRole,
    ParticipantStatus,
    PlayMode,
    SportType,
)
from matches.models import Match, MatchParticipant

User = get_user_model()


class ChatSignalTests(TestCase):
    """Tests for automatic ChatRoom creation via signals."""

    def setUp(self):
        self.user1 = User.objects.create_user(
            email="creator@test.com",
            password="testpass123",
        )

    def test_chatroom_auto_created_on_match(self):
        """A ChatRoom should be auto-created when a Match is created."""
        match = Match.objects.create(
            sport=SportType.TENNIS,
            match_type=MatchType.SINGLES,
            play_mode=PlayMode.FRIENDLY,
            status=MatchStatus.DRAFT,
            scheduled_date=date(2026, 5, 1),
            scheduled_time=time(10, 0),
            created_by=self.user1,
            max_participants=2,
        )
        self.assertTrue(
            ChatRoom.objects.filter(match=match).exists(),
        )
        room = match.chat_room
        self.assertEqual(room.room_type, ChatRoomType.MATCH)
        self.assertIn(self.user1, room.participants.all())

    def test_participant_added_to_chat(self):
        """When a participant is accepted, they join the ChatRoom."""
        match = Match.objects.create(
            sport=SportType.TENNIS,
            match_type=MatchType.SINGLES,
            play_mode=PlayMode.FRIENDLY,
            status=MatchStatus.DRAFT,
            scheduled_date=date(2026, 5, 1),
            scheduled_time=time(10, 0),
            created_by=self.user1,
            max_participants=2,
        )
        user2 = User.objects.create_user(
            email="joiner@test.com",
            password="testpass123",
        )
        MatchParticipant.objects.create(
            match=match,
            player=user2.profile,
            role=ParticipantRole.JOINED,
            status=ParticipantStatus.ACCEPTED,
        )
        room = match.chat_room
        self.assertIn(user2, room.participants.all())

    def test_system_message_on_join(self):
        """A system message should be created when a player joins."""
        match = Match.objects.create(
            sport=SportType.TENNIS,
            match_type=MatchType.SINGLES,
            play_mode=PlayMode.FRIENDLY,
            status=MatchStatus.DRAFT,
            scheduled_date=date(2026, 5, 1),
            scheduled_time=time(10, 0),
            created_by=self.user1,
            max_participants=2,
        )
        user2 = User.objects.create_user(
            email="joiner@test.com",
            password="testpass123",
        )
        user2.profile.first_name = "Bob"
        user2.profile.save()

        MatchParticipant.objects.create(
            match=match,
            player=user2.profile,
            role=ParticipantRole.JOINED,
            status=ParticipantStatus.ACCEPTED,
        )
        room = match.chat_room
        system_msgs = room.messages.filter(message_type=MessageType.SYSTEM)
        self.assertEqual(system_msgs.count(), 1)
        self.assertIn("Bob", system_msgs.first().content)


class SendMessageAPITests(TestCase):
    """Tests for POST /api/chat/rooms/:id/messages/."""

    def setUp(self):
        self.client = APIClient()
        self.user1 = User.objects.create_user(
            email="player1@test.com",
            password="testpass123",
        )
        self.user2 = User.objects.create_user(
            email="player2@test.com",
            password="testpass123",
        )
        self.match = Match.objects.create(
            sport=SportType.TENNIS,
            match_type=MatchType.SINGLES,
            play_mode=PlayMode.FRIENDLY,
            status=MatchStatus.DRAFT,
            scheduled_date=date(2026, 5, 1),
            scheduled_time=time(10, 0),
            created_by=self.user1,
            max_participants=2,
        )
        self.room = self.match.chat_room
        # user1 is already participant via signal; add user2
        self.room.participants.add(self.user2)

    def test_send_message(self):
        """A participant should be able to send a message."""
        self.client.force_authenticate(user=self.user1)
        url = f"/api/chat/rooms/{self.room.id}/messages/"
        response = self.client.post(
            url,
            {"content": "Salut, prêt pour le match ?"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["content"], "Salut, prêt pour le match ?")
        self.assertEqual(response.data["message_type"], "text")

    def test_non_participant_cannot_send(self):
        """A non-participant should get 403."""
        outsider = User.objects.create_user(
            email="outsider@test.com",
            password="testpass123",
        )
        self.client.force_authenticate(user=outsider)
        url = f"/api/chat/rooms/{self.room.id}/messages/"
        response = self.client.post(
            url,
            {"content": "Je veux parler"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class MessagePaginationAPITests(TestCase):
    """Tests for GET /api/chat/rooms/:id/messages/ pagination."""

    def setUp(self):
        self.client = APIClient()
        self.user1 = User.objects.create_user(
            email="player1@test.com",
            password="testpass123",
        )
        self.match = Match.objects.create(
            sport=SportType.TENNIS,
            match_type=MatchType.SINGLES,
            play_mode=PlayMode.FRIENDLY,
            status=MatchStatus.DRAFT,
            scheduled_date=date(2026, 5, 1),
            scheduled_time=time(10, 0),
            created_by=self.user1,
            max_participants=2,
        )
        self.room = self.match.chat_room
        # Create 55 messages to test pagination (page_size=50)
        for i in range(55):
            ChatMessage.objects.create(
                room=self.room,
                sender=self.user1,
                content=f"Message {i}",
            )
        self.client.force_authenticate(user=self.user1)

    def test_message_pagination(self):
        """Messages should be paginated (50 per page)."""
        url = f"/api/chat/rooms/{self.room.id}/messages/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 50)
        self.assertIsNotNone(response.data["next"])
        # Second page
        response2 = self.client.get(url, {"page": 2})
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response2.data["results"]), 5)

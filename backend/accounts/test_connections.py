"""
Tests for the connections system.
"""

from unittest.mock import patch

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import Connection
from core.enums import ConnectionStatus

User = get_user_model()


class ConnectionTestBase(TestCase):
    """Shared set-up: two authenticated users."""

    def setUp(self):
        self.client = APIClient()
        self.user_a = User.objects.create_user(email="alice@test.com", password="pass1234")
        self.user_b = User.objects.create_user(email="bob@test.com", password="pass1234")
        # Fill names so display_name works
        self.user_a.profile.first_name = "Alice"
        self.user_a.profile.last_name = "Dupont"
        self.user_a.profile.save()
        self.user_b.profile.first_name = "Bob"
        self.user_b.profile.last_name = "Martin"
        self.user_b.profile.save()
        self.client.force_authenticate(user=self.user_a)


class SendRequestTests(ConnectionTestBase):
    """POST /api/connections/request/"""

    @patch("accounts.connections.NotificationService.send_push")
    def test_send_request(self, mock_push):
        """Sending a connection request should create a PENDING connection."""
        resp = self.client.post(
            "/api/connections/request/",
            {"player_id": str(self.user_b.profile.pk)},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["status"], "pending")
        self.assertEqual(Connection.objects.count(), 1)
        mock_push.assert_called_once()

    def test_cannot_connect_self(self):
        """Requesting a connection with oneself should fail."""
        resp = self.client.post(
            "/api/connections/request/",
            {"player_id": str(self.user_a.profile.pk)},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("accounts.connections.NotificationService.send_push")
    def test_duplicate_request(self, mock_push):
        """Sending a request twice should fail with 400."""
        self.client.post(
            "/api/connections/request/",
            {"player_id": str(self.user_b.profile.pk)},
            format="json",
        )
        resp = self.client.post(
            "/api/connections/request/",
            {"player_id": str(self.user_b.profile.pk)},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_request_unauthenticated(self):
        """Unauthenticated request should return 401."""
        self.client.force_authenticate(user=None)
        resp = self.client.post(
            "/api/connections/request/",
            {"player_id": str(self.user_b.profile.pk)},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    @patch("accounts.connections.NotificationService.send_push")
    def test_request_nonexistent_player(self, mock_push):
        """Requesting a connection with a non-existent player should return 404."""
        resp = self.client.post(
            "/api/connections/request/",
            {"player_id": "00000000-0000-0000-0000-000000000000"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)


class AcceptDeclineTests(ConnectionTestBase):
    """POST /api/connections/:id/accept/ and /decline/"""

    @patch("accounts.connections.NotificationService.send_push")
    def test_accept(self, mock_push):
        """Receiver should be able to accept a pending request."""
        conn = Connection.objects.create(
            requester=self.user_a.profile, receiver=self.user_b.profile
        )
        self.client.force_authenticate(user=self.user_b)
        resp = self.client.post(f"/api/connections/{conn.pk}/accept/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["status"], "accepted")
        conn.refresh_from_db()
        self.assertEqual(conn.status, ConnectionStatus.ACCEPTED)
        mock_push.assert_called_once()

    def test_accept_wrong_user(self):
        """Requester should NOT be able to accept their own request."""
        conn = Connection.objects.create(
            requester=self.user_a.profile, receiver=self.user_b.profile
        )
        resp = self.client.post(f"/api/connections/{conn.pk}/accept/")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_decline(self):
        """Receiver should be able to decline a pending request."""
        conn = Connection.objects.create(
            requester=self.user_a.profile, receiver=self.user_b.profile
        )
        self.client.force_authenticate(user=self.user_b)
        resp = self.client.post(f"/api/connections/{conn.pk}/decline/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["status"], "declined")

    def test_decline_wrong_user(self):
        """Requester should NOT be able to decline their own request."""
        conn = Connection.objects.create(
            requester=self.user_a.profile, receiver=self.user_b.profile
        )
        resp = self.client.post(f"/api/connections/{conn.pk}/decline/")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


class RemoveConnectionTests(ConnectionTestBase):
    """DELETE /api/connections/:id/"""

    def test_remove_connection(self):
        """Either party can delete an ACCEPTED connection."""
        conn = Connection.objects.create(
            requester=self.user_a.profile,
            receiver=self.user_b.profile,
            status=ConnectionStatus.ACCEPTED,
        )
        resp = self.client.delete(f"/api/connections/{conn.pk}/")
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Connection.objects.count(), 0)

    def test_remove_as_receiver(self):
        """Receiver should also be able to remove the connection."""
        conn = Connection.objects.create(
            requester=self.user_a.profile,
            receiver=self.user_b.profile,
            status=ConnectionStatus.ACCEPTED,
        )
        self.client.force_authenticate(user=self.user_b)
        resp = self.client.delete(f"/api/connections/{conn.pk}/")
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)

    def test_remove_by_stranger(self):
        """A third user should NOT be able to delete someone else's connection."""
        user_c = User.objects.create_user(email="charlie@test.com", password="pass1234")
        conn = Connection.objects.create(
            requester=self.user_a.profile,
            receiver=self.user_b.profile,
            status=ConnectionStatus.ACCEPTED,
        )
        self.client.force_authenticate(user=user_c)
        resp = self.client.delete(f"/api/connections/{conn.pk}/")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


class BlockTests(ConnectionTestBase):
    """POST /api/connections/block/"""

    def test_block(self):
        """Blocking a player should create a BLOCKED connection."""
        resp = self.client.post(
            "/api/connections/block/",
            {"player_id": str(self.user_b.profile.pk)},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["status"], "blocked")

    def test_block_self(self):
        """Cannot block oneself."""
        resp = self.client.post(
            "/api/connections/block/",
            {"player_id": str(self.user_a.profile.pk)},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_block_overrides_accepted(self):
        """Blocking overrides an existing ACCEPTED connection."""
        Connection.objects.create(
            requester=self.user_a.profile,
            receiver=self.user_b.profile,
            status=ConnectionStatus.ACCEPTED,
        )
        resp = self.client.post(
            "/api/connections/block/",
            {"player_id": str(self.user_b.profile.pk)},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["status"], "blocked")
        self.assertEqual(Connection.objects.count(), 1)


class ListAndCountTests(ConnectionTestBase):
    """GET /api/connections/, /pending/, /count/"""

    def test_list_connections(self):
        """List should return only ACCEPTED connections."""
        Connection.objects.create(
            requester=self.user_a.profile,
            receiver=self.user_b.profile,
            status=ConnectionStatus.ACCEPTED,
        )
        # Create a PENDING one (should NOT appear)
        user_c = User.objects.create_user(email="charlie@test.com", password="pass1234")
        Connection.objects.create(requester=user_c.profile, receiver=self.user_a.profile)

        resp = self.client.get("/api/connections/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]["status"], "accepted")

    def test_pending_requests(self):
        """Pending list should return only PENDING requests received."""
        Connection.objects.create(
            requester=self.user_b.profile, receiver=self.user_a.profile
        )
        resp = self.client.get("/api/connections/pending/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]["status"], "pending")

    def test_count(self):
        """Count should return the number of ACCEPTED connections."""
        Connection.objects.create(
            requester=self.user_a.profile,
            receiver=self.user_b.profile,
            status=ConnectionStatus.ACCEPTED,
        )
        resp = self.client.get("/api/connections/count/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["count"], 1)


class ConnectionStatusTests(ConnectionTestBase):
    """GET /api/connections/status/:player_id/"""

    def test_no_connection(self):
        """Should return null status when no connection exists."""
        resp = self.client.get(f"/api/connections/status/{self.user_b.profile.pk}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsNone(resp.data["status"])

    @patch("accounts.connections.NotificationService.send_push")
    def test_pending_status(self, mock_push):
        """Should return pending status after sending a request."""
        self.client.post(
            "/api/connections/request/",
            {"player_id": str(self.user_b.profile.pk)},
            format="json",
        )
        resp = self.client.get(f"/api/connections/status/{self.user_b.profile.pk}/")
        self.assertEqual(resp.data["status"], "pending")
        self.assertEqual(resp.data["direction"], "sent")

    @patch("accounts.connections.NotificationService.send_push")
    def test_re_request_after_decline(self, mock_push):
        """After decline, a new request should reset to PENDING."""
        conn = Connection.objects.create(
            requester=self.user_a.profile,
            receiver=self.user_b.profile,
            status=ConnectionStatus.DECLINED,
        )
        resp = self.client.post(
            "/api/connections/request/",
            {"player_id": str(self.user_b.profile.pk)},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        conn.refresh_from_db()
        self.assertEqual(conn.status, ConnectionStatus.PENDING)

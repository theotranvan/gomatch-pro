"""
Service layer for player-to-player connections.
Handles business logic: send / accept / decline / remove / block.
"""

from django.db import IntegrityError
from django.db.models import Q
from rest_framework.exceptions import ValidationError, NotFound, PermissionDenied

from accounts.models import Connection, PlayerProfile
from core.enums import ConnectionStatus
from core.notifications import NotificationService


class ConnectionService:
    """All connection operations live here."""

    # ── Send request ──────────────────────────────────────────────────────

    @staticmethod
    def send_request(user, target_player_id):
        """Create a PENDING connection from *user* to *target_player_id*."""
        requester = user.profile

        try:
            receiver = PlayerProfile.objects.get(pk=target_player_id)
        except PlayerProfile.DoesNotExist:
            raise NotFound("Joueur introuvable.")

        if requester.pk == receiver.pk:
            raise ValidationError("Impossible de se connecter à soi-même.")

        # Check if a connection already exists in either direction
        existing = Connection.objects.filter(
            Q(requester=requester, receiver=receiver)
            | Q(requester=receiver, receiver=requester)
        ).first()

        if existing:
            if existing.status == ConnectionStatus.BLOCKED:
                raise ValidationError("Action impossible.")
            if existing.status == ConnectionStatus.ACCEPTED:
                raise ValidationError("Vous êtes déjà connectés.")
            if existing.status == ConnectionStatus.PENDING:
                # If *we* are the receiver of an existing pending request, auto-accept
                if existing.receiver == requester:
                    existing.status = ConnectionStatus.ACCEPTED
                    existing.save(update_fields=["status", "updated_at"])
                    NotificationService.send_push(
                        [existing.requester.user_id],
                        "Connexion acceptée 🤝",
                        f"{requester.display_name} a accepté ta demande.",
                        {"type": "connection_accepted"},
                    )
                    return existing
                raise ValidationError("Demande déjà envoyée.")
            # DECLINED → allow re-request by resetting
            if existing.status == ConnectionStatus.DECLINED:
                existing.requester = requester
                existing.receiver = receiver
                existing.status = ConnectionStatus.PENDING
                existing.save(update_fields=["requester", "receiver", "status", "updated_at"])
                NotificationService.send_push(
                    [receiver.user_id],
                    "Nouvelle demande de connexion 🎾",
                    f"{requester.display_name} veut se connecter avec toi.",
                    {"type": "connection_request"},
                )
                return existing

        try:
            conn = Connection.objects.create(requester=requester, receiver=receiver)
        except IntegrityError:
            raise ValidationError("Demande déjà envoyée.")

        NotificationService.send_push(
            [receiver.user_id],
            "Nouvelle demande de connexion 🎾",
            f"{requester.display_name} veut se connecter avec toi.",
            {"type": "connection_request"},
        )
        return conn

    # ── Accept ────────────────────────────────────────────────────────────

    @staticmethod
    def accept_request(user, connection_id):
        """Accept a PENDING connection addressed to *user*."""
        conn = ConnectionService._get_connection(connection_id)
        if conn.receiver != user.profile:
            raise PermissionDenied("Seul le destinataire peut accepter.")
        if conn.status != ConnectionStatus.PENDING:
            raise ValidationError("Cette demande n'est plus en attente.")

        conn.status = ConnectionStatus.ACCEPTED
        conn.save(update_fields=["status", "updated_at"])

        NotificationService.send_push(
            [conn.requester.user_id],
            "Connexion acceptée 🤝",
            f"{user.profile.display_name} a accepté ta demande.",
            {"type": "connection_accepted"},
        )
        return conn

    # ── Decline ───────────────────────────────────────────────────────────

    @staticmethod
    def decline_request(user, connection_id):
        """Decline a PENDING connection addressed to *user*."""
        conn = ConnectionService._get_connection(connection_id)
        if conn.receiver != user.profile:
            raise PermissionDenied("Seul le destinataire peut décliner.")
        if conn.status != ConnectionStatus.PENDING:
            raise ValidationError("Cette demande n'est plus en attente.")

        conn.status = ConnectionStatus.DECLINED
        conn.save(update_fields=["status", "updated_at"])
        return conn

    # ── Remove ────────────────────────────────────────────────────────────

    @staticmethod
    def remove_connection(user, connection_id):
        """Remove (delete) an ACCEPTED connection where *user* is a party."""
        conn = ConnectionService._get_connection(connection_id)
        profile = user.profile
        if conn.requester != profile and conn.receiver != profile:
            raise PermissionDenied("Vous n'êtes pas partie de cette connexion.")
        conn.delete()

    # ── Block ─────────────────────────────────────────────────────────────

    @staticmethod
    def block_user(user, target_player_id):
        """Block a player. Creates or updates the Connection to BLOCKED."""
        blocker = user.profile

        try:
            target = PlayerProfile.objects.get(pk=target_player_id)
        except PlayerProfile.DoesNotExist:
            raise NotFound("Joueur introuvable.")

        if blocker.pk == target.pk:
            raise ValidationError("Impossible de se bloquer soi-même.")

        existing = Connection.objects.filter(
            Q(requester=blocker, receiver=target)
            | Q(requester=target, receiver=blocker)
        ).first()

        if existing:
            existing.requester = blocker
            existing.receiver = target
            existing.status = ConnectionStatus.BLOCKED
            existing.save(update_fields=["requester", "receiver", "status", "updated_at"])
            return existing

        return Connection.objects.create(
            requester=blocker, receiver=target, status=ConnectionStatus.BLOCKED
        )

    # ── Queries ───────────────────────────────────────────────────────────

    @staticmethod
    def get_connections(user):
        """Return ACCEPTED connections involving *user*."""
        profile = user.profile
        return Connection.objects.filter(
            Q(requester=profile) | Q(receiver=profile),
            status=ConnectionStatus.ACCEPTED,
        ).select_related(
            "requester__user", "receiver__user"
        )

    @staticmethod
    def get_pending_requests(user):
        """Return PENDING connection requests received by *user*."""
        return Connection.objects.filter(
            receiver=user.profile,
            status=ConnectionStatus.PENDING,
        ).select_related("requester__user")

    @staticmethod
    def get_connection_count(user):
        """Return the number of ACCEPTED connections for *user*."""
        profile = user.profile
        return Connection.objects.filter(
            Q(requester=profile) | Q(receiver=profile),
            status=ConnectionStatus.ACCEPTED,
        ).count()

    @staticmethod
    def are_connected(user_a, user_b):
        """Return True if the two users have an ACCEPTED connection."""
        pa = user_a.profile
        pb = user_b.profile
        return Connection.objects.filter(
            Q(requester=pa, receiver=pb) | Q(requester=pb, receiver=pa),
            status=ConnectionStatus.ACCEPTED,
        ).exists()

    @staticmethod
    def get_connection_status(user, target_player_id):
        """
        Return the connection status between *user* and a target player.
        Returns a dict: {status, connection_id, direction}.
        """
        profile = user.profile
        conn = Connection.objects.filter(
            Q(requester=profile, receiver_id=target_player_id)
            | Q(requester_id=target_player_id, receiver=profile)
        ).first()

        if not conn:
            return {"status": None, "connection_id": None, "direction": None}

        direction = "sent" if conn.requester == profile else "received"
        return {
            "status": conn.status,
            "connection_id": str(conn.pk),
            "direction": direction,
        }

    # ── Internal helpers ──────────────────────────────────────────────────

    @staticmethod
    def _get_connection(connection_id):
        try:
            return Connection.objects.select_related(
                "requester__user", "receiver__user"
            ).get(pk=connection_id)
        except Connection.DoesNotExist:
            raise NotFound("Connexion introuvable.")

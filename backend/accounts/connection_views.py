"""
API views for the connections system.
"""

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

from accounts.connections import ConnectionService
from accounts.serializers import (
    ConnectionSerializer,
    ConnectionRequestSerializer,
)


@extend_schema(tags=["Connections"])
class SendConnectionRequestView(APIView):
    """POST /api/connections/request/ — Send a connection request."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=ConnectionRequestSerializer, responses=ConnectionSerializer)
    def post(self, request):
        ser = ConnectionRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        conn = ConnectionService.send_request(request.user, ser.validated_data["player_id"])
        return Response(ConnectionSerializer(conn).data, status=status.HTTP_201_CREATED)


@extend_schema(tags=["Connections"])
class AcceptConnectionView(APIView):
    """POST /api/connections/:id/accept/"""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        conn = ConnectionService.accept_request(request.user, pk)
        return Response(ConnectionSerializer(conn).data)


@extend_schema(tags=["Connections"])
class DeclineConnectionView(APIView):
    """POST /api/connections/:id/decline/"""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        conn = ConnectionService.decline_request(request.user, pk)
        return Response(ConnectionSerializer(conn).data)


@extend_schema(tags=["Connections"])
class RemoveConnectionView(APIView):
    """DELETE /api/connections/:id/"""

    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        ConnectionService.remove_connection(request.user, pk)
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["Connections"])
class ConnectionListView(APIView):
    """GET /api/connections/ — List my ACCEPTED connections."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = ConnectionService.get_connections(request.user)
        return Response(ConnectionSerializer(qs, many=True).data)


@extend_schema(tags=["Connections"])
class PendingConnectionsView(APIView):
    """GET /api/connections/pending/ — List received PENDING requests."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = ConnectionService.get_pending_requests(request.user)
        return Response(ConnectionSerializer(qs, many=True).data)


@extend_schema(tags=["Connections"])
class ConnectionCountView(APIView):
    """GET /api/connections/count/"""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        count = ConnectionService.get_connection_count(request.user)
        return Response({"count": count})


@extend_schema(tags=["Connections"])
class ConnectionStatusView(APIView):
    """GET /api/connections/status/:player_id/ — Check connection status with a player."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, player_id):
        result = ConnectionService.get_connection_status(request.user, player_id)
        return Response(result)


@extend_schema(tags=["Connections"])
class BlockUserView(APIView):
    """POST /api/connections/block/ — Block a player."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=ConnectionRequestSerializer)
    def post(self, request):
        ser = ConnectionRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        conn = ConnectionService.block_user(request.user, ser.validated_data["player_id"])
        return Response(ConnectionSerializer(conn).data)

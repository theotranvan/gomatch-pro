from django.urls import path

from accounts.connection_views import (
    SendConnectionRequestView,
    AcceptConnectionView,
    DeclineConnectionView,
    RemoveConnectionView,
    ConnectionListView,
    PendingConnectionsView,
    ConnectionCountView,
    ConnectionStatusView,
    BlockUserView,
)

app_name = "connections"

urlpatterns = [
    path("", ConnectionListView.as_view(), name="connection-list"),
    path("request/", SendConnectionRequestView.as_view(), name="connection-request"),
    path("pending/", PendingConnectionsView.as_view(), name="connection-pending"),
    path("count/", ConnectionCountView.as_view(), name="connection-count"),
    path("block/", BlockUserView.as_view(), name="connection-block"),
    path("status/<uuid:player_id>/", ConnectionStatusView.as_view(), name="connection-status"),
    path("<uuid:pk>/accept/", AcceptConnectionView.as_view(), name="connection-accept"),
    path("<uuid:pk>/decline/", DeclineConnectionView.as_view(), name="connection-decline"),
    path("<uuid:pk>/", RemoveConnectionView.as_view(), name="connection-remove"),
]

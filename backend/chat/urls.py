from django.urls import path

from chat.views import (
    ChatMessageListCreateView,
    ChatRoomListView,
    MarkReadView,
)

app_name = "chat"

urlpatterns = [
    path("rooms/", ChatRoomListView.as_view(), name="room-list"),
    path(
        "rooms/<uuid:pk>/messages/",
        ChatMessageListCreateView.as_view(),
        name="room-messages",
    ),
    path(
        "rooms/<uuid:pk>/mark-read/",
        MarkReadView.as_view(),
        name="mark-read",
    ),
]

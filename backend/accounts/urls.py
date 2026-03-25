from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from accounts.views import (
    RegisterView,
    LoginView,
    MeView,
    PlayerListView,
    PlayerDetailView,
    UpdateProfileView,
    RegisterPushTokenView,
)

app_name = "accounts"

urlpatterns = [
    # Auth
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    # Profile
    path("me/", MeView.as_view(), name="me"),
    path("profile/", UpdateProfileView.as_view(), name="update-profile"),
    path("push-token/", RegisterPushTokenView.as_view(), name="push-token"),
]

# Player list — mounted separately in root urls.py
player_urlpatterns = [
    path("", PlayerListView.as_view(), name="player-list"),
    path("<uuid:pk>/", PlayerDetailView.as_view(), name="player-detail"),
]

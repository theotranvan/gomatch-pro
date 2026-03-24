"""
gomatch_api URL Configuration
"""

from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

from accounts.urls import player_urlpatterns
from scoring.urls import ranking_urlpatterns

urlpatterns = [
    path("admin/", admin.site.urls),
    # API Documentation
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    # API endpoints
    path("api/auth/", include("accounts.urls")),
    path("api/players/", include(player_urlpatterns)),
    path("api/venues/", include("venues.urls")),
    path("api/matches/", include("matches.urls")),
    path("api/scores/", include("scoring.urls")),
    path("api/rankings/", include(ranking_urlpatterns)),
    path("api/chat/", include("chat.urls")),
]

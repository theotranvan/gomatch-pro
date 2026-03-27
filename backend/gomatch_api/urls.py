"""
gomatch_api URL Configuration
"""

from django.conf import settings
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.db import connection
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

from accounts.urls import player_urlpatterns
from scoring.urls import ranking_urlpatterns, stats_urlpatterns


def health_check(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        db_ok = True
    except Exception:
        db_ok = False
    status_code = 200 if db_ok else 503
    return JsonResponse({"status": "ok" if db_ok else "error", "db": db_ok}, status=status_code)


urlpatterns = [
    path("admin/", admin.site.urls),
    # Health check
    path("api/health/", health_check, name="health-check"),
    # API Documentation
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    # API endpoints
    path("api/auth/", include("accounts.urls")),
    path("api/connections/", include("accounts.connection_urls")),
    path("api/players/", include(player_urlpatterns)),
    path("api/venues/", include("venues.urls")),
    path("api/matches/", include("matches.urls")),
    path("api/scores/", include("scoring.urls")),
    path("api/rankings/", include(ranking_urlpatterns)),
    path("api/stats/", include(stats_urlpatterns)),
    path("api/chat/", include("chat.urls")),
    path("api/bookings/", include("bookings.urls")),
    path("api/payments/", include("payments.urls")),
    path("api/tournaments/", include("competitions.urls")),
    path("api/events/", include("events.urls")),
]

if settings.DEBUG:
    import debug_toolbar
    urlpatterns = [path("__debug__/", include(debug_toolbar.urls))] + urlpatterns

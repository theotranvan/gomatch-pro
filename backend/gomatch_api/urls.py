"""
gomatch_api URL Configuration
"""

from django.conf import settings
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.db import connection
from django.core.cache import cache
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

from accounts.urls import player_urlpatterns
from scoring.urls import ranking_urlpatterns, stats_urlpatterns


def health_check(request):
    components = {}

    # Database
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        components["db"] = "ok"
    except Exception as e:
        components["db"] = f"error: {e.__class__.__name__}"

    # Redis / Cache
    try:
        cache.set("_health", "1", timeout=5)
        val = cache.get("_health")
        components["cache"] = "ok" if val == "1" else "error: read-back failed"
    except Exception as e:
        components["cache"] = f"error: {e.__class__.__name__}"

    # Celery
    try:
        from gomatch_api.celery import app as celery_app
        insp = celery_app.control.inspect(timeout=2)
        ping = insp.ping()
        components["celery"] = "ok" if ping else "warn: no workers"
    except Exception as e:
        components["celery"] = f"error: {e.__class__.__name__}"

    has_error = any(v.startswith("error") for v in components.values())
    all_ok = all(v == "ok" for v in components.values())
    if has_error:
        status_code, status_label = 503, "error"
    elif all_ok:
        status_code, status_label = 200, "ok"
    else:
        status_code, status_label = 200, "degraded"
    return JsonResponse(
        {"status": status_label, "components": components},
        status=status_code,
    )


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

    def sentry_test(request):
        """Temporary endpoint to verify Sentry captures errors. Remove after testing."""
        _ = 1 / 0

    urlpatterns = [
        path("__debug__/", include(debug_toolbar.urls)),
        path("api/sentry-test/", sentry_test, name="sentry-test"),
    ] + urlpatterns

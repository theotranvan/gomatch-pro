from django.urls import path

from scoring.views import (
    ConfirmScoreView,
    DisputeScoreView,
    MyRankingsView,
    RankingListView,
)
from scoring.stats_views import MyStatsView, PlayerStatsView

urlpatterns = [
    path("<uuid:pk>/confirm/", ConfirmScoreView.as_view(), name="confirm-score"),
    path("<uuid:pk>/dispute/", DisputeScoreView.as_view(), name="dispute-score"),
]

# Ranking URLs are registered separately in root urls.py
ranking_urlpatterns = [
    path("", RankingListView.as_view(), name="ranking-list"),
    path("me/", MyRankingsView.as_view(), name="my-rankings"),
]

# Stats URLs are registered separately in root urls.py
stats_urlpatterns = [
    path("me/", MyStatsView.as_view(), name="my-stats"),
    path("<uuid:player_id>/", PlayerStatsView.as_view(), name="player-stats"),
]

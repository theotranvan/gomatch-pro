from django.urls import path

from scoring.views import (
    ConfirmScoreView,
    DisputeScoreView,
    MyRankingsView,
    RankingListView,
)

urlpatterns = [
    path("<uuid:pk>/confirm/", ConfirmScoreView.as_view(), name="confirm-score"),
    path("<uuid:pk>/dispute/", DisputeScoreView.as_view(), name="dispute-score"),
]

# Ranking URLs are registered separately in root urls.py
ranking_urlpatterns = [
    path("", RankingListView.as_view(), name="ranking-list"),
    path("me/", MyRankingsView.as_view(), name="my-rankings"),
]

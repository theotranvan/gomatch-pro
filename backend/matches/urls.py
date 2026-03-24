from django.urls import path

from matches.views import (
    MatchCreateView,
    MatchDetailView,
    MatchJoinView,
    MatchListView,
    MyMatchesView,
    OpenMatchCreateView,
    OpenMatchDetailView,
    OpenMatchJoinView,
    OpenMatchListView,
)
from scoring.views import SubmitScoreView

app_name = "matches"

urlpatterns = [
    path("", MatchListView.as_view(), name="match-list"),
    path("create/", MatchCreateView.as_view(), name="match-create"),
    path("my/", MyMatchesView.as_view(), name="my-matches"),
    path("<uuid:pk>/", MatchDetailView.as_view(), name="match-detail"),
    path("<uuid:pk>/join/", MatchJoinView.as_view(), name="match-join"),
    path("<uuid:match_id>/score/", SubmitScoreView.as_view(), name="submit-score"),
    # Open matches
    path("open/", OpenMatchListView.as_view(), name="open-match-list"),
    path("open/create/", OpenMatchCreateView.as_view(), name="open-match-create"),
    path("open/<uuid:pk>/", OpenMatchDetailView.as_view(), name="open-match-detail"),
    path("open/<uuid:pk>/join/", OpenMatchJoinView.as_view(), name="open-match-join"),
]

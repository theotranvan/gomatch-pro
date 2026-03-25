from django.urls import path

from competitions.views import (
    TournamentCreateView,
    TournamentDetailView,
    TournamentGenerateBracketView,
    TournamentListView,
    TournamentRegisterView,
    TournamentSetWinnerView,
)

app_name = "competitions"

urlpatterns = [
    path("", TournamentListView.as_view(), name="tournament-list"),
    path("create/", TournamentCreateView.as_view(), name="tournament-create"),
    path("<uuid:pk>/", TournamentDetailView.as_view(), name="tournament-detail"),
    path("<uuid:pk>/register/", TournamentRegisterView.as_view(), name="tournament-register"),
    path("<uuid:pk>/generate-bracket/", TournamentGenerateBracketView.as_view(), name="tournament-generate-bracket"),
    path("<uuid:pk>/matches/<uuid:match_pk>/set-winner/", TournamentSetWinnerView.as_view(), name="tournament-set-winner"),
]

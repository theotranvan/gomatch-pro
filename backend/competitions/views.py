from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from competitions.models import Tournament
from competitions.serializers import (
    CreateTournamentSerializer,
    RegisterTournamentSerializer,
    SetWinnerSerializer,
    TournamentDetailSerializer,
    TournamentListSerializer,
)
from competitions.services import TournamentService
from venues.models import Venue


class TournamentListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TournamentListSerializer
    # Optimized: 2 queries (tournaments + participants) instead of N+1
    queryset = Tournament.objects.prefetch_related("participants").order_by("-created_at")


class TournamentCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = CreateTournamentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Resolve venue UUID to instance
        venue_id = data.pop("venue", None)
        if venue_id:
            try:
                data["venue"] = Venue.objects.get(pk=venue_id)
            except Venue.DoesNotExist:
                return Response(
                    {"detail": "Venue not found."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        try:
            tournament = TournamentService.create_tournament(request.user, data)
        except ValueError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        output = TournamentDetailSerializer(tournament).data
        return Response(output, status=status.HTTP_201_CREATED)


class TournamentDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TournamentDetailSerializer
    # Optimized: prefetch rounds → matches → participants instead of N+1
    queryset = Tournament.objects.prefetch_related(
        "participants__player",
        "rounds__matches__participant_a__player",
        "rounds__matches__participant_b__player",
        "rounds__matches__winner__player",
    )
    lookup_field = "pk"


class TournamentRegisterView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        serializer = RegisterTournamentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            participant = TournamentService.register_player(
                user=request.user,
                tournament_id=pk,
                partner_id=serializer.validated_data.get("partner_id"),
            )
        except ValueError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"detail": "Registered successfully.", "participant_id": str(participant.id)},
            status=status.HTTP_201_CREATED,
        )


class TournamentGenerateBracketView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            tournament = TournamentService.generate_bracket(pk)
        except ValueError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        output = TournamentDetailSerializer(tournament).data
        return Response(output, status=status.HTTP_200_OK)


class TournamentSetWinnerView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk, match_pk):
        serializer = SetWinnerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            TournamentService.advance_winner(
                tournament_match_id=match_pk,
                winner_participant_id=serializer.validated_data["winner_participant_id"],
            )
        except ValueError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({"detail": "Winner recorded."}, status=status.HTTP_200_OK)

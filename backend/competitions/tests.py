from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from competitions.models import (
    Tournament,
    TournamentMatch,
    TournamentParticipant,
    TournamentRound,
)
from competitions.services import TournamentService
from core.enums import (
    MatchType,
    SkillLevel,
    SportType,
    TournamentFormat,
    TournamentMatchStatus,
    TournamentParticipantStatus,
    TournamentRoundStatus,
    TournamentStatus,
)

User = get_user_model()


class TournamentModelTests(TestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            email="organizer@test.com", password="testpass123"
        )

    def test_tournament_str(self):
        t = Tournament.objects.create(
            name="Open Tennis 2025",
            sport=SportType.TENNIS,
            match_type=MatchType.SINGLES,
            format=TournamentFormat.SINGLE_ELIMINATION,
            max_participants=8,
            start_date=date.today(),
            created_by=self.user,
        )
        self.assertIn("Open Tennis 2025", str(t))

    def test_is_full_false(self):
        t = Tournament.objects.create(
            name="Test", sport=SportType.TENNIS, match_type=MatchType.SINGLES,
            format=TournamentFormat.SINGLE_ELIMINATION, max_participants=4,
            start_date=date.today(), created_by=self.user,
        )
        self.assertFalse(t.is_full)

    def test_is_full_true(self):
        t = Tournament.objects.create(
            name="Test", sport=SportType.TENNIS, match_type=MatchType.SINGLES,
            format=TournamentFormat.SINGLE_ELIMINATION, max_participants=2,
            start_date=date.today(), created_by=self.user,
        )
        for i in range(2):
            u = User.objects.create_user(email=f"p{i}@test.com", password="test")
            TournamentParticipant.objects.create(tournament=t, player=u.profile)
        self.assertTrue(t.is_full)


class TournamentServiceTests(TestCase):

    def setUp(self):
        self.organizer = User.objects.create_user(
            email="organizer@test.com", password="testpass123"
        )
        self.players = []
        for i in range(8):
            u = User.objects.create_user(
                email=f"player{i}@test.com", password="testpass123"
            )
            u.profile.level_tennis = SkillLevel.INTERMEDIATE
            u.profile.save()
            self.players.append(u)

    def _create_tournament(self, max_participants=8, **kwargs):
        data = {
            "name": "Test Tournament",
            "sport": SportType.TENNIS,
            "match_type": MatchType.SINGLES,
            "format": TournamentFormat.SINGLE_ELIMINATION,
            "max_participants": max_participants,
            "start_date": date.today(),
            **kwargs,
        }
        return TournamentService.create_tournament(self.organizer, data)

    def test_create_tournament(self):
        t = self._create_tournament()
        self.assertEqual(t.status, TournamentStatus.REGISTRATION)
        self.assertEqual(t.created_by, self.organizer)

    def test_create_padel_forces_doubles(self):
        t = TournamentService.create_tournament(self.organizer, {
            "name": "Padel Open",
            "sport": SportType.PADEL,
            "format": TournamentFormat.SINGLE_ELIMINATION,
            "max_participants": 8,
            "start_date": date.today(),
        })
        self.assertEqual(t.match_type, MatchType.DOUBLES)

    def test_register_player(self):
        t = self._create_tournament()
        p = TournamentService.register_player(self.players[0], t.id)
        self.assertEqual(p.player, self.players[0].profile)
        self.assertEqual(t.current_participants_count, 1)

    def test_register_duplicate_raises(self):
        t = self._create_tournament()
        TournamentService.register_player(self.players[0], t.id)
        with self.assertRaises(ValueError):
            TournamentService.register_player(self.players[0], t.id)

    def test_register_full_raises(self):
        t = self._create_tournament(max_participants=2)
        TournamentService.register_player(self.players[0], t.id)
        TournamentService.register_player(self.players[1], t.id)
        with self.assertRaises(ValueError):
            TournamentService.register_player(self.players[2], t.id)

    def test_register_level_too_low(self):
        t = self._create_tournament(required_level_min=SkillLevel.ADVANCED)
        with self.assertRaises(ValueError):
            TournamentService.register_player(self.players[0], t.id)

    def test_register_closed_raises(self):
        t = self._create_tournament()
        t.status = TournamentStatus.IN_PROGRESS
        t.save()
        with self.assertRaises(ValueError):
            TournamentService.register_player(self.players[0], t.id)

    def test_generate_bracket_4_players(self):
        t = self._create_tournament(max_participants=4)
        for i in range(4):
            TournamentService.register_player(self.players[i], t.id)
        t = TournamentService.generate_bracket(t.id)
        self.assertEqual(t.status, TournamentStatus.IN_PROGRESS)
        self.assertEqual(t.rounds.count(), 2)  # semi + final
        first_round = t.rounds.get(round_number=1)
        self.assertEqual(first_round.matches.count(), 2)

    def test_generate_bracket_with_byes(self):
        t = self._create_tournament(max_participants=8)
        for i in range(3):
            TournamentService.register_player(self.players[i], t.id)
        t = TournamentService.generate_bracket(t.id)
        # 3 players -> bracket_size 4, 1 bye
        first_round = t.rounds.get(round_number=1)
        completed_matches = first_round.matches.filter(
            status=TournamentMatchStatus.COMPLETED
        )
        self.assertEqual(completed_matches.count(), 1)  # 1 bye auto-advanced

    def test_generate_bracket_not_enough_players(self):
        t = self._create_tournament(max_participants=8)
        TournamentService.register_player(self.players[0], t.id)
        with self.assertRaises(ValueError):
            TournamentService.generate_bracket(t.id)

    def test_advance_winner(self):
        t = self._create_tournament(max_participants=4)
        for i in range(4):
            TournamentService.register_player(self.players[i], t.id)
        t = TournamentService.generate_bracket(t.id)

        first_round = t.rounds.get(round_number=1)
        match1 = first_round.matches.order_by("position").first()
        winner = match1.participant_a

        TournamentService.advance_winner(match1.id, winner.id)
        match1.refresh_from_db()
        self.assertEqual(match1.winner, winner)
        self.assertEqual(match1.status, TournamentMatchStatus.COMPLETED)

        # Winner should be placed in final
        final_round = t.rounds.get(round_number=2)
        final_match = final_round.matches.first()
        final_match.refresh_from_db()
        self.assertEqual(final_match.participant_a, winner)

    def test_advance_winner_completes_tournament(self):
        t = self._create_tournament(max_participants=2)
        TournamentService.register_player(self.players[0], t.id)
        TournamentService.register_player(self.players[1], t.id)
        t = TournamentService.generate_bracket(t.id)

        # Only 1 round with 1 match
        rnd = t.rounds.first()
        match = rnd.matches.first()
        winner = match.participant_a

        TournamentService.advance_winner(match.id, winner.id)
        t.refresh_from_db()
        self.assertEqual(t.status, TournamentStatus.COMPLETED)
        winner.refresh_from_db()
        self.assertEqual(winner.status, TournamentParticipantStatus.WINNER)

    def test_advance_wrong_participant_raises(self):
        t = self._create_tournament(max_participants=4)
        for i in range(4):
            TournamentService.register_player(self.players[i], t.id)
        t = TournamentService.generate_bracket(t.id)

        first_round = t.rounds.get(round_number=1)
        match1 = first_round.matches.order_by("position").first()
        match2 = first_round.matches.order_by("position").last()
        # Try to set match2's participant as winner of match1
        wrong_winner = match2.participant_a
        with self.assertRaises(ValueError):
            TournamentService.advance_winner(match1.id, wrong_winner.id)


class TournamentAPITests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.organizer = User.objects.create_user(
            email="organizer@test.com", password="testpass123"
        )
        self.client.force_authenticate(user=self.organizer)
        self.players = []
        for i in range(4):
            u = User.objects.create_user(
                email=f"player{i}@test.com", password="testpass123"
            )
            u.profile.level_tennis = SkillLevel.INTERMEDIATE
            u.profile.save()
            self.players.append(u)

    def _create_tournament_api(self):
        return self.client.post("/api/tournaments/create/", {
            "name": "API Tournament",
            "sport": SportType.TENNIS,
            "match_type": MatchType.SINGLES,
            "format": TournamentFormat.SINGLE_ELIMINATION,
            "max_participants": 4,
            "start_date": date.today().isoformat(),
        }, format="json")

    def test_create_tournament_api(self):
        resp = self._create_tournament_api()
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["name"], "API Tournament")
        self.assertEqual(resp.data["status"], TournamentStatus.REGISTRATION)

    def test_list_tournaments(self):
        self._create_tournament_api()
        resp = self.client.get("/api/tournaments/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data["results"]), 1)

    def test_detail_tournament(self):
        resp = self._create_tournament_api()
        tid = resp.data["id"]
        resp2 = self.client.get(f"/api/tournaments/{tid}/")
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertEqual(resp2.data["name"], "API Tournament")

    def test_register_api(self):
        resp = self._create_tournament_api()
        tid = resp.data["id"]
        self.client.force_authenticate(user=self.players[0])
        resp2 = self.client.post(f"/api/tournaments/{tid}/register/", format="json")
        self.assertEqual(resp2.status_code, status.HTTP_201_CREATED)

    def test_generate_bracket_api(self):
        resp = self._create_tournament_api()
        tid = resp.data["id"]
        for p in self.players:
            self.client.force_authenticate(user=p)
            self.client.post(f"/api/tournaments/{tid}/register/", format="json")
        self.client.force_authenticate(user=self.organizer)
        resp2 = self.client.post(f"/api/tournaments/{tid}/generate-bracket/", format="json")
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertEqual(resp2.data["status"], TournamentStatus.IN_PROGRESS)

    def test_set_winner_api(self):
        resp = self._create_tournament_api()
        tid = resp.data["id"]
        for p in self.players:
            self.client.force_authenticate(user=p)
            self.client.post(f"/api/tournaments/{tid}/register/", format="json")
        self.client.force_authenticate(user=self.organizer)
        self.client.post(f"/api/tournaments/{tid}/generate-bracket/", format="json")

        t = Tournament.objects.get(pk=tid)
        first_round = t.rounds.get(round_number=1)
        match1 = first_round.matches.order_by("position").first()
        winner = match1.participant_a

        resp3 = self.client.post(
            f"/api/tournaments/{tid}/matches/{match1.id}/set-winner/",
            {"winner_participant_id": str(winner.id)},
            format="json",
        )
        self.assertEqual(resp3.status_code, status.HTTP_200_OK)

    def test_unauthenticated_rejected(self):
        self.client.force_authenticate(user=None)
        resp = self.client.get("/api/tournaments/")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

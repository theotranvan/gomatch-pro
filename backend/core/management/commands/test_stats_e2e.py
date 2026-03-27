"""
E2E Stats Verification — Django management command.
Usage: python manage.py test_stats_e2e
"""
import sys
from datetime import date, time
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.test import RequestFactory
from rest_framework.test import force_authenticate

from accounts.models import PlayerProfile
from bookings.models import Booking
from core.enums import (
    BookingStatus,
    CourtSurface,
    MatchStatus,
    MatchType,
    ParticipantRole,
    ParticipantStatus,
    PlayMode,
    ScoreStatus,
    SportType,
    TeamSide,
    TimeSlotStatus,
)
from matches.models import Match, MatchParticipant
from scoring.models import Ranking, Score
from scoring.stats_service import StatsService
from scoring.stats_views import MyStatsView, PlayerStatsView
from venues.models import Court, TimeSlot, Venue

User = get_user_model()


class Command(BaseCommand):
    help = "E2E Stats verification"

    def handle(self, *args, **options):
        errors = []
        factory = RequestFactory()

        def check(label, actual, expected):
            ok = actual == expected
            tag = "OK" if ok else "FAIL"
            self.stdout.write(f"  [{tag}] {label}: {actual} (expected {expected})")
            if not ok:
                errors.append(f"{label}: got {actual}, expected {expected}")

        self.stdout.write("=" * 70)
        self.stdout.write("  E2E STATS VERIFICATION")
        self.stdout.write("=" * 70)

        # Cleanup
        User.objects.filter(email__endswith="@statstest.com").delete()
        Venue.objects.filter(name__startswith="StatsTest").delete()

        # Create users
        alice_u = User.objects.create_user(email="alice@statstest.com", password="pass1234")
        bob_u = User.objects.create_user(email="bob@statstest.com", password="pass1234")

        alice = alice_u.profile
        bob = bob_u.profile
        alice.first_name = "Alice"
        alice.last_name = "Dupont"
        alice.save()
        bob.first_name = "Bob"
        bob.last_name = "Martin"
        bob.save()

        # Venues & courts
        venue_a = Venue.objects.create(
            name="StatsTest Club A", address="1 Rue Test", city="Geneve",
            latitude=46.2044, longitude=6.1432,
        )
        venue_b = Venue.objects.create(
            name="StatsTest Club B", address="2 Rue Test", city="Lausanne",
            latitude=46.5197, longitude=6.6323,
        )
        court_a = Court.objects.create(
            venue=venue_a, name="Court 1", sport=SportType.TENNIS,
            surface=CourtSurface.CLAY, hourly_rate=40,
        )
        court_b = Court.objects.create(
            venue=venue_b, name="Court 1", sport=SportType.PADEL,
            surface=CourtSurface.ARTIFICIAL, hourly_rate=50,
        )

        self.stdout.write("  Users and venues created")

        # ──────────────────────────────────────────────────────────────
        # Match data for Alice:
        #   Chronological: Jan10(W) Jan20(W) Feb10(W) Feb15(L)
        #                  Mar05(W) Mar10(L) Mar20(W)
        #   Tennis: 4P, 3W, 1L, sets 7-2
        #   Padel:  3P, 2W, 1L, sets 5-2
        #   Best streak: 3, Current streak: 1
        #   Venue A: 4, Venue B: 3 => fav = A
        #   Monthly: Jan=2, Feb=2, Mar=3
        # ──────────────────────────────────────────────────────────────
        matches_data = [
            (date(2026, 1, 10), time(10, 0), SportType.TENNIS,
             [{"team_a": 6, "team_b": 4}, {"team_a": 6, "team_b": 3}],
             alice, TeamSide.TEAM_A, venue_a, court_a),

            (date(2026, 1, 20), time(14, 0), SportType.TENNIS,
             [{"team_a": 6, "team_b": 2}, {"team_a": 7, "team_b": 5}],
             alice, TeamSide.TEAM_A, venue_a, court_a),

            (date(2026, 2, 10), time(10, 0), SportType.PADEL,
             [{"team_a": 6, "team_b": 4}, {"team_a": 6, "team_b": 3}],
             alice, TeamSide.TEAM_A, venue_b, court_b),

            (date(2026, 2, 15), time(16, 0), SportType.TENNIS,
             [{"team_a": 4, "team_b": 6}, {"team_a": 6, "team_b": 3}, {"team_a": 5, "team_b": 7}],
             bob, TeamSide.TEAM_B, venue_b, court_b),

            (date(2026, 3, 5), time(9, 0), SportType.TENNIS,
             [{"team_a": 6, "team_b": 1}, {"team_a": 6, "team_b": 4}],
             alice, TeamSide.TEAM_A, venue_a, court_a),

            (date(2026, 3, 10), time(11, 0), SportType.PADEL,
             [{"team_a": 3, "team_b": 6}, {"team_a": 6, "team_b": 4}, {"team_a": 8, "team_b": 10}],
             bob, TeamSide.TEAM_B, venue_b, court_b),

            (date(2026, 3, 20), time(15, 0), SportType.PADEL,
             [{"team_a": 6, "team_b": 2}, {"team_a": 6, "team_b": 1}],
             alice, TeamSide.TEAM_A, venue_a, court_a),
        ]

        for md, mt, sport, sets_data, winner, w_team, venue, court in matches_data:
            match = Match.objects.create(
                sport=sport, match_type=MatchType.SINGLES,
                play_mode=PlayMode.COMPETITIVE, status=MatchStatus.COMPLETED,
                scheduled_date=md, scheduled_time=mt,
                created_by=alice_u, max_participants=2,
            )
            MatchParticipant.objects.create(
                match=match, player=alice, role=ParticipantRole.CREATOR,
                status=ParticipantStatus.ACCEPTED, team=TeamSide.TEAM_A,
            )
            MatchParticipant.objects.create(
                match=match, player=bob, role=ParticipantRole.JOINED,
                status=ParticipantStatus.ACCEPTED, team=TeamSide.TEAM_B,
            )
            Score.objects.create(
                match=match, submitted_by=alice_u, sets=sets_data,
                winner=winner, winning_team=w_team,
                status=ScoreStatus.CONFIRMED,
            )
            ts = TimeSlot.objects.create(
                court=court, date=md, start_time=mt,
                end_time=time(mt.hour + 1, 0), status=TimeSlotStatus.BOOKED,
            )
            Booking.objects.create(
                time_slot=ts, match=match, booked_by=alice_u,
                total_amount=Decimal("40.00"), per_player_amount=Decimal("20.00"),
                status=BookingStatus.CONFIRMED,
            )

        # Excluded: PENDING score
        m_pending = Match.objects.create(
            sport=SportType.TENNIS, match_type=MatchType.SINGLES,
            play_mode=PlayMode.COMPETITIVE, status=MatchStatus.COMPLETED,
            scheduled_date=date(2026, 3, 25), scheduled_time=time(10, 0),
            created_by=alice_u, max_participants=2,
        )
        MatchParticipant.objects.create(
            match=m_pending, player=alice, role=ParticipantRole.CREATOR,
            status=ParticipantStatus.ACCEPTED, team=TeamSide.TEAM_A,
        )
        MatchParticipant.objects.create(
            match=m_pending, player=bob, role=ParticipantRole.JOINED,
            status=ParticipantStatus.ACCEPTED, team=TeamSide.TEAM_B,
        )
        Score.objects.create(
            match=m_pending, submitted_by=alice_u,
            sets=[{"team_a": 6, "team_b": 4}, {"team_a": 6, "team_b": 3}],
            winner=alice, winning_team=TeamSide.TEAM_A,
            status=ScoreStatus.PENDING,
        )

        # Excluded: non-completed match
        m_open = Match.objects.create(
            sport=SportType.TENNIS, match_type=MatchType.SINGLES,
            play_mode=PlayMode.COMPETITIVE, status=MatchStatus.OPEN,
            scheduled_date=date(2026, 4, 1), scheduled_time=time(10, 0),
            created_by=alice_u, max_participants=2,
        )
        MatchParticipant.objects.create(
            match=m_open, player=alice, role=ParticipantRole.CREATOR,
            status=ParticipantStatus.ACCEPTED, team=TeamSide.TEAM_A,
        )

        # Rankings
        Ranking.objects.create(
            player=alice, sport=SportType.TENNIS,
            points=1075, wins=3, losses=1,
        )
        Ranking.objects.create(
            player=alice, sport=SportType.PADEL,
            points=1035, wins=2, losses=1,
        )

        self.stdout.write("  7 matches + 2 excluded created\n")

        # ──────────────────────────────────────────────────────────────
        #  VERIFY StatsService
        # ──────────────────────────────────────────────────────────────
        self.stdout.write("-" * 70)
        self.stdout.write("  VERIFY StatsService.get_player_stats(alice)")
        self.stdout.write("-" * 70)

        stats = StatsService.get_player_stats(alice)

        check("matches_played", stats["matches_played"], 7)
        check("matches_won", stats["matches_won"], 5)
        check("matches_lost", stats["matches_lost"], 2)
        check("win_rate", stats["win_rate"], 71.4)

        # Tennis
        t = stats["sports"].get(SportType.TENNIS, {})
        check("tennis.played", t.get("matches_played"), 4)
        check("tennis.won", t.get("matches_won"), 3)
        check("tennis.lost", t.get("matches_lost"), 1)
        check("tennis.win_rate", t.get("win_rate"), 75.0)
        check("tennis.sets_won", t.get("sets_won"), 7)
        check("tennis.sets_lost", t.get("sets_lost"), 2)

        # Padel
        p = stats["sports"].get(SportType.PADEL, {})
        check("padel.played", p.get("matches_played"), 3)
        check("padel.won", p.get("matches_won"), 2)
        check("padel.lost", p.get("matches_lost"), 1)
        check("padel.win_rate", p.get("win_rate"), 66.7)
        check("padel.sets_won", p.get("sets_won"), 5)
        check("padel.sets_lost", p.get("sets_lost"), 2)

        # Streaks
        check("best_streak", stats["best_streak"], 3)
        check("current_streak", stats["current_streak"], 1)

        # Favorite venue
        fv = stats["favorite_venue"]
        check("fav_venue.name", fv["name"] if fv else None, "StatsTest Club A")
        check("fav_venue.count", fv["matches_count"] if fv else None, 4)

        # Matches per month
        mpm = stats["matches_per_month"]
        check("mpm_length", len(mpm), 3)
        if len(mpm) == 3:
            check("mpm[0].month", mpm[0]["month"], "2026-01")
            check("mpm[0].count", mpm[0]["count"], 2)
            check("mpm[1].month", mpm[1]["month"], "2026-02")
            check("mpm[1].count", mpm[1]["count"], 2)
            check("mpm[2].month", mpm[2]["month"], "2026-03")
            check("mpm[2].count", mpm[2]["count"], 3)

        # Points evolution
        pe = stats["points_evolution"]
        check("pts_tennis", pe.get(SportType.TENNIS, [{}])[0].get("points"), 1075)
        check("pts_padel", pe.get(SportType.PADEL, [{}])[0].get("points"), 1035)

        # ──────────────────────────────────────────────────────────────
        #  VERIFY API endpoints
        # ──────────────────────────────────────────────────────────────
        self.stdout.write("\n" + "-" * 70)
        self.stdout.write("  VERIFY API endpoints")
        self.stdout.write("-" * 70)

        # /api/stats/me/
        request = factory.get("/api/stats/me/")
        force_authenticate(request, user=alice_u)
        response = MyStatsView.as_view()(request)
        check("API /me/ status", response.status_code, 200)
        check("API /me/ played", response.data["matches_played"], 7)
        check("API /me/ won", response.data["matches_won"], 5)
        check("API /me/ win_rate", response.data["win_rate"], 71.4)
        check("API /me/ best_streak", response.data["best_streak"], 3)
        check("API /me/ sports.tennis.sets_won", response.data["sports"][SportType.TENNIS]["sets_won"], 7)

        # /api/stats/<id>/
        request2 = factory.get(f"/api/stats/{alice.id}/")
        force_authenticate(request2, user=bob_u)
        response2 = PlayerStatsView.as_view()(request2, player_id=alice.id)
        check("API /<id>/ status", response2.status_code, 200)
        check("API /<id>/ played", response2.data["matches_played"], 7)

        # ──────────────────────────────────────────────────────────────
        #  VERIFY Bob (mirror)
        # ──────────────────────────────────────────────────────────────
        self.stdout.write("\n" + "-" * 70)
        self.stdout.write("  VERIFY Bob's stats (mirror)")
        self.stdout.write("-" * 70)

        bob_stats = StatsService.get_player_stats(bob)
        check("bob.played", bob_stats["matches_played"], 7)
        check("bob.won", bob_stats["matches_won"], 2)
        check("bob.lost", bob_stats["matches_lost"], 5)
        check("bob.best_streak", bob_stats["best_streak"], 1)
        check("bob.current_streak", bob_stats["current_streak"], 0)

        # ──────────────────────────────────────────────────────────────
        #  SUMMARY
        # ──────────────────────────────────────────────────────────────
        self.stdout.write("\n" + "=" * 70)
        if errors:
            self.stdout.write(f"  FAILED: {len(errors)} errors")
            for e in errors:
                self.stdout.write(f"    - {e}")
        else:
            self.stdout.write("  ALL CHECKS PASSED")
        self.stdout.write("=" * 70)

        # Cleanup
        User.objects.filter(email__endswith="@statstest.com").delete()
        Venue.objects.filter(name__startswith="StatsTest").delete()
        self.stdout.write("  Cleaned up.\n")

        if errors:
            sys.exit(1)

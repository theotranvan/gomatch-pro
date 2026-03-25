from collections import defaultdict
from datetime import date

from django.db.models import Count
from django.db.models.functions import TruncMonth

from accounts.models import PlayerProfile
from bookings.models import Booking
from core.enums import MatchStatus, ParticipantStatus, ScoreStatus, SportType
from matches.models import MatchParticipant
from scoring.models import Ranking, Score


class StatsService:
    """Compute player statistics dynamically from existing data."""

    @staticmethod
    def get_player_stats(profile: PlayerProfile) -> dict:
        participations = MatchParticipant.objects.filter(
            player=profile,
            status=ParticipantStatus.ACCEPTED,
            match__status=MatchStatus.COMPLETED,
        ).select_related("match")

        match_ids = list(participations.values_list("match_id", flat=True))

        scores = Score.objects.filter(
            match_id__in=match_ids,
            status=ScoreStatus.CONFIRMED,
        ).select_related("match")

        scored_match_ids = set(scores.values_list("match_id", flat=True))
        scored_participations = participations.filter(match_id__in=scored_match_ids)

        # ── Per-sport breakdown ──
        sports_data = {}
        for sport_val, _label in SportType.choices:
            sport_scores = list(scores.filter(match__sport=sport_val))
            sport_parts = scored_participations.filter(match__sport=sport_val)
            played = sport_parts.values("match_id").distinct().count()

            if played == 0:
                continue

            won = sum(1 for sc in sport_scores if sc.winner_id == profile.id)
            lost = played - won

            sets_won, sets_lost = StatsService._count_sets(
                sport_scores, sport_parts, profile,
            )

            sports_data[sport_val] = {
                "sport": sport_val,
                "matches_played": played,
                "matches_won": won,
                "matches_lost": lost,
                "win_rate": round(won / played * 100, 1) if played else 0,
                "sets_won": sets_won,
                "sets_lost": sets_lost,
            }

        total_played = sum(d["matches_played"] for d in sports_data.values())
        total_won = sum(d["matches_won"] for d in sports_data.values())

        current_streak, best_streak = StatsService._compute_streaks(
            profile, scores,
        )

        return {
            "matches_played": total_played,
            "matches_won": total_won,
            "matches_lost": total_played - total_won,
            "win_rate": round(total_won / total_played * 100, 1) if total_played else 0,
            "sports": sports_data,
            "current_streak": current_streak,
            "best_streak": best_streak,
            "favorite_venue": StatsService._favorite_venue(match_ids),
            "matches_per_month": StatsService._matches_per_month(scored_participations),
            "points_evolution": StatsService._points_evolution(profile),
        }

    # ── Helpers ──

    @staticmethod
    def _count_sets(sport_scores, sport_parts, profile):
        sets_won = 0
        sets_lost = 0
        part_map = {
            p.match_id: p.team for p in sport_parts if p.team
        }
        for sc in sport_scores:
            team = part_map.get(sc.match_id)
            if not team:
                continue
            for s in sc.sets or []:
                a, b = s.get("team_a", 0), s.get("team_b", 0)
                if team == "team_a":
                    if a > b:
                        sets_won += 1
                    elif b > a:
                        sets_lost += 1
                else:
                    if b > a:
                        sets_won += 1
                    elif a > b:
                        sets_lost += 1
        return sets_won, sets_lost

    @staticmethod
    def _compute_streaks(profile, scores):
        ordered = scores.order_by("match__scheduled_date", "match__scheduled_time")
        current = 0
        best = 0
        running = 0
        for sc in ordered:
            if sc.winner_id == profile.id:
                running += 1
                if running > best:
                    best = running
            else:
                running = 0
        current = running
        return current, best

    @staticmethod
    def _favorite_venue(match_ids):
        if not match_ids:
            return None
        bookings = (
            Booking.objects.filter(match_id__in=match_ids)
            .select_related("time_slot__court__venue")
        )
        counter: dict[str, dict] = {}
        for b in bookings:
            try:
                venue = b.time_slot.court.venue
                vid = str(venue.id)
                if vid not in counter:
                    counter[vid] = {"name": venue.name, "count": 0}
                counter[vid]["count"] += 1
            except (AttributeError, Exception):
                continue
        if not counter:
            return None
        best = max(counter.values(), key=lambda v: v["count"])
        return {"name": best["name"], "matches_count": best["count"]}

    @staticmethod
    def _matches_per_month(scored_participations):
        monthly = (
            scored_participations
            .values("match_id")
            .distinct()
            .values(month=TruncMonth("match__scheduled_date"))
            .annotate(count=Count("match_id", distinct=True))
            .order_by("month")
        )
        return [
            {"month": m["month"].strftime("%Y-%m"), "count": m["count"]}
            for m in monthly
        ]

    @staticmethod
    def _points_evolution(profile):
        rankings = Ranking.objects.filter(player=profile).order_by("sport")
        result = {}
        for r in rankings:
            dt = r.last_match_at or r.updated_at
            result[r.sport] = [
                {
                    "date": dt.strftime("%Y-%m-%d") if dt else str(date.today()),
                    "points": r.points,
                }
            ]
        return result

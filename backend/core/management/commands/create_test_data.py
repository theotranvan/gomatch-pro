import random
from datetime import date, time, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import User, PlayerProfile
from chat.models import ChatMessage, ChatRoom
from core.enums import (
    ChatRoomType,
    CourtSurface,
    MatchStatus,
    MatchType,
    MessageType,
    ParticipantRole,
    ParticipantStatus,
    PlayMode,
    ScoreStatus,
    SkillLevel,
    SportType,
    TeamSide,
)
from matches.models import Match, MatchParticipant, OpenMatch
from scoring.models import Ranking, Score
from venues.models import Court, Venue


PLAYERS_DATA = [
    {
        "email": "lucas.muller@gomatch.ch",
        "first_name": "Lucas",
        "last_name": "Müller",
        "level_tennis": SkillLevel.ADVANCED,
        "level_padel": SkillLevel.INTERMEDIATE,
        "city": "Lausanne",
        "bio": "Joueur passionné depuis 15 ans. Toujours partant pour un set!",
    },
    {
        "email": "sophie.rochat@gomatch.ch",
        "first_name": "Sophie",
        "last_name": "Rochat",
        "level_tennis": SkillLevel.INTERMEDIATE,
        "level_padel": SkillLevel.ADVANCED,
        "city": "Genève",
        "bio": "Amoureuse du padel, joueuse de tennis le week-end.",
    },
    {
        "email": "maxime.favre@gomatch.ch",
        "first_name": "Maxime",
        "last_name": "Favre",
        "level_tennis": SkillLevel.BEGINNER,
        "level_padel": SkillLevel.BEGINNER,
        "city": "Montreux",
        "bio": "Débutant motivé qui cherche des partenaires pour progresser.",
    },
    {
        "email": "emma.bonvin@gomatch.ch",
        "first_name": "Emma",
        "last_name": "Bonvin",
        "level_tennis": SkillLevel.ADVANCED,
        "level_padel": SkillLevel.ADVANCED,
        "city": "Lausanne",
        "bio": "Ex-compétitrice, maintenant je joue pour le plaisir.",
    },
    {
        "email": "noah.girard@gomatch.ch",
        "first_name": "Noah",
        "last_name": "Girard",
        "level_tennis": SkillLevel.INTERMEDIATE,
        "level_padel": SkillLevel.INTERMEDIATE,
        "city": "Nyon",
        "bio": "Tennis et padel en after-work, c'est mon truc.",
    },
    {
        "email": "lea.renaud@gomatch.ch",
        "first_name": "Léa",
        "last_name": "Renaud",
        "level_tennis": SkillLevel.ADVANCED,
        "level_padel": SkillLevel.BEGINNER,
        "city": "Genève",
        "bio": "Joueuse de tennis R4, curieuse de découvrir le padel.",
    },
    {
        "email": "arthur.blanc@gomatch.ch",
        "first_name": "Arthur",
        "last_name": "Blanc",
        "level_tennis": SkillLevel.INTERMEDIATE,
        "level_padel": SkillLevel.ADVANCED,
        "city": "Lausanne",
        "bio": "Fan de padel, je joue 3 fois par semaine minimum.",
    },
    {
        "email": "chloe.dumont@gomatch.ch",
        "first_name": "Chloé",
        "last_name": "Dumont",
        "level_tennis": SkillLevel.BEGINNER,
        "level_padel": SkillLevel.INTERMEDIATE,
        "city": "Montreux",
        "bio": "Nouvelle dans la région, je cherche des gens pour jouer!",
    },
    {
        "email": "thomas.perret@gomatch.ch",
        "first_name": "Thomas",
        "last_name": "Perret",
        "level_tennis": SkillLevel.ADVANCED,
        "level_padel": SkillLevel.INTERMEDIATE,
        "city": "Genève",
        "bio": "Coach de tennis amateur, toujours prêt à donner des tips.",
    },
    {
        "email": "julie.moret@gomatch.ch",
        "first_name": "Julie",
        "last_name": "Moret",
        "level_tennis": SkillLevel.INTERMEDIATE,
        "level_padel": SkillLevel.INTERMEDIATE,
        "city": "Nyon",
        "bio": "Joueuse régulière, disponible le soir et le week-end.",
    },
]

VENUES_DATA = [
    {
        "name": "Tennis Club Lausanne",
        "address": "Chemin des Grandes-Roches 2",
        "city": "Lausanne",
        "latitude": 46.5197,
        "longitude": 6.6323,
        "phone": "+41 21 601 12 34",
        "courts": [
            {
                "name": "Court Central",
                "sport": SportType.TENNIS,
                "surface": CourtSurface.CLAY,
                "is_indoor": False,
                "hourly_rate": 35.00,
            },
            {
                "name": "Court 2",
                "sport": SportType.TENNIS,
                "surface": CourtSurface.HARD,
                "is_indoor": True,
                "hourly_rate": 45.00,
            },
            {
                "name": "Padel Court A",
                "sport": SportType.PADEL,
                "surface": CourtSurface.ARTIFICIAL,
                "is_indoor": False,
                "hourly_rate": 50.00,
            },
        ],
    },
    {
        "name": "Genève Padel Arena",
        "address": "Route de Meyrin 45",
        "city": "Genève",
        "latitude": 46.2044,
        "longitude": 6.1432,
        "phone": "+41 22 788 55 66",
        "courts": [
            {
                "name": "Padel Court 1",
                "sport": SportType.PADEL,
                "surface": CourtSurface.ARTIFICIAL,
                "is_indoor": True,
                "hourly_rate": 55.00,
            },
            {
                "name": "Padel Court 2",
                "sport": SportType.PADEL,
                "surface": CourtSurface.ARTIFICIAL,
                "is_indoor": True,
                "hourly_rate": 55.00,
            },
        ],
    },
    {
        "name": "Montreux Sports Center",
        "address": "Avenue des Alpes 18",
        "city": "Montreux",
        "latitude": 46.4312,
        "longitude": 6.9107,
        "phone": "+41 21 963 44 55",
        "courts": [
            {
                "name": "Tennis Court Indoor",
                "sport": SportType.TENNIS,
                "surface": CourtSurface.HARD,
                "is_indoor": True,
                "hourly_rate": 40.00,
            },
            {
                "name": "Tennis Terre Battue",
                "sport": SportType.TENNIS,
                "surface": CourtSurface.CLAY,
                "is_indoor": False,
                "hourly_rate": 30.00,
            },
            {
                "name": "Padel Montreux",
                "sport": SportType.PADEL,
                "surface": CourtSurface.ARTIFICIAL,
                "is_indoor": False,
                "hourly_rate": 48.00,
            },
        ],
    },
]

CHAT_MESSAGES = [
    "Salut ! On se retrouve à quelle heure ?",
    "Je serai là 10 min avant pour m'échauffer.",
    "Parfait, à tout à l'heure !",
    "Quelqu'un a des balles neuves ?",
    "J'en ai un tube, pas de souci.",
    "Super match la dernière fois, on remet ça ?",
    "Je préfère le côté gauche si ça vous va.",
    "OK, moi je prends la droite.",
]


class Command(BaseCommand):
    help = "Creates realistic test data for GoMatch (players, venues, matches, scores, chat messages)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--flush",
            action="store_true",
            help="Delete all existing test data before creating new data.",
        )

    def handle(self, *args, **options):
        if options["flush"]:
            self._flush()

        players = self._create_players()
        venues = self._create_venues()
        matches = self._create_matches(players)
        self._create_open_matches(players)
        self._create_scores(matches, players)
        self._create_chat_messages(players)

        self.stdout.write(self.style.SUCCESS("Test data created successfully!"))

    def _flush(self):
        """Remove previously generated test data."""
        test_emails = [p["email"] for p in PLAYERS_DATA]
        User.objects.filter(email__in=test_emails).delete()

        venue_names = [v["name"] for v in VENUES_DATA]
        Venue.objects.filter(name__in=venue_names).delete()

        self.stdout.write(self.style.WARNING("Existing test data flushed."))

    def _create_players(self):
        """Create 10 test players with complete profiles."""
        profiles = []
        for data in PLAYERS_DATA:
            user, created = User.objects.get_or_create(
                email=data["email"],
                defaults={
                    "is_active": True,
                    "is_verified": True,
                },
            )
            if created:
                user.set_password("GoMatch2025!")
                user.save()

            profile = user.profile
            profile.first_name = data["first_name"]
            profile.last_name = data["last_name"]
            profile.level_tennis = data["level_tennis"]
            profile.level_padel = data["level_padel"]
            profile.city = data["city"]
            profile.bio = data["bio"]
            profile.date_of_birth = date(
                random.randint(1985, 2002),
                random.randint(1, 12),
                random.randint(1, 28),
            )
            profile.preferred_play_mode = random.choice(
                [PlayMode.FRIENDLY, PlayMode.COMPETITIVE, PlayMode.BOTH]
            )
            profile.save()
            profiles.append(profile)

            action = "Created" if created else "Updated"
            self.stdout.write(f"  {action} player: {data['first_name']} {data['last_name']}")

        return profiles

    def _create_venues(self):
        """Create 3 venues with courts."""
        venues = []
        for data in VENUES_DATA:
            venue, created = Venue.objects.get_or_create(
                name=data["name"],
                defaults={
                    "address": data["address"],
                    "city": data["city"],
                    "latitude": data["latitude"],
                    "longitude": data["longitude"],
                    "phone": data["phone"],
                    "is_active": True,
                },
            )
            if created:
                for court_data in data["courts"]:
                    Court.objects.create(venue=venue, **court_data)

            action = "Created" if created else "Already exists"
            self.stdout.write(f"  {action}: {data['name']} ({len(data['courts'])} courts)")
            venues.append(venue)

        return venues

    def _create_matches(self, players):
        """Create 5 matches with participants."""
        today = date.today()
        matches_config = [
            {
                "sport": SportType.TENNIS,
                "match_type": MatchType.SINGLES,
                "play_mode": PlayMode.COMPETITIVE,
                "status": MatchStatus.COMPLETED,
                "days_offset": -7,
                "time": time(18, 0),
                "creator_idx": 0,
                "opponent_idx": 3,
            },
            {
                "sport": SportType.PADEL,
                "match_type": MatchType.DOUBLES,
                "play_mode": PlayMode.FRIENDLY,
                "status": MatchStatus.COMPLETED,
                "days_offset": -3,
                "time": time(19, 30),
                "creator_idx": 1,
                "opponents_idx": [6, 4, 9],
            },
            {
                "sport": SportType.TENNIS,
                "match_type": MatchType.SINGLES,
                "play_mode": PlayMode.COMPETITIVE,
                "status": MatchStatus.CONFIRMED,
                "days_offset": 2,
                "time": time(17, 0),
                "creator_idx": 5,
                "opponent_idx": 8,
            },
            {
                "sport": SportType.PADEL,
                "match_type": MatchType.DOUBLES,
                "play_mode": PlayMode.COMPETITIVE,
                "status": MatchStatus.CONFIRMED,
                "days_offset": 5,
                "time": time(20, 0),
                "creator_idx": 6,
                "opponents_idx": [0, 1, 3],
            },
            {
                "sport": SportType.TENNIS,
                "match_type": MatchType.SINGLES,
                "play_mode": PlayMode.FRIENDLY,
                "status": MatchStatus.DRAFT,
                "days_offset": 10,
                "time": time(10, 0),
                "creator_idx": 2,
                "opponent_idx": 7,
            },
        ]

        created_matches = []
        for i, cfg in enumerate(matches_config, 1):
            creator = players[cfg["creator_idx"]]
            match = Match.objects.create(
                sport=cfg["sport"],
                match_type=cfg["match_type"],
                play_mode=cfg["play_mode"],
                status=cfg["status"],
                scheduled_date=today + timedelta(days=cfg["days_offset"]),
                scheduled_time=cfg["time"],
                created_by=creator.user,
                max_participants=2 if cfg["match_type"] == MatchType.SINGLES else 4,
            )

            # Add creator as participant
            MatchParticipant.objects.create(
                match=match,
                player=creator,
                role=ParticipantRole.CREATOR,
                status=ParticipantStatus.ACCEPTED,
                team=TeamSide.TEAM_A if cfg["match_type"] == MatchType.DOUBLES else None,
            )

            # Add opponents
            if "opponent_idx" in cfg:
                opp = players[cfg["opponent_idx"]]
                MatchParticipant.objects.create(
                    match=match,
                    player=opp,
                    role=ParticipantRole.JOINED,
                    status=ParticipantStatus.ACCEPTED,
                    team=TeamSide.TEAM_B if cfg["match_type"] == MatchType.DOUBLES else None,
                )
            elif "opponents_idx" in cfg:
                for j, opp_idx in enumerate(cfg["opponents_idx"]):
                    opp = players[opp_idx]
                    if j == 0:
                        team = TeamSide.TEAM_A
                    else:
                        team = TeamSide.TEAM_B if j <= 1 else TeamSide.TEAM_B
                    MatchParticipant.objects.create(
                        match=match,
                        player=opp,
                        role=ParticipantRole.JOINED,
                        status=ParticipantStatus.ACCEPTED,
                        team=team,
                    )

            created_matches.append(match)
            self.stdout.write(
                f"  Match {i}: {cfg['sport']} {cfg['match_type']} ({cfg['status']})"
            )

        return created_matches

    def _create_open_matches(self, players):
        """Create 2 open matches looking for players."""
        today = date.today()

        # Open tennis singles
        match1 = Match.objects.create(
            sport=SportType.TENNIS,
            match_type=MatchType.SINGLES,
            play_mode=PlayMode.COMPETITIVE,
            status=MatchStatus.OPEN,
            scheduled_date=today + timedelta(days=4),
            scheduled_time=time(18, 30),
            created_by=players[8].user,
            max_participants=2,
        )
        MatchParticipant.objects.create(
            match=match1,
            player=players[8],
            role=ParticipantRole.CREATOR,
            status=ParticipantStatus.ACCEPTED,
        )
        OpenMatch.objects.create(
            match=match1,
            required_level_min=SkillLevel.INTERMEDIATE,
            required_level_max=SkillLevel.ADVANCED,
            description="Cherche un adversaire de bon niveau pour un match compétitif en soirée à Genève.",
            expires_at=timezone.now() + timedelta(days=3),
        )
        self.stdout.write("  Open match 1: Tennis singles (Thomas)")

        # Open padel doubles
        match2 = Match.objects.create(
            sport=SportType.PADEL,
            match_type=MatchType.DOUBLES,
            play_mode=PlayMode.FRIENDLY,
            status=MatchStatus.OPEN,
            scheduled_date=today + timedelta(days=6),
            scheduled_time=time(20, 0),
            created_by=players[1].user,
            max_participants=4,
        )
        MatchParticipant.objects.create(
            match=match2,
            player=players[1],
            role=ParticipantRole.CREATOR,
            status=ParticipantStatus.ACCEPTED,
            team=TeamSide.TEAM_A,
        )
        MatchParticipant.objects.create(
            match=match2,
            player=players[6],
            role=ParticipantRole.JOINED,
            status=ParticipantStatus.ACCEPTED,
            team=TeamSide.TEAM_A,
        )
        OpenMatch.objects.create(
            match=match2,
            required_level_min=SkillLevel.BEGINNER,
            required_level_max=SkillLevel.ADVANCED,
            description="On cherche 2 joueurs pour compléter un double padel fun! Tous niveaux.",
            expires_at=timezone.now() + timedelta(days=5),
        )
        self.stdout.write("  Open match 2: Padel doubles (Sophie + Arthur, 2 spots left)")

    def _create_scores(self, matches, players):
        """Create scores for completed matches."""
        # Match 1: Tennis singles Lucas vs Emma — Lucas wins 6-4, 3-6, 7-5
        match1 = matches[0]
        Score.objects.get_or_create(
            match=match1,
            defaults={
                "submitted_by": players[0].user,
                "sets": [
                    {"team_a": 6, "team_b": 4},
                    {"team_a": 3, "team_b": 6},
                    {"team_a": 7, "team_b": 5},
                ],
                "winner": players[0],
                "status": ScoreStatus.CONFIRMED,
                "confirmed_by": players[3].user,
                "confirmed_at": timezone.now() - timedelta(days=6),
            },
        )

        # Match 2: Padel doubles Sophie+Arthur vs Noah+Julie — Team B wins
        match2 = matches[1]
        Score.objects.get_or_create(
            match=match2,
            defaults={
                "submitted_by": players[1].user,
                "sets": [
                    {"team_a": 4, "team_b": 6},
                    {"team_a": 6, "team_b": 3},
                    {"team_a": 2, "team_b": 6},
                ],
                "winner": players[4],
                "status": ScoreStatus.CONFIRMED,
                "confirmed_by": players[4].user,
                "confirmed_at": timezone.now() - timedelta(days=2),
            },
        )

        self.stdout.write("  Created scores for 2 completed matches.")

        # Create rankings for players who played
        playing_players = [players[i] for i in [0, 1, 3, 4, 6, 9]]
        for player in playing_players:
            for sport in [SportType.TENNIS, SportType.PADEL]:
                Ranking.objects.get_or_create(
                    player=player,
                    sport=sport,
                    defaults={
                        "points": random.randint(950, 1100),
                        "wins": random.randint(0, 5),
                        "losses": random.randint(0, 3),
                    },
                )

        self.stdout.write("  Created rankings for active players.")

    def _create_chat_messages(self, players):
        """Add chat messages to existing chat rooms."""
        rooms = ChatRoom.objects.filter(room_type=ChatRoomType.MATCH)
        for room in rooms:
            participants = list(room.participants.all())
            if len(participants) < 2:
                continue

            # Add a few messages
            num_messages = random.randint(2, 4)
            messages_to_use = random.sample(
                CHAT_MESSAGES, min(num_messages, len(CHAT_MESSAGES))
            )
            for msg_text in messages_to_use:
                sender = random.choice(participants)
                ChatMessage.objects.create(
                    room=room,
                    sender=sender,
                    content=msg_text,
                    message_type=MessageType.TEXT,
                )

        self.stdout.write(f"  Added chat messages to {rooms.count()} room(s).")

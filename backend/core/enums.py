from django.db import models


class SportType(models.TextChoices):
    """Types of sports supported by the platform."""
    TENNIS = "tennis", "Tennis"
    PADEL = "padel", "Padel"


class SkillLevel(models.TextChoices):
    """Skill levels for players."""
    BEGINNER = "beginner", "Beginner"
    INTERMEDIATE = "intermediate", "Intermediate"
    ADVANCED = "advanced", "Advanced"


class PlayMode(models.TextChoices):
    """Play mode preferences."""
    FRIENDLY = "friendly", "Friendly"
    COMPETITIVE = "competitive", "Competitive"
    BOTH = "both", "Both"


class MatchType(models.TextChoices):
    """Types of match formats."""
    SINGLES = "singles", "Singles"
    DOUBLES = "doubles", "Doubles"


class MatchStatus(models.TextChoices):
    """Lifecycle statuses for a match."""
    DRAFT = "draft", "Draft"
    OPEN = "open", "Open"
    CONFIRMED = "confirmed", "Confirmed"
    IN_PROGRESS = "in_progress", "In Progress"
    COMPLETED = "completed", "Completed"
    CANCELLED = "cancelled", "Cancelled"


class ParticipantRole(models.TextChoices):
    """Roles a participant can have in a match."""
    CREATOR = "creator", "Creator"
    INVITED = "invited", "Invited"
    JOINED = "joined", "Joined"


class ParticipantStatus(models.TextChoices):
    """Acceptance statuses for match participants."""
    PENDING = "pending", "Pending"
    ACCEPTED = "accepted", "Accepted"
    DECLINED = "declined", "Declined"
    LEFT = "left", "Left"


class TeamSide(models.TextChoices):
    """Team assignment in a doubles match."""
    TEAM_A = "team_a", "Team A"
    TEAM_B = "team_b", "Team B"


class ScoreStatus(models.TextChoices):
    """Validation statuses for submitted scores."""
    PENDING = "pending", "Pending"
    CONFIRMED = "confirmed", "Confirmed"
    DISPUTED = "disputed", "Disputed"


class TimeSlotStatus(models.TextChoices):
    """Availability statuses for court time slots."""
    AVAILABLE = "available", "Available"
    HELD = "held", "Held"
    BOOKED = "booked", "Booked"


class BookingStatus(models.TextChoices):
    """Statuses for court bookings."""
    PENDING = "pending", "Pending"
    CONFIRMED = "confirmed", "Confirmed"
    CANCELLED = "cancelled", "Cancelled"


class ChatRoomType(models.TextChoices):
    """Types of chat rooms."""
    MATCH = "match", "Match"
    OPEN_MATCH = "open_match", "Open Match"
    TOURNAMENT = "tournament", "Tournament"
    DIRECT = "direct", "Direct"


class MessageType(models.TextChoices):
    """Types of chat messages."""
    TEXT = "text", "Text"
    SYSTEM = "system", "System"
    IMAGE = "image", "Image"


class CourtSurface(models.TextChoices):
    """Types of court surfaces."""
    CLAY = "clay", "Clay"
    HARD = "hard", "Hard"
    GRASS = "grass", "Grass"
    ARTIFICIAL = "artificial", "Artificial"


class PaymentStatus(models.TextChoices):
    """Statuses for payments."""
    PENDING = "pending", "Pending"
    COMPLETED = "completed", "Completed"
    FAILED = "failed", "Failed"
    REFUNDED = "refunded", "Refunded"


class PaymentMethod(models.TextChoices):
    """Payment method types."""
    STRIPE = "stripe", "Stripe"


class TournamentFormat(models.TextChoices):
    """Tournament format types."""
    SINGLE_ELIMINATION = "single_elimination", "Single Elimination"
    ROUND_ROBIN = "round_robin", "Round Robin"


class TournamentStatus(models.TextChoices):
    """Tournament lifecycle statuses."""
    REGISTRATION = "registration", "Registration"
    IN_PROGRESS = "in_progress", "In Progress"
    COMPLETED = "completed", "Completed"
    CANCELLED = "cancelled", "Cancelled"


class TournamentParticipantStatus(models.TextChoices):
    """Statuses for tournament participants."""
    REGISTERED = "registered", "Registered"
    CHECKED_IN = "checked_in", "Checked In"
    ELIMINATED = "eliminated", "Eliminated"
    WINNER = "winner", "Winner"


class TournamentRoundStatus(models.TextChoices):
    """Statuses for tournament rounds."""
    PENDING = "pending", "Pending"
    IN_PROGRESS = "in_progress", "In Progress"
    COMPLETED = "completed", "Completed"


class TournamentMatchStatus(models.TextChoices):
    """Statuses for tournament matches."""
    SCHEDULED = "scheduled", "Scheduled"
    IN_PROGRESS = "in_progress", "In Progress"
    COMPLETED = "completed", "Completed"

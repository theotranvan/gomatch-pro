// ── Enums ────────────────────────────────────────────────────────────────────

export type Sport = "tennis" | "padel";
export type SkillLevel = "beginner" | "intermediate" | "advanced";
export type PlayMode = "friendly" | "competitive" | "both";
export type MatchType = "singles" | "doubles";

export type MatchStatus =
  | "draft"
  | "open"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled";

export type ParticipantRole = "creator" | "invited" | "joined";
export type ParticipantStatus = "pending" | "accepted" | "declined" | "left";
export type TeamSide = "team_a" | "team_b";
export type ScoreStatus = "pending" | "confirmed" | "disputed" | "expired" | "rejected";
export type ChatRoomType = "match" | "open_match" | "tournament" | "direct";
export type MessageType = "text" | "system" | "image";
export type CourtSurface = "clay" | "hard" | "grass" | "artificial";
export type UserRole = "PLAYER" | "ADMIN" | "VENUE_MANAGER";
export type TimeSlotStatus = "available" | "held" | "booked";
export type BookingStatus = "pending" | "confirmed" | "cancelled";
export type TournamentFormat = "single_elimination" | "round_robin";
export type TournamentStatus = "registration" | "in_progress" | "completed" | "cancelled";
export type TournamentParticipantStatus = "registered" | "checked_in" | "eliminated" | "winner";
export type TournamentMatchStatus = "scheduled" | "in_progress" | "completed";
export type ConnectionStatus = "pending" | "accepted" | "declined" | "blocked";
export type ConnectionDirection = "sent" | "received";

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface Tokens {
  access: string;
  refresh: string;
}

export interface AuthResponse {
  user: User;
  tokens: Tokens;
}

// ── User & Profile ───────────────────────────────────────────────────────────

export interface PlayerProfile {
  id: string;
  email: string;
  username: string | null;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  avatar_url: string | null;
  bio: string;
  level_tennis: SkillLevel | null;
  level_padel: SkillLevel | null;
  preferred_play_mode: PlayMode | null;
  city: string;
  latitude: number | null;
  longitude: number | null;
  availability: Record<string, string[]>;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  phone_number: string | null;
  role: UserRole;
  is_active: boolean;
  is_verified: boolean;
  date_joined: string;
  last_login: string | null;
  profile: PlayerProfile;
}

// ── Matches ──────────────────────────────────────────────────────────────────

export interface MatchParticipant {
  id: string;
  player: string;
  player_name: string;
  role: ParticipantRole;
  status: ParticipantStatus;
  team: TeamSide | null;
  joined_at: string;
}

export interface Match {
  id: string;
  sport: Sport;
  match_type: MatchType;
  play_mode: PlayMode;
  status: MatchStatus;
  scheduled_date: string;
  scheduled_time: string;
  created_by: string;
  created_by_name: string;
  max_participants: number;
  current_participants_count: number;
  participants: MatchParticipant[];
  score: Score | null;
  created_at: string;
  updated_at: string;
}

export interface MatchListItem {
  id: string;
  sport: Sport;
  match_type: MatchType;
  play_mode: PlayMode;
  status: MatchStatus;
  scheduled_date: string;
  scheduled_time: string;
  created_by_name: string;
  current_participants_count: number;
  max_participants: number;
}

// ── Open Matches ─────────────────────────────────────────────────────────────

export interface OpenMatch {
  id: string;
  match_id: string;
  sport: Sport;
  match_type: MatchType;
  play_mode: PlayMode;
  status: MatchStatus;
  scheduled_date: string;
  scheduled_time: string;
  max_participants: number;
  spots_left: number;
  current_participants_count: number;
  required_level_min: SkillLevel | null;
  required_level_max: SkillLevel | null;
  description: string;
  expires_at: string;
  created_by_name: string;
  participants: MatchParticipant[];
}

export interface OpenMatchListItem {
  id: string;
  sport: Sport;
  match_type: MatchType;
  play_mode: PlayMode;
  status: MatchStatus;
  scheduled_date: string;
  scheduled_time: string;
  max_participants: number;
  spots_left: number;
  required_level_min: SkillLevel | null;
  required_level_max: SkillLevel | null;
  description: string;
  expires_at: string;
  created_by_name: string;
}

// ── Venues ───────────────────────────────────────────────────────────────────

export interface Court {
  id: string;
  name: string;
  sport: Sport;
  surface: CourtSurface;
  is_indoor: boolean;
  hourly_rate: string;
  is_active: boolean;
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  phone: string;
  website_url: string | null;
  image_url: string | null;
  booking_url: string | null;
  is_active: boolean;
  managed_by: string | null;
  courts: Court[];
  created_at: string;
  updated_at: string;
}

export interface VenueListItem {
  id: string;
  name: string;
  city: string;
  image_url: string | null;
  latitude: number;
  longitude: number;
  court_count: number;
}

// ── Time Slots ───────────────────────────────────────────────────────────────

export interface TimeSlot {
  id: string;
  court: string;
  date: string;
  start_time: string;
  end_time: string;
  status: TimeSlotStatus;
}

// ── Bookings ─────────────────────────────────────────────────────────────────

export interface Booking {
  id: string;
  time_slot: string;
  match: string | null;
  booked_by: string;
  total_amount: string;
  per_player_amount: string;
  status: BookingStatus;
  created_at: string;
  cancelled_at: string | null;
}

// ── Scoring ──────────────────────────────────────────────────────────────────

export interface SetScore {
  team_a: number;
  team_b: number;
}

export interface Score {
  id: string;
  match: string;
  submitted_by: string;
  sets: SetScore[];
  winner: string | null;
  status: ScoreStatus;
  confirmed_by: string | null;
  confirmed_at: string | null;
  admin_note: string | null;
  resolved_by: string | null;
  created_at: string;
}

export interface Ranking {
  id: string;
  player: string;
  player_name: string;
  sport: Sport;
  points: number;
  wins: number;
  losses: number;
  rank_position: number;
  last_match_at: string | null;
  updated_at: string;
}

// ── Chat ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  sender: string;
  sender_name: string;
  content: string;
  message_type: MessageType;
  created_at: string;
  is_read: boolean;
}

export interface ChatRoom {
  id: string;
  room_type: ChatRoomType;
  match_id: string | null;
  last_message: ChatMessage | null;
  unread_count: number;
  participants_names: string[];
  is_active: boolean;
  created_at: string;
}

// ── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ── Tournaments ──────────────────────────────────────────────────────────────

export interface TournamentParticipant {
  id: string;
  player: string;
  player_name: string;
  partner: string | null;
  partner_name: string | null;
  seed: number | null;
  status: TournamentParticipantStatus;
  registered_at: string;
}

export interface TournamentMatch {
  id: string;
  position: number;
  participant_a: string | null;
  participant_a_name: string | null;
  participant_b: string | null;
  participant_b_name: string | null;
  winner: string | null;
  winner_name: string | null;
  match: string | null;
  status: TournamentMatchStatus;
}

export interface TournamentRound {
  id: string;
  round_number: number;
  round_name: string;
  status: string;
  matches: TournamentMatch[];
}

export interface TournamentListItem {
  id: string;
  name: string;
  sport: Sport;
  match_type: MatchType;
  format: TournamentFormat;
  status: TournamentStatus;
  max_participants: number;
  current_participants_count: number;
  start_date: string;
  end_date: string | null;
  venue: string | null;
  venue_name: string | null;
  entry_fee: string;
  required_level_min: SkillLevel | null;
  created_by_name: string;
  created_at: string;
}

export interface Tournament extends TournamentListItem {
  description: string;
  created_by: string;
  participants: TournamentParticipant[];
  rounds: TournamentRound[];
  updated_at: string;
}

// ── Player Stats ─────────────────────────────────────────────────────────────

export interface SportStats {
  sport: Sport;
  matches_played: number;
  matches_won: number;
  matches_lost: number;
  win_rate: number;
  sets_won: number;
  sets_lost: number;
}

export interface MonthlyMatches {
  month: string;
  count: number;
}

export interface PointSnapshot {
  date: string;
  points: number;
}

export interface FavoriteVenue {
  name: string;
  matches_count: number;
}

export interface PlayerStats {
  matches_played: number;
  matches_won: number;
  matches_lost: number;
  win_rate: number;
  sports: Record<string, SportStats>;
  current_streak: number;
  best_streak: number;
  favorite_venue: FavoriteVenue | null;
  matches_per_month: MonthlyMatches[];
  points_evolution: Record<string, PointSnapshot[]>;
}

// ── Connections ──────────────────────────────────────────────────────────────

export interface ConnectionPlayer {
  id: string;
  username: string | null;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  city: string;
}

export interface Connection {
  id: string;
  requester: ConnectionPlayer;
  receiver: ConnectionPlayer;
  status: ConnectionStatus;
  created_at: string;
  updated_at: string;
}

export interface ConnectionStatusResult {
  status: ConnectionStatus | null;
  connection_id: string | null;
  direction: ConnectionDirection | null;
}

// ── Events ───────────────────────────────────────────────────────────────────

export type EventType = "cup" | "social" | "clinic" | "other";
export type EventStatus = "upcoming" | "ongoing" | "completed" | "cancelled";
export type RegistrationStatus = "registered" | "confirmed" | "cancelled" | "waitlisted";

export interface EventListItem {
  id: string;
  name: string;
  event_type: EventType;
  sport: Sport | null;
  date: string;
  end_date: string | null;
  start_time: string | null;
  location: string;
  price: string;
  image_url: string | null;
  status: EventStatus;
  is_featured: boolean;
  max_attendees: number | null;
  registrations_count: number;
  spots_left: number | null;
}

export interface EventRegistrationPlayer {
  id: string;
  username: string | null;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  city: string;
}

export interface EventRegistration {
  id: string;
  event: string;
  player: EventRegistrationPlayer;
  partner: EventRegistrationPlayer | null;
  status: RegistrationStatus;
  registered_at: string;
}

export interface EventDetail extends EventListItem {
  description: string;
  venue: string | null;
  registration_deadline: string | null;
  registrations: EventRegistration[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

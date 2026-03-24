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
export type ScoreStatus = "pending" | "confirmed" | "disputed";
export type ChatRoomType = "match" | "open_match" | "tournament" | "direct";
export type MessageType = "text" | "system" | "image";
export type CourtSurface = "clay" | "hard" | "grass" | "artificial";
export type UserRole = "PLAYER" | "ADMIN" | "VENUE_MANAGER";

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

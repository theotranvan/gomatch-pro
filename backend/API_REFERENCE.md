# GoMatch API Reference

> **Base URL** : `http://127.0.0.1:8000/api/`
>
> **Auth** : JWT Bearer Token (`Authorization: Bearer <access_token>`)
>
> **Documentation interactive** : `/api/docs/` (Swagger UI) — `/api/redoc/` (ReDoc)
>
> **Schéma OpenAPI** : `GET /api/schema/`

---

## Table des matières

1. [Auth](#1-auth)
2. [Players](#2-players)
3. [Venues](#3-venues)
4. [Matches](#4-matches)
5. [Open Matches](#5-open-matches)
6. [Scoring](#6-scoring)
7. [Rankings](#7-rankings)
8. [Chat](#8-chat)
9. [Enums & Valeurs](#9-enums--valeurs)
10. [Erreurs communes](#10-erreurs-communes)

---

## 1. Auth

### `POST /api/auth/register/`

Créer un nouveau compte utilisateur.

| Champ | Auth requise |
|-------|-------------|
| — | Non |

**Body :**
```json
{
  "email": "player@example.com",
  "password": "securePass123",
  "password_confirm": "securePass123"
}
```

**Réponse `201 Created` :**
```json
{
  "user": {
    "id": "a1b2c3d4-...",
    "email": "player@example.com",
    "phone_number": null,
    "role": "player",
    "is_active": true,
    "is_verified": false,
    "date_joined": "2025-01-15T10:00:00+01:00",
    "last_login": null,
    "profile": {
      "id": "e5f6g7h8-...",
      "email": "player@example.com",
      "first_name": "",
      "last_name": "",
      "date_of_birth": null,
      "avatar_url": null,
      "bio": "",
      "level_tennis": null,
      "level_padel": null,
      "preferred_play_mode": null,
      "city": "",
      "latitude": null,
      "longitude": null,
      "availability": {},
      "created_at": "2025-01-15T10:00:00+01:00",
      "updated_at": "2025-01-15T10:00:00+01:00"
    }
  },
  "tokens": {
    "access": "eyJhbGciOi...",
    "refresh": "eyJhbGciOi..."
  }
}
```

**Erreurs :**
| Code | Détail |
|------|--------|
| `400` | `"A user with this email already exists."` |
| `400` | `"Passwords do not match."` |
| `400` | Password trop court (< 8 caractères) |

---

### `POST /api/auth/login/`

Authentification email + mot de passe.

| Champ | Auth requise |
|-------|-------------|
| — | Non |

**Body :**
```json
{
  "email": "player@example.com",
  "password": "securePass123"
}
```

**Réponse `200 OK` :**
```json
{
  "user": { "...même structure que register..." },
  "tokens": {
    "access": "eyJhbGciOi...",
    "refresh": "eyJhbGciOi..."
  }
}
```

**Erreurs :**
| Code | Détail |
|------|--------|
| `400` | `"Invalid email or password."` |
| `400` | `"This account has been deactivated."` |

---

### `POST /api/auth/token/refresh/`

Renouveler le token d'accès avec un refresh token.

| Champ | Auth requise |
|-------|-------------|
| — | Non |

**Body :**
```json
{
  "refresh": "eyJhbGciOi..."
}
```

**Réponse `200 OK` :**
```json
{
  "access": "eyJhbGciOi..."
}
```

**Erreurs :**
| Code | Détail |
|------|--------|
| `401` | `"Token is invalid or expired"` |

---

### `GET /api/auth/me/`

Retourne le profil complet de l'utilisateur connecté.

| Champ | Auth requise |
|-------|-------------|
| — | **Oui** |

**Réponse `200 OK` :**
```json
{
  "id": "a1b2c3d4-...",
  "email": "player@example.com",
  "phone_number": null,
  "role": "player",
  "is_active": true,
  "is_verified": false,
  "date_joined": "2025-01-15T10:00:00+01:00",
  "last_login": "2025-01-15T10:05:00+01:00",
  "profile": {
    "id": "e5f6g7h8-...",
    "email": "player@example.com",
    "first_name": "Jean",
    "last_name": "Dupont",
    "date_of_birth": "1995-06-15",
    "avatar_url": null,
    "bio": "Tennis fan",
    "level_tennis": "intermediate",
    "level_padel": "beginner",
    "preferred_play_mode": "competitive",
    "city": "Lausanne",
    "latitude": 46.5197,
    "longitude": 6.6323,
    "availability": {"monday": ["18:00-20:00"]},
    "created_at": "2025-01-15T10:00:00+01:00",
    "updated_at": "2025-01-15T10:30:00+01:00"
  }
}
```

---

### `PATCH /api/auth/profile/`

Mettre à jour le profil du joueur connecté (mise à jour partielle).

| Champ | Auth requise |
|-------|-------------|
| — | **Oui** |

**Body (tous les champs optionnels) :**
```json
{
  "first_name": "Jean",
  "last_name": "Dupont",
  "date_of_birth": "1995-06-15",
  "bio": "Passionné de tennis",
  "level_tennis": "intermediate",
  "level_padel": "beginner",
  "preferred_play_mode": "competitive",
  "city": "Lausanne",
  "latitude": 46.5197,
  "longitude": 6.6323,
  "availability": {"monday": ["18:00-20:00"], "wednesday": ["12:00-14:00"]}
}
```

**Réponse `200 OK` :** PlayerProfile mis à jour (même structure que `profile` dans `/me/`).

**Erreurs :**
| Code | Détail |
|------|--------|
| `400` | `"Player must be at least 16 years old."` |
| `400` | Valeur invalide pour `level_tennis`, `level_padel` ou `preferred_play_mode` |

---

## 2. Players

### `GET /api/players/`

Liste des joueurs avec profils complets.

| Champ | Auth requise |
|-------|-------------|
| — | **Oui** |

**Filtres (query params) :**
| Param | Type | Exemple |
|-------|------|---------|
| `sport` | string | `tennis` ou `padel` |
| `city` | string | `Lausanne` |
| `level_tennis` | string | `beginner`, `intermediate`, `advanced` |
| `level_padel` | string | `beginner`, `intermediate`, `advanced` |
| `preferred_play_mode` | string | `friendly`, `competitive`, `both` |

**Réponse `200 OK` :**
```json
[
  {
    "id": "e5f6g7h8-...",
    "email": "player@example.com",
    "first_name": "Jean",
    "last_name": "Dupont",
    "date_of_birth": "1995-06-15",
    "avatar_url": null,
    "bio": "Tennis fan",
    "level_tennis": "intermediate",
    "level_padel": null,
    "preferred_play_mode": "competitive",
    "city": "Lausanne",
    "latitude": 46.5197,
    "longitude": 6.6323,
    "availability": {},
    "created_at": "2025-01-15T10:00:00+01:00",
    "updated_at": "2025-01-15T10:30:00+01:00"
  }
]
```

---

## 3. Venues

### `GET /api/venues/`

Liste des centres sportifs actifs.

| Champ | Auth requise |
|-------|-------------|
| — | **Oui** |

**Filtres (query params) :**
| Param | Type | Exemple |
|-------|------|---------|
| `city` | string | `Genève` |
| `sport` | string | `tennis` (filtre par courts disponibles) |

**Réponse `200 OK` :**
```json
[
  {
    "id": "v1a2b3c4-...",
    "name": "Tennis Club Lausanne",
    "city": "Lausanne",
    "image_url": "https://example.com/photo.jpg",
    "latitude": 46.5197,
    "longitude": 6.6323,
    "court_count": 5
  }
]
```

---

### `GET /api/venues/{id}/`

Détails d'un centre sportif avec ses courts.

| Champ | Auth requise |
|-------|-------------|
| — | **Oui** |

**Réponse `200 OK` :**
```json
{
  "id": "v1a2b3c4-...",
  "name": "Tennis Club Lausanne",
  "address": "Rue du Sport 10",
  "city": "Lausanne",
  "latitude": 46.5197,
  "longitude": 6.6323,
  "phone": "+41 21 123 45 67",
  "website_url": "https://tc-lausanne.ch",
  "image_url": "https://example.com/photo.jpg",
  "is_active": true,
  "managed_by": null,
  "courts": [
    {
      "id": "c1d2e3f4-...",
      "name": "Court Central",
      "sport": "tennis",
      "surface": "clay",
      "is_indoor": false,
      "hourly_rate": "45.00",
      "is_active": true
    }
  ],
  "created_at": "2025-01-01T00:00:00+01:00",
  "updated_at": "2025-01-10T12:00:00+01:00"
}
```

---

## 4. Matches

### `POST /api/matches/create/`

Créer un match.

| Champ | Auth requise |
|-------|-------------|
| — | **Oui** |

**Body :**
```json
{
  "sport": "tennis",
  "match_type": "singles",
  "play_mode": "competitive",
  "scheduled_date": "2025-02-15",
  "scheduled_time": "14:00:00"
}
```

**Réponse `201 Created` :**
```json
{
  "id": "m1a2b3c4-...",
  "sport": "tennis",
  "match_type": "singles",
  "play_mode": "competitive",
  "status": "open",
  "scheduled_date": "2025-02-15",
  "scheduled_time": "14:00:00",
  "created_by": "a1b2c3d4-...",
  "created_by_name": "Jean Dupont",
  "max_participants": 2,
  "current_participants_count": 1,
  "participants": [
    {
      "id": "p1a2b3c4-...",
      "player": "e5f6g7h8-...",
      "player_name": "Jean Dupont",
      "role": "creator",
      "status": "accepted",
      "team": null,
      "joined_at": "2025-01-15T10:00:00+01:00"
    }
  ],
  "created_at": "2025-01-15T10:00:00+01:00",
  "updated_at": "2025-01-15T10:00:00+01:00"
}
```

**Erreurs :**
| Code | Détail |
|------|--------|
| `400` | `"Cannot schedule a match in the past."` |
| `400` | Champ sport/match_type/play_mode invalide |

---

### `GET /api/matches/`

Liste des matches.

| Champ | Auth requise |
|-------|-------------|
| — | **Oui** |

**Filtres (query params) :**
| Param | Type | Exemple |
|-------|------|---------|
| `sport` | string | `tennis` |
| `status` | string | `open`, `confirmed`, `completed` |
| `play_mode` | string | `competitive` |
| `match_type` | string | `singles`, `doubles` |
| `scheduled_date_min` | date | `2025-02-01` |
| `scheduled_date_max` | date | `2025-02-28` |
| `city` | string | `Lausanne` |

**Réponse `200 OK` :**
```json
[
  {
    "id": "m1a2b3c4-...",
    "sport": "tennis",
    "match_type": "singles",
    "play_mode": "competitive",
    "status": "open",
    "scheduled_date": "2025-02-15",
    "scheduled_time": "14:00:00",
    "created_by_name": "Jean Dupont",
    "current_participants_count": 1,
    "max_participants": 2
  }
]
```

---

### `GET /api/matches/{id}/`

Détails d'un match avec participants.

| Champ | Auth requise |
|-------|-------------|
| — | **Oui** |

**Réponse `200 OK` :** Même structure que la réponse de création (voir `POST /api/matches/create/`).

---

### `POST /api/matches/{id}/join/`

Rejoindre un match existant.

| Champ | Auth requise |
|-------|-------------|
| — | **Oui** |

**Body :** Aucun.

**Réponse `200 OK` :** Match détaillé mis à jour (le joueur apparaît dans `participants`).

**Erreurs :**
| Code | Détail |
|------|--------|
| `400` | `"You have already joined this match."` |
| `400` | `"This match is already full."` |
| `404` | `"Match not found."` |

> **Note :** Lorsque le match est plein après le join, son statut passe automatiquement à `confirmed`.

---

### `GET /api/matches/my/`

Mes matches (tous les matches où l'utilisateur est participant).

| Champ | Auth requise |
|-------|-------------|
| — | **Oui** |

**Réponse `200 OK` :** Même structure que `GET /api/matches/` (liste).

---

## 5. Open Matches

Les "open matches" sont des matches publics avec des critères de niveau requis, une description et une date d'expiration.

### `POST /api/matches/open/create/`

Créer un open match.

| Champ | Auth requise |
|-------|-------------|
| — | **Oui** |

**Body :**
```json
{
  "sport": "padel",
  "match_type": "doubles",
  "play_mode": "friendly",
  "scheduled_date": "2025-03-01",
  "scheduled_time": "18:00:00",
  "required_level_min": "beginner",
  "required_level_max": "intermediate",
  "description": "Match amical entre amis, tous niveaux bienvenus",
  "expires_at": "2025-02-28T23:59:00+01:00"
}
```

**Réponse `201 Created` :**
```json
{
  "id": "om1a2b3c4-...",
  "match_id": "m1a2b3c4-...",
  "sport": "padel",
  "match_type": "doubles",
  "play_mode": "friendly",
  "status": "open",
  "scheduled_date": "2025-03-01",
  "scheduled_time": "18:00:00",
  "max_participants": 4,
  "spots_left": 3,
  "current_participants_count": 1,
  "required_level_min": "beginner",
  "required_level_max": "intermediate",
  "description": "Match amical entre amis, tous niveaux bienvenus",
  "expires_at": "2025-02-28T23:59:00+01:00",
  "created_by_name": "Jean Dupont",
  "participants": [
    {
      "id": "p1a2b3c4-...",
      "player": "e5f6g7h8-...",
      "player_name": "Jean Dupont",
      "role": "creator",
      "status": "accepted",
      "team": null,
      "joined_at": "2025-01-15T10:00:00+01:00"
    }
  ]
}
```

**Erreurs :**
| Code | Détail |
|------|--------|
| `400` | `"Cannot schedule a match in the past."` |
| `400` | `"expires_at must be before the match date."` |

---

### `GET /api/matches/open/`

Liste des open matches actifs (non expirés, status = open).

| Champ | Auth requise |
|-------|-------------|
| — | **Oui** |

**Filtres (query params) :**
| Param | Type | Exemple |
|-------|------|---------|
| `sport` | string | `padel` |
| `required_level_min` | string | `beginner` |
| `required_level_max` | string | `advanced` |
| `scheduled_date_min` | date | `2025-02-01` |
| `scheduled_date_max` | date | `2025-03-31` |

**Réponse `200 OK` :**
```json
[
  {
    "id": "om1a2b3c4-...",
    "sport": "padel",
    "match_type": "doubles",
    "play_mode": "friendly",
    "status": "open",
    "scheduled_date": "2025-03-01",
    "scheduled_time": "18:00:00",
    "max_participants": 4,
    "spots_left": 3,
    "required_level_min": "beginner",
    "required_level_max": "intermediate",
    "description": "Match amical entre amis",
    "expires_at": "2025-02-28T23:59:00+01:00",
    "created_by_name": "Jean Dupont"
  }
]
```

---

### `GET /api/matches/open/{id}/`

Détails d'un open match avec participants.

| Champ | Auth requise |
|-------|-------------|
| — | **Oui** |

**Réponse `200 OK` :** Même structure que la réponse de création (voir `POST /api/matches/open/create/`).

---

### `POST /api/matches/open/{id}/join/`

Rejoindre un open match.

| Champ | Auth requise |
|-------|-------------|
| — | **Oui** |

**Body :** Aucun.

**Réponse `200 OK` :** Open match détaillé mis à jour.

**Erreurs :**
| Code | Détail |
|------|--------|
| `400` | `"You have already joined this match."` |
| `400` | `"This match is already full."` |
| `400` | `"This open match has expired."` |

---

## 6. Scoring

### `POST /api/matches/{match_id}/score/`

Soumettre le score d'un match.

| Champ | Auth requise |
|-------|-------------|
| — | **Oui** |

**Body :**
```json
{
  "sets": [
    {"team_a": 6, "team_b": 4},
    {"team_a": 3, "team_b": 6},
    {"team_a": 7, "team_b": 5}
  ]
}
```

**Réponse `201 Created` :**
```json
{
  "id": "s1a2b3c4-...",
  "match": "m1a2b3c4-...",
  "submitted_by": "e5f6g7h8-...",
  "sets": [
    {"team_a": 6, "team_b": 4},
    {"team_a": 3, "team_b": 6},
    {"team_a": 7, "team_b": 5}
  ],
  "winner": "e5f6g7h8-...",
  "status": "pending",
  "confirmed_by": null,
  "confirmed_at": null,
  "created_at": "2025-02-15T16:30:00+01:00"
}
```

**Erreurs :**
| Code | Détail |
|------|--------|
| `400` | `"You are not a participant of this match."` |
| `400` | `"A score has already been submitted for this match."` |
| `400` | `"Each set must have 'team_a' and 'team_b' integer scores."` |

---

### `POST /api/scores/{id}/confirm/`

Confirmer un score soumis par un autre joueur.

| Champ | Auth requise |
|-------|-------------|
| — | **Oui** |

**Body :** Aucun.

**Réponse `200 OK` :**
```json
{
  "id": "s1a2b3c4-...",
  "match": "m1a2b3c4-...",
  "submitted_by": "e5f6g7h8-...",
  "sets": [...],
  "winner": "e5f6g7h8-...",
  "status": "confirmed",
  "confirmed_by": "a1b2c3d4-...",
  "confirmed_at": "2025-02-15T17:00:00+01:00",
  "created_at": "2025-02-15T16:30:00+01:00"
}
```

**Erreurs :**
| Code | Détail |
|------|--------|
| `400` | `"You are not a participant of this match."` |
| `400` | `"Score is not in pending status."` |
| `400` | `"You cannot confirm your own score."` |

---

### `POST /api/scores/{id}/dispute/`

Contester un score.

| Champ | Auth requise |
|-------|-------------|
| — | **Oui** |

**Body :** Aucun.

**Réponse `200 OK` :**
```json
{
  "id": "s1a2b3c4-...",
  "...": "...",
  "status": "disputed"
}
```

**Erreurs :**
| Code | Détail |
|------|--------|
| `400` | `"You are not a participant of this match."` |
| `400` | `"Score is not in pending status."` |
| `400` | `"You cannot dispute your own score."` |

---

## 7. Rankings

### `GET /api/rankings/`

Classement des joueurs, trié par points décroissants.

| Champ | Auth requise |
|-------|-------------|
| — | **Oui** |

**Filtres (query params) :**
| Param | Type | Exemple |
|-------|------|---------|
| `sport` | string | `tennis` |

**Réponse `200 OK` :**
```json
[
  {
    "id": "r1a2b3c4-...",
    "player": "e5f6g7h8-...",
    "player_name": "Jean Dupont",
    "sport": "tennis",
    "points": 1250,
    "wins": 8,
    "losses": 3,
    "rank_position": 1,
    "last_match_at": "2025-02-15T16:30:00+01:00",
    "updated_at": "2025-02-15T17:00:00+01:00"
  }
]
```

---

### `GET /api/rankings/me/`

Mes classements (un par sport pratiqué).

| Champ | Auth requise |
|-------|-------------|
| — | **Oui** |

**Réponse `200 OK` :**
```json
[
  {
    "id": "r1a2b3c4-...",
    "player": "e5f6g7h8-...",
    "player_name": "Jean Dupont",
    "sport": "tennis",
    "points": 1250,
    "wins": 8,
    "losses": 3,
    "rank_position": 1,
    "last_match_at": "2025-02-15T16:30:00+01:00",
    "updated_at": "2025-02-15T17:00:00+01:00"
  },
  {
    "id": "r9a8b7c6-...",
    "player": "e5f6g7h8-...",
    "player_name": "Jean Dupont",
    "sport": "padel",
    "points": 800,
    "wins": 4,
    "losses": 2,
    "rank_position": 3,
    "last_match_at": null,
    "updated_at": "2025-02-10T12:00:00+01:00"
  }
]
```

---

## 8. Chat

### `GET /api/chat/rooms/`

Liste des salons de chat de l'utilisateur, triés par dernier message.

| Champ | Auth requise |
|-------|-------------|
| — | **Oui** |

**Réponse `200 OK` :**
```json
[
  {
    "id": "cr1a2b3c4-...",
    "room_type": "match",
    "match_id": "m1a2b3c4-...",
    "last_message": {
      "id": "msg1a2b3-...",
      "sender": "a1b2c3d4-...",
      "sender_name": "Jean Dupont",
      "content": "On se retrouve à 14h ?",
      "message_type": "text",
      "created_at": "2025-02-14T10:30:00+01:00",
      "is_read": false
    },
    "unread_count": 2,
    "participants_names": ["Jean Dupont", "Marie Martin"],
    "is_active": true,
    "created_at": "2025-01-15T10:00:00+01:00"
  }
]
```

---

### `GET /api/chat/rooms/{id}/messages/`

Messages d'un salon (paginés, 50 par page, plus récent en premier).

| Champ | Auth requise |
|-------|-------------|
| — | **Oui** |

**Query params :**
| Param | Type | Exemple |
|-------|------|---------|
| `page` | int | `2` |

**Réponse `200 OK` :**
```json
{
  "count": 120,
  "next": "http://127.0.0.1:8000/api/chat/rooms/{id}/messages/?page=2",
  "previous": null,
  "results": [
    {
      "id": "msg1a2b3-...",
      "sender": "a1b2c3d4-...",
      "sender_name": "Jean Dupont",
      "content": "On se retrouve à 14h ?",
      "message_type": "text",
      "created_at": "2025-02-14T10:30:00+01:00",
      "is_read": false
    }
  ]
}
```

**Erreurs :**
| Code | Détail |
|------|--------|
| `403` | `"You are not a participant of this chat room."` |
| `404` | `"Chat room not found."` |

---

### `POST /api/chat/rooms/{id}/messages/`

Envoyer un message dans un salon.

| Champ | Auth requise |
|-------|-------------|
| — | **Oui** |

**Body :**
```json
{
  "content": "On se retrouve à 14h devant le court ?"
}
```

**Réponse `201 Created` :**
```json
{
  "id": "msg2b3c4d-...",
  "sender": "a1b2c3d4-...",
  "sender_name": "Jean Dupont",
  "content": "On se retrouve à 14h devant le court ?",
  "message_type": "text",
  "created_at": "2025-02-14T10:35:00+01:00",
  "is_read": false
}
```

**Erreurs :**
| Code | Détail |
|------|--------|
| `400` | Contenu vide ou > 2000 caractères |
| `403` | `"You are not a participant of this chat room."` |
| `404` | `"Chat room not found."` |

---

### `POST /api/chat/rooms/{id}/mark-read/`

Marquer tous les messages non lus (des autres) comme lus.

| Champ | Auth requise |
|-------|-------------|
| — | **Oui** |

**Body :** Aucun.

**Réponse `200 OK` :**
```json
{
  "marked_read": 5
}
```

**Erreurs :**
| Code | Détail |
|------|--------|
| `403` | `"You are not a participant of this chat room."` |
| `404` | `"Chat room not found."` |

---

## 9. Enums & Valeurs

### Sports
| Valeur | Label |
|--------|-------|
| `tennis` | Tennis |
| `padel` | Padel |

### Niveaux (Skill Level)
| Valeur | Label |
|--------|-------|
| `beginner` | Beginner |
| `intermediate` | Intermediate |
| `advanced` | Advanced |

### Mode de jeu (Play Mode)
| Valeur | Label |
|--------|-------|
| `friendly` | Friendly |
| `competitive` | Competitive |
| `both` | Both |

### Type de match
| Valeur | Label | Max participants |
|--------|-------|-----------------|
| `singles` | Singles | 2 |
| `doubles` | Doubles | 4 |

### Statut du match
| Valeur | Description |
|--------|-------------|
| `draft` | Brouillon |
| `open` | Ouvert, en attente de joueurs |
| `confirmed` | Tous les joueurs ont rejoint |
| `in_progress` | Match en cours |
| `completed` | Match terminé |
| `cancelled` | Match annulé |

### Rôle du participant
| Valeur | Description |
|--------|-------------|
| `creator` | Créateur du match |
| `invited` | Invité |
| `joined` | A rejoint de lui-même |

### Statut du participant
| Valeur | Description |
|--------|-------------|
| `pending` | En attente |
| `accepted` | Accepté |
| `declined` | Refusé |
| `left` | A quitté |

### Statut du score
| Valeur | Description |
|--------|-------------|
| `pending` | En attente de confirmation |
| `confirmed` | Confirmé par l'adversaire |
| `disputed` | Contesté |

### Type de salon de chat
| Valeur | Description |
|--------|-------------|
| `match` | Lié à un match |
| `open_match` | Lié à un open match |
| `tournament` | Lié à un tournoi |
| `direct` | Message direct |

### Type de message
| Valeur | Description |
|--------|-------------|
| `text` | Message texte |
| `system` | Message système |
| `image` | Image |

### Surfaces de court
| Valeur | Label |
|--------|-------|
| `clay` | Clay |
| `hard` | Hard |
| `grass` | Grass |
| `artificial` | Artificial |

---

## 10. Erreurs communes

### Format standard des erreurs

```json
{
  "detail": "Message d'erreur."
}
```

Pour les erreurs de validation :
```json
{
  "field_name": ["Error message 1.", "Error message 2."]
}
```

### Codes HTTP

| Code | Signification |
|------|---------------|
| `200` | Succès |
| `201` | Ressource créée |
| `400` | Erreur de validation / requête invalide |
| `401` | Non authentifié (token manquant ou expiré) |
| `403` | Accès interdit |
| `404` | Ressource non trouvée |
| `429` | Trop de requêtes (throttling) |

### Throttling

| Type | Limite |
|------|--------|
| Utilisateur anonyme | 20 requêtes / minute |
| Utilisateur authentifié | 100 requêtes / minute |

### Authentification

Toutes les requêtes authentifiées doivent inclure le header :

```
Authorization: Bearer <access_token>
```

Le token d'accès expire après **60 minutes**. Utilisez `POST /api/auth/token/refresh/` avec le refresh token (valide **7 jours**) pour obtenir un nouveau token d'accès.

# GoMatch API — Backend Django

API REST pour GoMatch, l'application de matchmaking tennis & padel en Suisse.

## Stack technique

- **Python 3.12** / **Django 5.x**
- **Django REST Framework** + SimpleJWT (authentification)
- **PostgreSQL** (production) / SQLite (développement)
- **Gunicorn** (serveur WSGI production)
- **WhiteNoise** (fichiers statiques)
- **drf-spectacular** (documentation OpenAPI)

## Installation locale

```bash
# 1. Cloner et se placer dans le dossier backend
cd backend

# 2. Créer un environnement virtuel
python -m venv venv
source venv/bin/activate    # macOS/Linux
venv\Scripts\activate       # Windows

# 3. Installer les dépendances
pip install -r requirements.txt

# 4. Appliquer les migrations
python manage.py migrate

# 5. (Optionnel) Créer des données de test
python manage.py create_test_data

# 6. Lancer le serveur
python manage.py runserver
```

Le serveur est accessible sur **http://localhost:8000**.

## Variables d'environnement

| Variable | Défaut | Description |
|----------|--------|-------------|
| `DJANGO_SECRET_KEY` | clé de dev | Clé secrète Django (obligatoire en prod) |
| `DJANGO_DEBUG` | `True` | Mode debug (`False` en production) |
| `DJANGO_ALLOWED_HOSTS` | `localhost,127.0.0.1` | Hosts autorisés (séparés par `,`) |
| `DATABASE_URL` | — | URL PostgreSQL (format `postgresql://user:pass@host:port/db`) |
| `DB_ENGINE` | `sqlite` | `postgresql` pour utiliser PostgreSQL sans `DATABASE_URL` |
| `DB_NAME` | `gomatch_db` | Nom de la base (si `DB_ENGINE=postgresql`) |
| `DB_USER` | `postgres` | Utilisateur PostgreSQL |
| `DB_PASSWORD` | `postgres` | Mot de passe PostgreSQL |
| `DB_HOST` | `localhost` | Hôte PostgreSQL |
| `DB_PORT` | `5432` | Port PostgreSQL |
| `CORS_ALLOWED_ORIGINS` | — | Origins CORS autorisées (séparés par `,`) |
| `SECURE_SSL_REDIRECT` | `True` | Redirection HTTPS (prod uniquement) |

Un fichier `.env.example` est fourni comme template.

## Lancer les tests

```bash
# Tous les tests (78 tests)
python manage.py test

# Tests d'une app spécifique
python manage.py test accounts
python manage.py test matches
python manage.py test scoring
python manage.py test chat
python manage.py test venues

# Avec verbosité
python manage.py test --verbosity=2
```

## Structure du projet

```
backend/
├── gomatch_api/          # Configuration Django
│   ├── settings.py       # Paramètres (DB, JWT, CORS, etc.)
│   ├── urls.py           # Routes racine + health check
│   └── wsgi.py           # Point d'entrée WSGI
├── accounts/             # Utilisateurs, profils, authentification
├── matches/              # Matchs privés et Open Matchs
├── scoring/              # Scores, confirmations, classements
├── chat/                 # Conversations et messages
├── venues/               # Clubs et terrains
├── core/                 # Exceptions, enums, commandes partagées
├── requirements.txt      # Dépendances Python
├── Dockerfile            # Image Docker production
├── Procfile              # Commandes Railway / Heroku
├── railway.json          # Configuration Railway
└── manage.py             # CLI Django
```

## Endpoints API

La documentation interactive est disponible sur le serveur :

- **Swagger UI** : `/api/docs/`
- **ReDoc** : `/api/redoc/`
- **Schéma OpenAPI** : `/api/schema/`

### Résumé des endpoints

| Préfixe | Description |
|---------|-------------|
| `POST /api/auth/register/` | Inscription |
| `POST /api/auth/login/` | Connexion (retourne JWT) |
| `POST /api/auth/token/refresh/` | Rafraîchir le token |
| `GET /api/auth/me/` | Profil de l'utilisateur connecté |
| `PATCH /api/auth/profile/` | Modifier son profil |
| `GET /api/players/` | Recherche de joueurs |
| `GET /api/players/:id/` | Profil d'un joueur |
| `GET /api/matches/` | Liste des matchs |
| `POST /api/matches/create/` | Créer un match privé |
| `GET /api/matches/:id/` | Détail d'un match |
| `POST /api/matches/:id/join/` | Rejoindre un match |
| `GET /api/matches/my/` | Mes matchs |
| `GET /api/matches/open/` | Liste des open matchs |
| `POST /api/matches/open/create/` | Créer un open match |
| `POST /api/matches/open/:id/join/` | Rejoindre un open match |
| `POST /api/matches/:id/score/` | Saisir un score |
| `POST /api/scores/:id/confirm/` | Confirmer un score |
| `POST /api/scores/:id/dispute/` | Contester un score |
| `GET /api/rankings/` | Classement général |
| `GET /api/rankings/me/` | Mon classement |
| `GET /api/chat/rooms/` | Mes conversations |
| `GET /api/chat/rooms/:id/messages/` | Messages d'une conversation |
| `POST /api/chat/rooms/:id/messages/` | Envoyer un message |
| `GET /api/venues/` | Liste des clubs |
| `GET /api/venues/:id/` | Détail d'un club |
| `GET /api/health/` | Health check |

## Déploiement Railway

1. Créer un projet sur [railway.com](https://railway.com)
2. Connecter le repo GitHub, définir le root directory sur `backend`
3. Ajouter un plugin **PostgreSQL** (injecte `DATABASE_URL` automatiquement)
4. Configurer les variables d'environnement :
   ```
   DJANGO_SECRET_KEY=<générer une clé>
   DJANGO_DEBUG=False
   DJANGO_ALLOWED_HOSTS=<domaine>.railway.app
   ```
5. Railway utilise le `Dockerfile` pour builder et `railway.json` pour le démarrage
6. Les migrations s'exécutent automatiquement au démarrage

Générer une clé secrète :
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

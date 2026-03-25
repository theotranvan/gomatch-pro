# GoMatch App — Frontend React Native

Application mobile pour GoMatch, le matchmaking tennis & padel en Suisse.

## Stack technique

- **Expo SDK 55** / **React Native 0.83**
- **TypeScript** (mode strict)
- **React Navigation** (stack + bottom tabs)
- **Axios** (requêtes API avec intercepteurs JWT)
- **AsyncStorage** (stockage local des tokens)
- **expo-splash-screen** (écran de démarrage)
- **react-native-toast-message** (notifications toast)

## Installation

```bash
# 1. Se placer dans le dossier frontend
cd gomatch-app

# 2. Installer les dépendances
npm install

# 3. Configurer l'URL de l'API
cp .env.example .env
# Éditer .env et définir API_URL
```

## Configuration de l'API URL

Le fichier `.env` contient l'URL du backend :

```env
# Développement local
API_URL=http://localhost:8000/api

# Backend Railway (production)
API_URL=https://ton-app.railway.app/api
```

La configuration est lue par `app.config.ts` → `expo-constants` → `src/constants/config.ts`.

> **Note Expo Go** : avec un backend local, utiliser l'IP de la machine (ex: `http://192.168.1.X:8000/api`) au lieu de `localhost` pour que le téléphone puisse y accéder.

## Lancer l'app

```bash
# Démarrer le serveur de développement Expo
npx expo start

# Options spécifiques :
npx expo start --ios        # Simulateur iOS
npx expo start --android    # Émulateur Android
npx expo start --tunnel     # Accès via tunnel (utile derrière un firewall)
```

Scanner le QR code avec **Expo Go** (iOS/Android) pour tester sur un appareil physique.

## Vérification TypeScript

```bash
npx tsc --noEmit
```

## Générer un build

### Prérequis

```bash
# Installer EAS CLI
npm install -g eas-cli

# Se connecter à Expo
eas login
```

### Builds disponibles

```bash
# Build de développement (avec dev client)
eas build --profile development --platform ios
eas build --profile development --platform android

# Build preview (distribution interne)
eas build --profile preview --platform ios
eas build --profile preview --platform android

# Build production
eas build --profile production --platform ios
eas build --profile production --platform android
```

Les profils sont définis dans `eas.json`. Chaque profil injecte l'`API_URL` correspondante.

## Structure du projet

```
gomatch-app/
├── App.tsx                    # Point d'entrée (providers, splash, toast)
├── app.config.ts              # Configuration Expo (remplace app.json)
├── eas.json                   # Profils de build EAS
├── .env                       # Variables d'environnement (non commité)
├── assets/                    # Icônes, splash screen, favicon
├── scripts/                   # Scripts utilitaires (génération d'assets)
└── src/
    ├── components/            # Composants réutilisables
    │   ├── Button.tsx         # Bouton principal
    │   ├── Card.tsx           # Carte
    │   ├── Input.tsx          # Champ de saisie
    │   ├── LoadingScreen.tsx  # Écran de chargement
    │   ├── EmptyState.tsx     # État vide
    │   ├── ErrorState.tsx     # État erreur
    │   └── NetworkError.tsx   # Erreur réseau
    ├── constants/
    │   ├── colors.ts          # Thème couleurs (#1B6B4A, etc.)
    │   └── config.ts          # Config API (lit expo-constants)
    ├── contexts/
    │   └── AuthContext.tsx     # Contexte authentification
    ├── hooks/
    │   └── useAuth.ts         # Hook raccourci auth
    ├── navigation/
    │   ├── RootNavigator.tsx  # Auth vs Main routing
    │   ├── AuthStack.tsx      # Login / Register
    │   ├── MainTabs.tsx       # Bottom tabs
    │   └── HomeStack.tsx      # Stack Home
    ├── screens/
    │   ├── auth/              # LoginScreen, RegisterScreen, OnboardingScreen
    │   └── main/              # HomeScreen, MatchListScreen, ChatScreen, etc.
    ├── services/
    │   ├── api.ts             # Instance Axios + intercepteurs JWT
    │   ├── auth.ts            # Service authentification
    │   ├── matches.ts         # Service matchs
    │   ├── openMatches.ts     # Service open matchs
    │   ├── chat.ts            # Service chat
    │   ├── scoring.ts         # Service scores & rankings
    │   ├── venues.ts          # Service clubs
    │   └── players.ts         # Service joueurs
    ├── types/
    │   └── index.ts           # Types TypeScript partagés
    └── utils/
        └── network.ts         # Utilitaire détection erreur réseau
```

## Thème

| Couleur | Hex | Usage |
|---------|-----|-------|
| Primary | `#1B6B4A` | Boutons, header, splash |
| Primary Light | `#2E8B57` | Accents |
| Background | `#FFFFFF` | Fond |
| Text | `#333333` | Texte principal |
| Text Secondary | `#666666` | Texte secondaire |
| Border | `#E5E5E5` | Bordures |
| Error | `#DC2626` | Erreurs |
| Success | `#16A34A` | Succès |

## Écrans

| Écran | Description |
|-------|-------------|
| Login | Connexion par email/mot de passe |
| Register | Inscription avec validation |
| Onboarding | Configuration profil (4 étapes) |
| Home | Matchs à venir + accès rapide |
| MatchList | Liste des matchs de l'utilisateur |
| MatchDetail | Détail avec joueurs, lieu, score |
| CreateMatch | Formulaire création match privé |
| OpenMatches | Liste des open matchs publics |
| CreateOpenMatch | Formulaire création open match |
| ChatList | Conversations |
| Chat | Messages d'une conversation |
| ScoreEntry | Saisie des sets |
| Ranking | Classement joueurs |
| PlayerSearch | Recherche de joueurs |
| PlayerProfile | Profil d'un joueur |
| Profile | Mon profil |
| EditProfile | Modifier mon profil |
| VenueList | Liste des clubs |
| VenueDetail | Détail d'un club + terrains |

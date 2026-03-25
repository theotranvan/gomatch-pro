# GoMatch — Checklist de Test Manuel

## Prérequis

- [ ] Backend déployé sur Railway et accessible
- [ ] PostgreSQL Railway provisionné et migré
- [ ] `API_URL` dans `.env` pointe vers le backend Railway
- [ ] App lancée via Expo Go ou dev build EAS
- [ ] Deux comptes de test disponibles (ou en créer pendant le test)

---

## 1. Inscription & Onboarding

### 1.1 Inscription
- [ ] Ouvrir l'app → écran Login affiché
- [ ] Appuyer sur "Créer un compte"
- [ ] Remplir : email, mot de passe, confirmation
- [ ] Soumettre → redirection vers Onboarding
- [ ] Vérifier : toast de succès affiché

### 1.2 Onboarding
- [ ] Étape 1 : prénom, nom, date de naissance
- [ ] Étape 2 : sport favori (tennis / padel / les deux)
- [ ] Étape 3 : niveau de jeu
- [ ] Étape 4 : localisation / club préféré
- [ ] Terminer → redirection vers Home
- [ ] Vérifier : le profil est complet dans l'onglet Profil

### 1.3 Connexion
- [ ] Se déconnecter
- [ ] Se reconnecter avec les identifiants créés
- [ ] Vérifier : arrivée directe sur Home (pas d'onboarding)

---

## 2. Splash Screen

- [ ] Fermer et rouvrir l'app
- [ ] Splash vert "GO MATCH" affiché 1-2 secondes
- [ ] Transition fluide vers Login ou Home

---

## 3. Navigation & Home

- [ ] Home affiche les matchs à venir de l'utilisateur
- [ ] Bottom tabs visibles : Accueil, Matchs, Chat, Profil
- [ ] Navigation entre les onglets fonctionne
- [ ] Pull-to-refresh sur Home fonctionne

---

## 4. Matchs

### 4.1 Créer un match privé
- [ ] Onglet Matchs → bouton "Créer un match"
- [ ] Remplir : adversaire (recherche joueur), lieu, date, heure, sport, type
- [ ] Soumettre → toast de succès
- [ ] Le match apparaît dans la liste des matchs
- [ ] Détail du match : infos correctes (joueurs, lieu, date, statut)

### 4.2 Créer un Open Match
- [ ] Bouton "Créer un open match"
- [ ] Remplir : lieu, date, heure, sport, niveau souhaité, nombre de places
- [ ] Soumettre → toast de succès
- [ ] Le match apparaît dans la liste des open matchs

### 4.3 Rejoindre un Open Match (Compte 2)
- [ ] Se connecter avec le compte 2
- [ ] Aller dans Open Matchs
- [ ] Trouver le match créé par compte 1
- [ ] Appuyer "Rejoindre" → toast de succès
- [ ] Le match apparaît dans les matchs du compte 2
- [ ] Retour sur compte 1 : le joueur 2 est visible dans le détail

### 4.4 Liste & Filtres
- [ ] Liste des matchs affiche les matchs de l'utilisateur
- [ ] Liste des open matchs affiche les matchs publics
- [ ] Filtrage par sport fonctionne (si implémenté)
- [ ] État vide affiché si aucun match

---

## 5. Chat

### 5.1 Liste de conversations
- [ ] Onglet Chat → liste des conversations
- [ ] Les matchs avec un adversaire génèrent une conversation
- [ ] État vide si aucune conversation

### 5.2 Envoyer un message
- [ ] Ouvrir une conversation
- [ ] Taper un message et envoyer
- [ ] Le message apparaît dans le chat
- [ ] Vérifier l'horodatage affiché

### 5.3 Recevoir un message (Compte 2)
- [ ] Se connecter avec compte 2
- [ ] Ouvrir la même conversation
- [ ] Le message du compte 1 est visible
- [ ] Envoyer une réponse
- [ ] Retour sur compte 1 : la réponse est visible (après refresh)

---

## 6. Score & Classement

### 6.1 Saisir un score
- [ ] Ouvrir un match terminé (ou marquer un match comme joué)
- [ ] Bouton "Saisir le score"
- [ ] Entrer les sets (ex: 6-4, 3-6, 7-5)
- [ ] Soumettre → toast de succès
- [ ] Le score apparaît dans le détail du match

### 6.2 Confirmer le score (Compte 2)
- [ ] Se connecter avec compte 2
- [ ] Ouvrir le même match
- [ ] Le score proposé par compte 1 est affiché
- [ ] Confirmer le score → toast de succès
- [ ] Le match passe en statut "Terminé"

### 6.3 Classement
- [ ] Aller dans le classement
- [ ] Les joueurs sont listés avec leurs points / victoires
- [ ] Le classement reflète les résultats des matchs joués
- [ ] Filtrer par sport (tennis / padel) si disponible

---

## 7. Profil

### 7.1 Voir le profil
- [ ] Onglet Profil → informations affichées (nom, sport, niveau, stats)
- [ ] Photo de profil affichée (ou placeholder)

### 7.2 Modifier le profil
- [ ] Bouton "Modifier"
- [ ] Changer le prénom ou le niveau
- [ ] Sauvegarder → toast de succès
- [ ] Revenir sur le profil → les changements sont visibles

### 7.3 Profil d'un autre joueur
- [ ] Rechercher un joueur
- [ ] Ouvrir son profil
- [ ] Informations publiques affichées (nom, niveau, stats)

---

## 8. Clubs & Terrains

### 8.1 Liste des clubs
- [ ] Naviguer vers la section Clubs / Venues
- [ ] Liste de clubs affichée
- [ ] État vide si aucun club dans la base

### 8.2 Détail d'un club
- [ ] Ouvrir un club
- [ ] Adresse, terrains disponibles, informations affichés
- [ ] Liste des terrains avec type (tennis, padel) et surface

---

## 9. Recherche de joueurs

- [ ] Ouvrir la recherche de joueurs
- [ ] Rechercher par nom → résultats pertinents
- [ ] Ouvrir le profil depuis les résultats
- [ ] Recherche vide → état vide affiché

---

## 10. Edge Cases & Robustesse

### 10.1 Double inscription
- [ ] Tenter de créer un compte avec un email déjà utilisé
- [ ] Message d'erreur clair affiché (pas de crash)

### 10.2 Rejoindre un match complet
- [ ] Tenter de rejoindre un open match déjà plein
- [ ] Message d'erreur clair (match complet)

### 10.3 Champs vides / invalides
- [ ] Soumettre le formulaire d'inscription sans email → erreur de validation
- [ ] Soumettre un match sans date → erreur de validation
- [ ] Mot de passe trop court → message d'erreur

### 10.4 Perte de connexion
- [ ] Couper le Wi-Fi / données mobiles
- [ ] Naviguer dans l'app → écran NetworkError affiché
- [ ] Rétablir la connexion → "Réessayer" fonctionne

### 10.5 Token expiré
- [ ] Laisser l'app ouverte longtemps (ou modifier le token dans AsyncStorage)
- [ ] Effectuer une action → le refresh token doit renouveler la session
- [ ] Si refresh expiré → redirection vers Login

### 10.6 Rafraîchissement des données
- [ ] Pull-to-refresh sur les listes principales
- [ ] Les nouvelles données apparaissent correctement

### 10.7 Retour arrière
- [ ] Naviguer en profondeur (Home → Match → Détail → Score)
- [ ] Bouton retour fonctionne à chaque étape
- [ ] Pas de boucle de navigation

---

## 11. Performance & UX

- [ ] Splash screen fluide au démarrage
- [ ] Les écrans de chargement (LoadingScreen) s'affichent pendant les requêtes
- [ ] Les toasts apparaissent et disparaissent correctement
- [ ] Pas de flash blanc entre les écrans
- [ ] Le clavier ne masque pas les champs de saisie
- [ ] Scroll fluide sur les longues listes

---

## 12. Résumé

| Section              | Statut | Notes |
|----------------------|--------|-------|
| Inscription          | ⬜     |       |
| Onboarding           | ⬜     |       |
| Splash Screen        | ⬜     |       |
| Navigation           | ⬜     |       |
| Matchs privés        | ⬜     |       |
| Open Matchs          | ⬜     |       |
| Rejoindre match      | ⬜     |       |
| Chat                 | ⬜     |       |
| Score                | ⬜     |       |
| Classement           | ⬜     |       |
| Profil               | ⬜     |       |
| Clubs & Terrains     | ⬜     |       |
| Recherche joueurs    | ⬜     |       |
| Edge cases           | ⬜     |       |
| Performance & UX     | ⬜     |       |

# Spécification Technique – AllForOne

Ce document décrit l’architecture cible et les choix techniques de la plateforme AllForOne. Il complète le cahier des charges fonctionnel en détaillant les couches front-end, back-end, stockage, sécurité, déploiement et performance.

---

## 1. Architecture globale

- **Pattern général** : architecture 3 couches (clients web/mobile, services applicatifs, stockage) déployée dans le cloud, élastique, sécurisée et orientée temps réel.
- **Communication temps réel** : WebSocket sécurisé (WSS) pour jeu, matchmaking, chat et notifications instantanées ; API REST/GraphQL sur HTTPS (TLS 1.3) pour les opérations classiques.
- **Serveur authoritatif** : toutes les règles de jeu sont appliquées côté serveur pour garantir l’équité et lutter contre la triche. Les clients sont considérés comme des vues/interactions.
- **Évolutivité** : équilibrage de charge + scale horizontal via conteneurs ; segmentation par micro-services possible à terme (matchmaking, notifications, analytics).
- **Sécurité** : chiffrement bout-à-bout, OAuth2 Google, politiques RGPD, durcissement applicatif (OWASP), traçabilité.

Illustration textuelle :

```
[Clients iOS/Android (React Native)]        [Client Web (React/PWA)]
             |                                          |
             +---------------- HTTPS / WSS -------------+
                                     |
                       [API Gateway / Load Balancer]
                                     |
              +----------------------+----------------------+
              |                                             |
        [Services REST]                              [Services temps réel]
              |                                             |
    [Business domaines: jeux,                        [Node.js WebSocket
     profils, social, boutique]                       + Redis pub/sub]
              |                                             |
              +------------------ Data Layer ---------------+
                                     |
     [MongoDB/Firestore] + [PostgreSQL optionnel] + [Redis cache] + [Object Storage]
```

---

## 2. Front-end (iOS, Android, Web)

### 2.1 Stack et mutualisation
- **Mobile** : React Native + TypeScript (Expo ou CLI), partage >60 % du code (stores Zustand, logique de jeux, modules UI).
- **Web** : SPA React (Vite + TypeScript). Option secondaire : React Native Web si on souhaite uniformiser complètement la couche UI.
- **Modules communs** : packages internes (monorepo) pour les modèles de données, la logique des moteurs de jeu (UNO, No Mercy, Derocher), la gestion de session.

### 2.2 UX & ergonomie
- Ligne directrice Apple-like (SF Pro, surfaces claires, micro-interactions). Animations 60 FPS, retours haptiques.
- PWA : service worker, stratégie de cache (assets statiques + données lecture seule), mode hors ligne partiel (consultation historique, feed, stats).
- Accessibilité : dynamic type, contrastes AA, VoiceOver/TalkBack, navigation clavier.

### 2.3 Communication
- Client HTTP via `fetch`/Axios → API REST versionnée (`/api/v1`).
- Client WebSocket via Socket.io (ou ws) → rooms « game_{sessionId} », « chat_{conversationId} », « notifications_{userId} ».
- Gestion de reconnexion, heartbeats, backoff exponentiel, persistance du token d’auth.

### 2.4 Authentification
- Flux OAuth2 Google (Authorization Code + PKCE) :
  1. L’utilisateur initie la connexion → navigateur système (mobile) ou popup (web) sur `accounts.google.com`.
  2. Google renvoie un code d’autorisation ; le client le transmet au backend.
  3. Le backend échange ce code contre un Access Token + ID Token + Refresh Token.
  4. Création/MAJ du compte AllForOne, émission d’un JWT applicatif court (1 h) + Refresh Token applicatif (30 j).
- Stockage tokens : SecureStore iOS/Android / cookies HTTP-only PWA.
- Renouvellement transparent via `/auth/refresh`.

---

## 3. Back-end (API & temps réel)

### 3.1 Stack principale
- **Node.js + TypeScript**.
- **Framework** : NestJS (structure modulaire, injection de dépendances, class-validator) ou Express + middlewares maison.
- **WebSocket** : Socket.io (rooms, ack, adaptateur Redis) ou ws brut si besoin de surcharge légère.

### 3.2 Services et endpoints clés
| Domaine | Exemples d’endpoints (REST) | Notes |
|---------|----------------------------|-------|
| Auth | `POST /auth/google`, `POST /auth/refresh`, `POST /auth/logout` | Gestion OAuth2 / JWT |
| Utilisateurs | `GET /users/{id}`, `PUT /users/{id}`, `GET /users?query=` | Profils, recherche, statut en ligne |
| Amis | `GET /friends`, `POST /friends/{id}`, `DELETE /friends/{id}` | Relations, invitations |
| Jeux | `GET /games` (catalogue), `POST /sessions`, `GET /sessions/{id}`, `POST /sessions/{id}/action` | Création, état partie |
| Matchmaking | `POST /matchmaking/quick`, `POST /matchmaking/cancel` | Files auto, niveaux MMR |
| Chat | `GET /conversations`, `POST /conversations`, `GET /conversations/{id}/messages`, `POST /conversations/{id}/messages` | Privé, groupes, salons publics |
| Feed | `GET /feed`, `POST /feed`, `POST /feed/{id}/like`, `GET /feed/{id}/comments` | Fil public type Twitter |
| Classements | `GET /leaderboard/{game}`, `GET /users/{id}/stats` | Scores globaux & par jeu |
| Notifications | `GET /notifications`, `POST /notifications/read` | Couplé aux pushes |

> Gouvernement des APIs : versionnage `/api/v1`, OpenAPI/Swagger, tests contractuels, pagination et filtrage standardisés.

### 3.3 Temps réel
- **Connexion** : WSS `wss://api.allforone.com/realtime` + handshake JWT.
- **Rooms** :
  - `game:{sessionId}`
  - `chat:{conversationId}`
  - `user:{userId}` (notifications personnelles)
  - `feed:public`
- **Événements** :
  - `GAME_UPDATE`, `GAME_STATE`, `MATCH_INVITE`, `PLAYER_READY`
  - `CHAT_MESSAGE`, `CHAT_TYPING`, `CHAT_SEEN`
  - `NOTIFICATION_PUSH`
- **Serveur authoritatif** :
  - UNO : validation des coups, tirage cartes, scoring, gestion variantes (No Mercy).
  - Derocher : gestion structure, points, chutes.
  - Sessions : transitions (`waiting → in-game → completed`), pénalités AFK, remplacement par bots.
- **QoS** : débit par partie < 30 msg/s, batch côté client si nécessaire, limitation des payloads via formats compacts (MessagePack possible).

---

## 4. Stockage & données

### 4.1 Choix technologiques
- **NoSQL principal** : MongoDB Atlas ou Firebase Firestore (flexibilité JSON, scalabilité horizontale).
- **Redis** : cache, sessions éphémères, pub/sub pour WebSocket cluster.
- **SQL optionnel** : PostgreSQL pour relations fortes (transactions financières, audit, reporting).
- **Object storage** : S3/GCS pour avatars, médias uploadés.

### 4.2 Schémas (exemples)
- `users` : `_id`, `googleSub`, `email`, `displayName`, `avatar`, `bio`, `level`, `xp`, `friends[]`, `settings`, `createdAt`, `lastSeen`.
- `games` (catalogue) : `gameId`, `name`, `description`, `modes`, `rules`, `assets`.
- `sessions` : `_id`, `gameId`, `type` (public/private/ranked), `mode` (realtime/turn-based), `status`, `hostId`, `players[]`, `options` (stackable, timer, eliminationThreshold), `createdAt`, `metadata`.
- `messages` : `_id`, `conversationId`, `senderId`, `content`, `type`, `createdAt`, `readBy[]`.
- `feedPosts` : `_id`, `authorId`, `content`, `media`, `likes`, `comments[]`, `createdAt`.
- Indexation : `users.email`, `sessions.status`, `sessions.gameId`, `messages.conversationId`, `feedPosts.createdAt` (TTL éventuel).
- Rétention : archivage messages > 6 mois, suppression via TTL ou jobs batch.

---

## 5. Gestion des sessions multijoueurs

1. **Création** : via `POST /sessions` ou matchmaking ; enregistrement BD, association host, génération code salon si privé.
2. **Matchmaking** :
   - Files par jeu / rang / mode.
   - MMR (Elo ou Glicko) stocké côté utilisateur.
   - Recherche combine latence, niveau, préférences (amis, langue).
3. **Joindre/quit** :
   - WebSocket `SESSION_JOIN` → ajout joueur, broadcast.
   - Déco détectée via ping/pong ; tolérance (grace period) avec reprise de session.
   - Remplacement par bot si option active.
4. **Synchronisation** :
   - Server-state sync : actions transmises au serveur qui réémet l’état autoritatif.
   - Snapshots périodiques (toutes X actions) pour reprise après crash.
5. **Résilience** :
   - Reprise état via BD / log d’actions.
   - Si crash complet : partie annulée ou relancée (selon statut).
   - Monitoring latence → adaptation (réduction fréquence updates, pause partie).

---

## 6. Authentification & identité

### 6.1 Flux complet OAuth2 (Google)
1. **Consentement** : ouverture navigateur, saisie identifiants sur domaine Google.
2. **Code d’autorisation** : redirection vers URI callback AllForOne avec `code` + `state`.
3. **Échange** : backend appelle Google OAuth token endpoint avec code + client_secret (resté côté serveur) + code_verifier PKCE.
4. **Création/MAJ compte** : lecture `id_token` pour récupérer `sub`, email, nom, photo.
5. **Session interne** : émission `jwtAccess` (1h) + `jwtRefresh` (30j). Stockage côté client (secure storage / cookie).
6. **Renouvellement** : `POST /auth/refresh` → validation refresh token → nouveau `jwtAccess`.
7. **Déconnexion** : invalidation refresh token (revocation table), suppression cookies.

### 6.2 Bonnes pratiques
- PKCE obligatoire (mobile) ; scopes minimaux (`profile`, `email`).
- Redirect URIs whitelistées (https, domain).
- JWT signés HS256/RS256, rotation clé possible (JWKS).
- MFA optionnel via Google : relies sur sécurité Google au niveau identité.

---

## 7. Sécurité & conformité

### 7.1 Réseau & transport
- TLS 1.3, HSTS, cipher suites modernes, certificate pinning (mobile).
- Séparation VPC : subnets privés pour services, bastion pour maintenance.
- WAF (AWS ALB WAF ou Cloud Armor) pour filtrage OWASP top 10.

### 7.2 Données & confidentialité
- Données sensitives chiffrées au repos (KMS), secrets via AWS Secrets Manager.
- RGPD : consentement explicite, droit à l’oubli (`DELETE /users/{id}` → purge/anonymisation), data residency UE.
- Journalisation conforme : logs sans PII, audit trail séparé (cloudtrail).

### 7.3 Anti-triche / abus
- Server-authoritative ; validation coups, anti-spam, limitations (messages/s).
- Détection patterns anormaux (latence, actions impossibles).
- Signalements utilisateurs, modération admin, bannissement.
- Captcha adaptatif (création compte suspecte, flood).

### 7.4 Durcissement applicatif
- Validation input (`class-validator`), sanitisation (xss, html).
- Rate limiting (API + WebSocket), circuits breaker.
- Monitoring dépendances (Dependabot, npm audit) + patch rapide via CI/CD.

---

## 8. Hébergement & déploiement

### 8.1 Infrastructure cloud
- **Compute** : Kubernetes (EKS/GKE) ou ECS Fargate ; conteneurs Docker (API, realtime, workers).
- **Load balancer** : ALB/Ingress TLS terminateur, sticky sessions optionnelles.
- **Base de données** : MongoDB Atlas (cluster multi-zone) + Redis ElastiCache + PostgreSQL RDS (option).
- **Stockage** : S3 (avatars, médias, builds PWA), CloudFront CDN.
- **Notification push** : microservice déclencheur (Node.js/Go) → FCM, APNs.
- **Environnements** : DEV (sandbox isolée), STAGING (représentative), PROD (haute disponibilité).

### 8.2 CI/CD
- GitHub Actions/GitLab CI :
  1. Lint + tests unitaires/integ.
  2. Build Docker (multi-stage).
  3. Scan sécurité (Snyk/Trivy).
  4. Push registry (ECR/GCR).
  5. Déploiement (kubectl apply / helm / EB blue-green).
  6. Smoke tests post-déploiement (health-check, endpoints critiques).
- Mobile : Fastlane pour builds, tests, déploiements sur TestFlight / Play Console.

### 8.3 Observabilité
- **Logs** : ELK (Elastic/Kibana) ou CloudWatch Logs, corrélation ID requête.
- **Metrics** : Prometheus/Grafana ou Datadog (CPU, mémoire, latence, nb parties).
- **APM** : New Relic/Dynatrace (traces, profiling).
- **Alerting** : seuils (CPU > 80%, erreurs 5xx, latence > 200 ms, backlog matchmaking), remontée Slack/Teams/SMS.
- **Supervision externe** : UptimeRobot, Pingdom pour endpoints publics et WSS.

---

## 9. Performance & optimisation

- **Cibles** : latence API < 100 ms, latence jeu 50–200 ms, matchmaking < 5 s.
- **Cache** : Redis pour sessions joueurs/paramètres, CDN pour assets, compression gzip/br, usage possible de MessagePack.
- **Optimisations serveur** : event loop monitoring, cluster Node.js, workers dédiés (classements, emails), job queue (SQS/RabbitMQ).
- **Dégradation gracieuse** : limiter feed, réduire animations, file d’attente si surcharge.
- **Tests** : k6/Gatling/JMeter pour charge, profiling Node (clinic.js), tests E2E (Playwright/Appium).
- **Front** : code splitting, memoisation, virtualisation listes (FlatList), throttling WebSocket, minification assets.

---

## 10. Données liées aux jeux actuels

- **UNO classique & No Mercy** : états de partie (deck, discard, mains, règles), événements (draw, play, challenge, éliminations). Logique authorisée côté serveur.
- **Derocher** : structure multi-blocs, étapes successives, pénalités, scoring. Tour par tour possible (notification push).
- **Boutique/XP** : transactions virtuelles (points gagnés, achats), inventaire utilisateur, badges, défis quotidiens.
- **Social** : feed public, salons, messages privés, salons thématiques (modération).

---

## 11. Références
1. [DEV Community – Architecture d’une application de chat](https://dev.to/pubnub-fr/larchitecture-dune-application-de-chat-expliquee-3fd4)  
2. [Gabriel Gambetta – Client/Server Game Architecture](https://www.gabrielgambetta.com/client-server-game-architecture.html)  
3. [Digital PACA – Appli mobile Native vs React Native vs Flutter](https://digital-paca.fr/application-mobile-native-react-native/)  
4. [Hello Pomelo – Architectures backend mobiles 2025](https://hello-pomelo.com/articles/les-meilleures-architectures-backend-pour-les-applications-mobiles-en-2025/)  
5. [StackOverflow – Architecture chat app](https://stackoverflow.com/questions/52197257/advice-on-how-to-design-a-good-architecture-for-a-chat-app)  
6. [Curity – OAuth for Mobile Apps Best Practices](https://curity.io/resources/learn/oauth-for-mobile-apps-best-practices/)  
7. [Reddit – Google OAuth avec React Native + Node backend](https://www.reddit.com/r/reactnative/comments/1cenc38/google_oauth_with_react_native_and_node_backend/)  
8. [StackOverflow – Right OAuth 2.0 flow for mobile app](https://stackoverflow.com/questions/17427707/whats-the-right-oauth-2-0-flow-for-a-mobile-app)

---

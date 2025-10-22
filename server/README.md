# AllForOne – Backend (MVP)

Backend Node.js/TypeScript pour AllForOne avec persistance MongoDB et cache Redis :

- Express (REST) + Socket.io (WSS)
- JWT mock (OAuth Google réel à intégrer ultérieurement)
- Sessions, conversations et feed stockés dans MongoDB (Mongoose)
- Redis pour le cache des sessions (`sessions:{gameId}`) et la pub/sub chat (`chat:{conversationId}`)
- Swagger (docs) sur `/docs`

## Démarrage

1. Infrastructure locale (ex. Docker) :
   ```bash
   docker run -d --name afo-mongo -p 27017:27017 mongo:6
   docker run -d --name afo-redis -p 6379:6379 redis:7
   ```
2. API :
   ```bash
   cd server
   cp .env.example .env   # vérifier MONGO_URI / REDIS_URL / CORS_ORIGIN
   npm i
   npm run dev
   # http://localhost:8080/health
   # http://localhost:8080/docs
   ```

## Scripts
- `dev` – ts-node-dev
- `build` – tsc
- `start` – node dist

## Points d’entrée REST / temps réel
- `POST /api/v1/auth/google` – mock OAuth → JWT applicatif
- `GET /api/v1/games` – catalogue
- `GET /api/v1/sessions?gameId=uno` – liste (cache Redis 5s)
- `POST /api/v1/sessions` – création (Mongo)
- `POST /api/v1/sessions/:id/join|ready|start` – interactions lobby (Mongo + invalidation cache)
- `GET /api/v1/conversations` – conversations où l’utilisateur est membre
- `POST /api/v1/conversations` – création conversation (liste de membres)
- `GET/POST /api/v1/conversations/:id/messages` – messages persistés (pub/sub Redis)
- `GET/POST /api/v1/feed` – fil public (Mongo)
- Socket.io : événements `join_session`, `leave_session`, `chat_message` (consommer côté front)

## À faire
- Authentification Google OAuth complète (PKCE, refresh tokens)
- Matchmaking ELO + leaderboards persistants
- Notifications push (FCM/APNs)
- Règles server-authoritative UNO/Dérocher + sync WSS `game:{sessionId}`
- CI/CD & observabilité (Docker images, pipeline, monitoring/alerting)


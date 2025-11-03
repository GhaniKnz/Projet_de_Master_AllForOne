# AllForOne - Backend

TypeScript/Express API with MongoDB persistence for the AllForOne prototype. The server powers authentication, user profiles, feed activity, direct messages, and casual game sessions.

## Stack
- Express 4 with Zod validation
- MongoDB via Mongoose (sessions, feed, users, conversations)
- Redis (optional) for chat pub/sub
- Socket.io server binding (feed and chat events)
- JSON Web Tokens for email/password auth
- Swagger UI available at `/docs`

## Getting Started
1. Start backing services (Docker example):
   ```bash
   docker run -d --name afo-mongo -p 27017:27017 mongo:6
   docker run -d --name afo-redis -p 6379:6379 redis:7
   ```
2. Configure environment:
   ```bash
   cd server
   cp .env.example .env
   # set MONGO_URI, REDIS_URL, JWT_SECRET, CORS_ORIGIN, GOOGLE_CLIENT_ID if needed
   npm install
   npm run dev
   # http://localhost:8080/health
   # http://localhost:8080/docs
   ```

The server falls back to `mongodb://127.0.0.1:27017/allforone` when `MONGO_URI` is unset and skips Redis integration if `REDIS_URL` is missing.

## Scripts
- `npm run dev` - tsx with watch mode
- `npm run build` - TypeScript compilation (`dist/`)
- `npm start` - run compiled output

## Data Seeding
`seedInitialData` runs at bootstrap:
- creates demo users with hashed passwords
- inserts showcase feed posts (one image sample included)
- links demo friendships so the UI has activity by default

## REST API Highlights

### Auth (`/api/v1/auth`)
- `POST /register` - email/password registration
- `POST /login` - email/password login
- `POST /google` - returns 503 until `GOOGLE_CLIENT_ID` is configured
- `POST /forgot-password` - issues reset token (printed in logs)
- `POST /reset-password` - set a new password with the token
- `POST /refresh` - issue a fresh JWT
- `GET /me` - current user profile (requires auth)

### Users (`/api/v1/users`)
- `PUT /me/profile` - update display name, avatar, banner, bio
- `POST /friends/:username` and `DELETE /friends/:username` - manage friend list
- `GET /me/progression` - XP, level, progress to next level
- `GET /:username` - public profile (stats, posts count, comments count)
- `GET /:username/activity` - recent posts/comments merged chronologically

### Feed (`/api/v1/feed`)
- `GET /` - paginated feed (cursor-based, 20 items default)
- `POST /` - publish text plus optional media (max 4 attachments)
- `POST /:postId/like` - toggle like, returns current count
- `GET /:postId/comments` - paginated comments
- `POST /:postId/comments` - add comment, awards XP

### Conversations (`/api/v1/conversations`)
- `GET /` - conversations that include the authenticated user
- `POST /` - create DM or group conversation (dedupes membership)
- `GET /:id/messages` - fetch message history
- `POST /:id/messages` - persist new message (also published on Redis channel `chat:{id}`)
- `POST /:id/pin` - toggle pin for the current user
- `POST /:id/create-session` - spawn a game session and post a system message with the join code

### Games (`/api/v1/games`, `/api/v1/sessions`)
- `GET /games` - catalog (falls back to local JSON when backend mock is used)
- `POST /sessions` - create session
- `POST /sessions/:id/join|ready|start` - lobby actions
- `GET /sessions?gameId=uno` - list sessions, cached briefly in Redis when available

## Realtime Events
`server/src/realtime/events.ts` binds the Socket.io server so feed and chat events can be pushed to rooms:
- feed likes/comments emit `FEED_LIKED` or `FEED_COMMENTED` to the `feed:global` room
- chat messages publish to Redis (`chat:{conversationId}`) for horizontal scale

## Known Gaps
- Production-grade Google OAuth (PKCE, refresh tokens) is still pending
- No rate limiting or audit logging yet
- Matchmaking and leaderboards remain placeholders
- Push notifications (APNs/FCM) are not implemented

Refer to the Swagger UI for the full contract, including request and response schemas.

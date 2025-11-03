import { createServer } from 'http'
import express from 'express'
import type { Request, Response } from 'express'
import cors, { type CorsOptions } from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { Server as IOServer } from 'socket.io'
import { fileURLToPath } from 'url'
import { registerSocketHandlers } from './realtime/socket.js'
import { bindSocketServer } from './realtime/events.js'
import { authRouter } from './routes/auth.js'
import { gamesRouter } from './routes/games.js'
import { sessionsRouter } from './routes/sessions.js'
import { usersRouter } from './routes/users.js'
import { chatRouter } from './routes/chat.js'
import { feedRouter } from './routes/feed.js'
import { notificationsRouter } from './routes/notifications.js'
import { swaggerUi, swaggerSpec } from './swagger.js'
import { connectMongo, disconnectMongo } from './config/mongo.js'
import { connectRedis, disconnectRedis } from './config/redis.js'
import { seedInitialData } from './config/seed.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function loadEnvironment() {
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '..', '.env'),
    path.resolve(__dirname, '.env'),
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../../.env')
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      dotenv.config({ path: candidate })
      return
    }
  }

  // fallback: default behaviour (maybe env variables already injected)
  dotenv.config()
}

loadEnvironment()

if (!process.env.GOOGLE_CLIENT_ID) {
  console.warn('GOOGLE_CLIENT_ID not set. Google sign-in will return 503 until configured.')
} else {
  console.log('Google OAuth client configured.')
}

const app = express()
const server = createServer(app)

const PORT = Number(process.env.PORT || 8080)
const rawOrigins = process.env.CORS_ORIGIN
const allowedOrigins = rawOrigins
  ? rawOrigins.split(',').map((origin) => origin.trim()).filter(Boolean)
  : []
const corsOptions: CorsOptions = {
  origin: allowedOrigins.length === 0 ? true : allowedOrigins,
  credentials: true
}

app.disable('x-powered-by')
app.use(helmet({ crossOriginResourcePolicy: false }))
app.use(cors(corsOptions))
app.use(express.json({ limit: '1mb' }))
app.use(morgan('dev'))

app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'AllForOne API',
    status: 'ok',
    docs: '/docs',
    health: '/health'
  })
})

app.get('/health', (_req: Request, res: Response) => res.json({ ok: true, uptime: process.uptime() }))

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

app.use('/api/v1/auth', authRouter)
app.use('/api/v1/users', usersRouter)
app.use('/api/v1/games', gamesRouter)
app.use('/api/v1/sessions', sessionsRouter)
app.use('/api/v1/conversations', chatRouter)
app.use('/api/v1/feed', feedRouter)
app.use('/api/v1/notifications', notificationsRouter)

const io = new IOServer(server, {
  cors: {
    origin: corsOptions.origin,
    credentials: true
  }
})
registerSocketHandlers(io)
bindSocketServer(io)

async function bootstrap() {
  await Promise.all([connectMongo(), connectRedis()])
  await seedInitialData().catch((err) => {
    console.error('Seeding failed', err)
  })
  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`AllForOne API ready on http://localhost:${PORT} (docs: /docs)`)
  })
}

bootstrap().catch((err) => {
  console.error('Startup failed', err)
  process.exit(1)
})

async function shutdown(): Promise<void> {
  console.log('Shutting down...')
  await disconnectRedis().catch(() => null)
  await disconnectMongo().catch(() => null)
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)


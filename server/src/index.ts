import { createServer } from 'http'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'
import { Server as IOServer } from 'socket.io'
import { registerSocketHandlers } from './realtime/socket.js'
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

dotenv.config()

const app = express()
const server = createServer(app)

const PORT = Number(process.env.PORT || 8080)
const ORIGIN = process.env.CORS_ORIGIN || '*'

app.disable('x-powered-by')
app.use(helmet({ crossOriginResourcePolicy: false }))
app.use(cors({ origin: ORIGIN, credentials: true }))
app.use(express.json({ limit: '1mb' }))
app.use(morgan('dev'))

app.get('/health', (_req, res) => res.json({ ok: true, uptime: process.uptime() }))

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

app.use('/api/v1/auth', authRouter)
app.use('/api/v1/users', usersRouter)
app.use('/api/v1/games', gamesRouter)
app.use('/api/v1/sessions', sessionsRouter)
app.use('/api/v1/conversations', chatRouter)
app.use('/api/v1/feed', feedRouter)
app.use('/api/v1/notifications', notificationsRouter)

const io = new IOServer(server, {
  cors: { origin: ORIGIN, credentials: true }
})
registerSocketHandlers(io)

async function bootstrap() {
  await Promise.all([connectMongo(), connectRedis()])
  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`AllForOne API ready on http://localhost:${PORT} (docs: /docs)`) 
  })
}

bootstrap().catch((err) => {
  console.error('Startup failed', err)
  process.exit(1)
})

async function shutdown() {
  console.log('Shutting down…')
  await disconnectRedis().catch(() => null)
  await disconnectMongo().catch(() => null)
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)


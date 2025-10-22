import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import { SessionModel, toClientSession } from '../models/session.js'
import { getRedis } from '../config/redis.js'
import { randomUUID } from 'crypto'

export const sessionsRouter = Router()

const CreateSchema = z.object({
  gameId: z.string().min(1),
  title: z.string().optional(),
  type: z.enum(['public', 'private', 'ranked']).optional(),
  mode: z.enum(['realtime', 'turn-based']).optional(),
  maxPlayers: z.number().int().min(2).max(10).optional(),
  options: z.record(z.any()).optional()
})

sessionsRouter.get('/', async (req, res) => {
  const gameId = (req.query.gameId as string) || ''
  if (!gameId) return res.json({ items: [] })
  const redis = getRedis()
  const cacheKey = redis ? `sessions:${gameId}` : null
  if (redis && cacheKey) {
    const cached = await redis.get(cacheKey)
    if (cached) return res.json({ items: JSON.parse(cached) })
  }
  const docs = await SessionModel.find({ gameId }).sort({ createdAt: -1 }).lean()
  const items = docs.map((doc: any) => ({ id: doc._id.toString(), ...doc }))
  if (redis && cacheKey) await redis.set(cacheKey, JSON.stringify(items), { EX: 5 })
  return res.json({ items })
})

sessionsRouter.get('/:id', async (req, res) => {
  const doc = await SessionModel.findById(req.params.id).lean()
  if (!doc) return res.status(404).json({ error: 'Not found' })
  return res.json({ id: doc._id.toString(), ...doc })
})

sessionsRouter.post('/', requireAuth, async (req, res) => {
  const parsed = CreateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })
  const auth = (req as any).auth
  const sessionDoc = await SessionModel.create({
    ...parsed.data,
    title: parsed.data.title || 'Partie entre amis',
    hostId: auth.userId,
    players: [
      {
        id: auth.userId,
        name: auth.displayName || 'Vous',
        avatar: 'YO',
        isHost: true,
        status: 'ready'
      }
    ],
    accessCode: parsed.data.type === 'private' ? generateAccessCode() : undefined
  })
  clearSessionCache(sessionDoc.gameId)
  return res.status(201).json(toClientSession(sessionDoc))
})

sessionsRouter.post('/:id/join', requireAuth, async (req, res) => {
  const auth = (req as any).auth
  const session = await SessionModel.findById(req.params.id)
  if (!session) return res.status(404).json({ error: 'Not found' })
  if (session.players.find((p) => p.id === auth.userId)) {
    return res.json(toClientSession(session))
  }
  if (session.players.length >= session.maxPlayers || session.status !== 'waiting') {
    return res.json(toClientSession(session))
  }
  session.players.push({ id: auth.userId, name: auth.displayName || 'Vous', status: 'waiting' })
  await session.save()
  clearSessionCache(session.gameId)
  return res.json(toClientSession(session))
})

sessionsRouter.post('/:id/ready', requireAuth, async (req, res) => {
  const auth = (req as any).auth
  const session = await SessionModel.findById(req.params.id)
  if (!session) return res.status(404).json({ error: 'Not found' })
  session.players = session.players.map((player) =>
    player.id === auth.userId
      ? { ...player, status: player.status === 'ready' ? 'waiting' : 'ready' }
      : player
  )
  await session.save()
  clearSessionCache(session.gameId)
  return res.json(toClientSession(session))
})

sessionsRouter.post('/:id/start', requireAuth, async (req, res) => {
  const session = await SessionModel.findById(req.params.id)
  if (!session) return res.status(404).json({ error: 'Not found' })
  session.status = 'in-game'
  session.players = session.players.map((player) => ({ ...player, status: 'playing' }))
  await session.save()
  clearSessionCache(session.gameId)
  return res.json(toClientSession(session))
})

async function clearSessionCache(gameId: string) {
  const redis = getRedis()
  if (!redis) return
  await redis.del(`sessions:${gameId}`)
}

function generateAccessCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'AFO-'
  for (let i = 0; i < 4; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)]
  return code
}


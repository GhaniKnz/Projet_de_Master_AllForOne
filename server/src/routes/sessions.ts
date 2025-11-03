import { Router } from 'express'
import type { Request, Response } from 'express'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import { SessionModel, toClientSession } from '../models/session.js'
import { getRedis } from '../config/redis.js'

export const sessionsRouter = Router()

const CreateSchema = z.object({
  gameId: z.string().min(1),
  title: z.string().optional(),
  type: z.enum(['public', 'private', 'ranked']).optional(),
  mode: z.enum(['realtime', 'turn-based']).optional(),
  maxPlayers: z.number().int().min(2).max(10).optional(),
  options: z.record(z.any()).optional()
})

const UpdateOptionsSchema = z.object({
  options: z.record(z.any())
})

const AddBotSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1)
      .max(30)
      .optional(),
    difficulty: z.enum(['easy', 'normal', 'hard']).optional()
  })
  .optional()

type SessionsListRequest = Request<unknown, unknown, unknown, { gameId?: string }>
type SessionIdRequest = Request<{ id: string }>

sessionsRouter.get('/', async (req: SessionsListRequest, res: Response) => {
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

sessionsRouter.get('/:id', async (req: SessionIdRequest, res: Response) => {
  const doc = await SessionModel.findById(req.params.id).lean()
  if (!doc) return res.status(404).json({ error: 'Not found' })
  return res.json({ id: doc._id.toString(), ...doc })
})

sessionsRouter.post('/', requireAuth, async (req: Request, res: Response) => {
  const parsed = CreateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })
  const auth = req.auth!
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

sessionsRouter.post('/:id/join', requireAuth, async (req: SessionIdRequest, res: Response) => {
  const auth = req.auth!
  const session = await SessionModel.findById(req.params.id)
  if (!session) return res.status(404).json({ error: 'Not found' })
  if (session.players.find((p) => p.id === auth.userId)) {
    return res.json(toClientSession(session))
  }
  if (session.players.length >= session.maxPlayers || session.status !== 'waiting') {
    return res.json(toClientSession(session))
  }
  session.players.push({
    id: auth.userId,
    name: auth.displayName || 'Vous',
    status: 'waiting',
    isHost: false,
    avatar: auth.displayName?.slice(0, 2)?.toUpperCase()
  })
  await session.save()
  clearSessionCache(session.gameId)
  return res.json(toClientSession(session))
})

sessionsRouter.post('/:id/ready', requireAuth, async (req: SessionIdRequest, res: Response) => {
  const auth = req.auth!
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

sessionsRouter.post('/:id/start', requireAuth, async (req: SessionIdRequest, res: Response) => {
  const auth = req.auth!
  const session = await SessionModel.findById(req.params.id)
  if (!session) return res.status(404).json({ error: 'Not found' })
  if (session.hostId !== auth.userId) {
    return res.status(403).json({ error: 'Only the host can start the match' })
  }
  if (session.status !== 'waiting') {
    return res.status(400).json({ error: 'Session already started' })
  }
  if (session.players.length < 2) {
    return res.status(400).json({ error: 'At least two players are required' })
  }
  const everyoneReady = session.players.every((player) => player.isBot || player.status === 'ready')
  if (!everyoneReady) {
    return res.status(400).json({ error: 'All players must be ready before starting' })
  }
  session.status = 'in-game'
  session.players = session.players.map((player) => ({ ...player, status: 'playing' }))
  await session.save()
  clearSessionCache(session.gameId)
  return res.json(toClientSession(session))
})

sessionsRouter.post('/:id/options', requireAuth, async (req: SessionIdRequest, res: Response) => {
  const auth = req.auth!
  const parsed = UpdateOptionsSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })
  const session = await SessionModel.findById(req.params.id)
  if (!session) return res.status(404).json({ error: 'Not found' })
  if (session.hostId !== auth.userId) {
    return res.status(403).json({ error: 'Only the host can update options' })
  }
  if (session.status !== 'waiting') {
    return res.status(400).json({ error: 'Cannot change options after the game has started' })
  }
  session.options = { ...(session.options || {}), ...parsed.data.options }
  await session.save()
  clearSessionCache(session.gameId)
  return res.json(toClientSession(session))
})

sessionsRouter.post('/:id/bots', requireAuth, async (req: SessionIdRequest, res: Response) => {
  const auth = req.auth!
  const parsed = AddBotSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })
  const session = await SessionModel.findById(req.params.id)
  if (!session) return res.status(404).json({ error: 'Not found' })
  if (session.hostId !== auth.userId) {
    return res.status(403).json({ error: 'Only the host can add bots' })
  }
  if (session.status !== 'waiting') {
    return res.status(400).json({ error: 'Cannot add bots once the game has started' })
  }
  if (session.players.length >= session.maxPlayers) {
    return res.status(400).json({ error: 'Lobby is full' })
  }
  const allowBots = (session.options as Record<string, unknown>)?.allowBots
  if (allowBots === false) {
    return res.status(400).json({ error: 'Bots are disabled for this session' })
  }
  const existingBots = session.players.filter((player) => player.isBot).length
  const botIndex = existingBots + 1
  const botId = `bot-${session.gameId}-${randomUUID().slice(0, 6)}`
  const botName = parsed.data?.name?.trim() || `Bot ${botIndex}`
  session.players.push({
    id: botId,
    name: botName,
    avatar: `B${botIndex}`,
    isHost: false,
    isBot: true,
    status: 'ready'
  })
  await session.save()
  clearSessionCache(session.gameId)
  return res.status(201).json(toClientSession(session))
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

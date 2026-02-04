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

// Rejoin an active session (for players who disconnected)
sessionsRouter.post('/:id/rejoin', requireAuth, async (req: SessionIdRequest, res: Response) => {
  const auth = req.auth!
  const session = await SessionModel.findById(req.params.id)
  if (!session) return res.status(404).json({ error: 'Not found' })
  
  // Check if player was part of this session
  const existingPlayer = session.players.find((p) => p.id === auth.userId)
  if (!existingPlayer) {
    return res.status(403).json({ error: 'You were not part of this session' })
  }
  
  // Allow rejoin if session is still active (waiting or in-game)
  if (session.status === 'completed') {
    return res.status(400).json({ error: 'Session has already ended' })
  }
  
  // Update player status to show they're back
  session.players = session.players.map((player) =>
    player.id === auth.userId
      ? { ...player, status: session.status === 'in-game' ? 'playing' : 'ready' }
      : player
  )
  
  // Update last activity timestamp
  session.updatedAt = new Date()
  await session.save()
  clearSessionCache(session.gameId)
  
  return res.json(toClientSession(session))
})

// Delete inactive sessions (called periodically)
sessionsRouter.delete('/cleanup/inactive', async (_req: Request, res: Response) => {
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000) // 1 minute
  
  // Find and delete sessions that haven't been updated in 1 minute
  // This includes both 'waiting' and 'in-game' sessions that are inactive
  const result = await SessionModel.deleteMany({
    status: { $in: ['waiting', 'in-game'] },
    updatedAt: { $lt: oneMinuteAgo }
  })
  
  // Clear all session caches
  const redis = getRedis()
  if (redis) {
    const keys = await redis.keys('sessions:*')
    if (keys.length > 0) {
      await redis.del(keys)
    }
  }
  
  return res.json({ deleted: result.deletedCount })
})

// Delete a specific session (when game ends)
sessionsRouter.delete('/:id', requireAuth, async (req: SessionIdRequest, res: Response) => {
  const auth = req.auth!
  const session = await SessionModel.findById(req.params.id)
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' })
  }
  
  // Only host or a player in the session can delete it
  const isPlayerInSession = session.players.some(p => p.id === auth.userId)
  if (!isPlayerInSession && session.hostId !== auth.userId) {
    return res.status(403).json({ error: 'Not authorized to delete this session' })
  }
  
  await SessionModel.findByIdAndDelete(req.params.id)
  clearSessionCache(session.gameId)
  
  return res.json({ ok: true })
})

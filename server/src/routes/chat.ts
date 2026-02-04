import { Router } from 'express'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { requireAuth } from '../middleware/auth.js'
import { ConversationModel } from '../models/conversation.js'
import { getRedis } from '../config/redis.js'
import { SessionModel, toClientSession } from '../models/session.js'
import { emitChatEvent, emitUserEvent } from '../realtime/events.js'

const generateAccessCode = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'AFO-'
  for (let i = 0; i < 4; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return code
}

const CLIENT_BASE_URL = (process.env.CLIENT_BASE_URL || process.env.CLIENT_APP_URL || '').replace(/\/$/, '')

export const chatRouter = Router()

const CreateConversationSchema = z.object({
  members: z.array(z.string()).min(1),
  title: z.string().min(2).max(60).optional()
})

const MessageSchema = z.object({ content: z.string().min(1) })

const CreateSessionSchema = z.object({
  gameId: z.string().min(1),
  title: z.string().optional(),
  type: z.enum(['public', 'private', 'ranked']).optional(),
  mode: z.enum(['realtime', 'turn-based']).optional(),
  maxPlayers: z.number().int().min(2).max(10).optional(),
  options: z.record(z.any()).optional()
})

type RequestWithId = Request<{ id: string }>

chatRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const auth = req.auth!
  const items = await ConversationModel.find({ members: auth.userId }).sort({ lastMessageAt: -1 }).lean()
  const mapped = items.map((item: any) => ({
    id: item._id.toString(),
    type: item.type,
    title: item.title,
    members: item.members,
    pinned: (item.pinnedBy || []).includes(auth.userId),
    lastMessage: item.lastMessage ?? null,
    lastMessageAt: item.lastMessageAt,
    createdBy: item.createdBy
  }))
  res.json({ items: mapped })
})

chatRouter.post('/', requireAuth, async (req: Request, res: Response) => {
  const parsed = CreateConversationSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })

  const auth = req.auth!
  const members = Array.from(new Set([auth.userId, ...parsed.data.members]))
  const conversationType = members.length > 2 ? 'group' : 'dm'
  const existing = await ConversationModel.findOne({
    members: { $all: members, $size: members.length },
    type: conversationType
  })
  if (existing) {
    return res.json({ id: existing.id, ...existing.toObject({ versionKey: false }) })
  }

  const conversation = await ConversationModel.create({
    type: conversationType,
    title: parsed.data.title,
    createdBy: auth.userId,
    members,
    lastMessageAt: new Date()
  })
  const payload = {
    id: conversation.id,
    type: conversation.type,
    title: conversation.title,
    members: conversation.members,
    createdBy: conversation.createdBy,
    pinned: false,
    lastMessage: null,
    lastMessageAt: conversation.lastMessageAt
  }
  res.status(201).json(payload)
  members.forEach((memberId) => emitUserEvent(memberId, 'conversation_created', payload))
})

chatRouter.get('/:id/messages', requireAuth, async (req: RequestWithId, res: Response) => {
  const conv = await ConversationModel.findById(req.params.id).lean()
  if (!conv) return res.status(404).json({ error: 'Not found' })
  res.json({ items: conv.messages || [] })
})

chatRouter.post('/:id/messages', requireAuth, async (req: RequestWithId, res: Response) => {
  const parsed = MessageSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })

  const auth = req.auth!
  const conv = await ConversationModel.findById(req.params.id)
  if (!conv) return res.status(404).json({ error: 'Not found' })

  const message = {
    id: randomUUID(),
    senderId: auth.userId,
    content: parsed.data.content,
    createdAt: new Date()
  }
  conv.messages.push(message)
  conv.lastMessage = message
  conv.lastMessageAt = new Date()
  await conv.save()

  const redis = getRedis()
  if (redis) {
    await redis.publish(`chat:${conv.id}`, JSON.stringify(message))
  }

  const broadcastPayload = { conversationId: req.params.id, message }
  console.log('[Chat] Broadcasting message to conversation:', req.params.id)
  emitChatEvent(req.params.id, 'chat_message', broadcastPayload)
  conv.members
    .filter((memberId) => memberId !== auth.userId)
    .forEach((memberId) => {
      console.log('[Chat] Sending message to user:', memberId)
      emitUserEvent(memberId, 'chat_message', broadcastPayload)
    })

  res.status(201).json(message)
})

chatRouter.post('/:id/pin', requireAuth, async (req: RequestWithId, res: Response) => {
  const auth = req.auth!
  const conv = await ConversationModel.findById(req.params.id)
  if (!conv) return res.status(404).json({ error: 'Not found' })

  const index = conv.pinnedBy.indexOf(auth.userId)
  let pinned = false
  if (index >= 0) {
    conv.pinnedBy.splice(index, 1)
  } else {
    conv.pinnedBy.push(auth.userId)
    pinned = true
  }
  await conv.save()
  res.json({ pinned })
})

chatRouter.post('/:id/create-session', requireAuth, async (req: RequestWithId, res: Response) => {
  const auth = req.auth!
  const conv = await ConversationModel.findById(req.params.id)
  if (!conv) return res.status(404).json({ error: 'Not found' })

  const parsed = CreateSessionSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })

  const sessionDoc = await SessionModel.create({
    gameId: parsed.data.gameId,
    title: parsed.data.title || 'Partie entre amis',
    type: parsed.data.type ?? 'private',
    mode: parsed.data.mode ?? 'realtime',
    hostId: auth.userId,
    players: [
      {
        id: auth.userId,
        name: auth.displayName || auth.email || 'Vous',
        avatar: auth.handle?.slice(1, 3)?.toUpperCase(),
        isHost: true,
        status: 'ready'
      }
    ],
    options: parsed.data.options ?? {},
    maxPlayers: parsed.data.maxPlayers ?? 4,
    status: 'waiting',
    accessCode: (parsed.data.type ?? 'private') === 'private' ? generateAccessCode() : undefined
  })

  const session = toClientSession(sessionDoc)

  const inviteLink = CLIENT_BASE_URL ? `${CLIENT_BASE_URL}/uno/lobby?session=${session.id}` : null
  const codeSegment = session.accessCode ? `Code: ${session.accessCode}.` : 'Partie publique.'
  const linkSegment = inviteLink ? `Lien d'invitation: ${inviteLink}` : ''
  const systemMessage = {
    id: randomUUID(),
    senderId: auth.userId,
    content: `Partie ${session.title} cree (${session.gameId}). ${codeSegment} ${linkSegment}`.trim(),
    createdAt: new Date()
  }
  conv.messages.push(systemMessage)
  conv.lastMessage = systemMessage
  conv.lastMessageAt = new Date()
  await conv.save()

  emitChatEvent(req.params.id, 'chat_message', { conversationId: req.params.id, message: systemMessage })

  res.status(201).json({ session, message: systemMessage })
})

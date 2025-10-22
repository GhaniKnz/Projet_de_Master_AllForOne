import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import { ConversationModel } from '../models/conversation.js'
import { randomUUID } from 'crypto'
import { getRedis } from '../config/redis.js'

export const chatRouter = Router()

const CreateConversationSchema = z.object({ members: z.array(z.string()).min(1) })
const MessageSchema = z.object({ content: z.string().min(1) })

chatRouter.get('/', requireAuth, async (req, res) => {
  const auth = (req as any).auth
  const items = await ConversationModel.find({ members: auth.userId }).sort({ updatedAt: -1 }).lean()
  const mapped = items.map((item: any) => ({ id: item._id.toString(), ...item }))
  res.json({ items: mapped })
})

chatRouter.post('/', requireAuth, async (req, res) => {
  const parsed = CreateConversationSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })
  const auth = (req as any).auth
  const members = Array.from(new Set([auth.userId, ...parsed.data.members]))
  const existing = await ConversationModel.findOne({ members: { $all: members, $size: members.length } })
  if (existing) return res.json({ id: existing.id, ...existing.toObject({ versionKey: false }) })
  const conversation = await ConversationModel.create({ members })
  res.status(201).json({ id: conversation.id, ...conversation.toObject({ versionKey: false }) })
})

chatRouter.get('/:id/messages', requireAuth, async (req, res) => {
  const conv = await ConversationModel.findById(req.params.id).lean()
  if (!conv) return res.status(404).json({ error: 'Not found' })
  res.json({ items: conv.messages || [] })
})

chatRouter.post('/:id/messages', requireAuth, async (req, res) => {
  const parsed = MessageSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })
  const auth = (req as any).auth
  const conv = await ConversationModel.findById(req.params.id)
  if (!conv) return res.status(404).json({ error: 'Not found' })
  const message = {
    id: randomUUID(),
    senderId: auth.userId,
    content: parsed.data.content,
    createdAt: new Date()
  }
  conv.messages.push(message)
  await conv.save()
  const redis = getRedis()
  if (redis) {
    await redis.publish(`chat:${conv.id}`, JSON.stringify(message))
  }
  res.status(201).json(message)
})

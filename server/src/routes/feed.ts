import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { FeedPostModel } from '../models/feedPost.js'

export const feedRouter = Router()

feedRouter.get('/', async (_req, res) => {
  const items = await FeedPostModel.find().sort({ createdAt: -1 }).limit(100).lean()
  const mapped = items.map((item: any) => ({ id: item._id.toString(), ...item }))
  res.json({ items: mapped })
})

feedRouter.post('/', requireAuth, async (req, res) => {
  const auth = (req as any).auth
  const content = String(req.body?.content || '').trim()
  if (!content) return res.status(400).json({ error: 'Content required' })
  const post = await FeedPostModel.create({ authorId: auth.userId, content })
  const obj = post.toObject({ versionKey: false }) as any
  res.status(201).json({ id: obj._id.toString(), ...obj })
})


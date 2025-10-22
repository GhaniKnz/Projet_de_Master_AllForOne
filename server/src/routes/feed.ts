import { Router } from 'express'
import type { Request, Response } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { FeedPostModel } from '../models/feedPost.js'

export const feedRouter = Router()

feedRouter.get('/', async (_req: Request, res: Response) => {
  const items = await FeedPostModel.find().sort({ createdAt: -1 }).limit(100).lean()
  const mapped = items.map((item: any) => ({ id: item._id.toString(), ...item }))
  res.json({ items: mapped })
})

feedRouter.post('/', requireAuth, async (req: Request, res: Response) => {
  const auth = req.auth!
  const content = String(req.body?.content || '').trim()
  if (!content) return res.status(400).json({ error: 'Content required' })
  const post = await FeedPostModel.create({ authorId: auth.userId, content })
  const obj = post.toObject({ versionKey: false }) as any
  res.status(201).json({ id: obj._id.toString(), ...obj })
})

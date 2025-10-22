import { Router } from 'express'
import type { Request, Response } from 'express'
import { requireAuth } from '../middleware/auth.js'

export const notificationsRouter = Router()

const NOTIFS = new Map<string, any[]>()

notificationsRouter.get('/', requireAuth, (req: Request, res: Response) => {
  const auth = req.auth!
  const items = NOTIFS.get(auth.userId) || []
  res.json({ items })
})

notificationsRouter.post('/read', requireAuth, (req: Request, res: Response) => {
  const auth = req.auth!
  NOTIFS.set(auth.userId, [])
  res.json({ ok: true })
})

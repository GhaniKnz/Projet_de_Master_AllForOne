import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'

export const notificationsRouter = Router()

const NOTIFS = new Map<string, any[]>()

notificationsRouter.get('/', requireAuth, (req, res) => {
  const auth = (req as any).auth
  const items = NOTIFS.get(auth.userId) || []
  res.json({ items })
})

notificationsRouter.post('/read', requireAuth, (req, res) => {
  const auth = (req as any).auth
  NOTIFS.set(auth.userId, [])
  res.json({ ok: true })
})


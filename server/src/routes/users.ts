import { Router } from 'express'
import type { Request, Response } from 'express'
import { requireAuth } from '../middleware/auth.js'

export const usersRouter = Router()

// Demo store
const USERS = new Map<string, any>([
  ['demo-user', { id: 'demo-user', displayName: 'Demo', avatar: 'DE', xp: 1200, level: 5 }]
])

usersRouter.get('/:id', requireAuth, (req: Request<{ id: string }>, res: Response) => {
  const user = USERS.get(req.params.id)
  if (!user) return res.status(404).json({ error: 'Not found' })
  return res.json(user)
})

usersRouter.put('/:id', requireAuth, (req: Request<{ id: string }>, res: Response) => {
  const user = USERS.get(req.params.id)
  if (!user) return res.status(404).json({ error: 'Not found' })
  const updated = { ...user, ...req.body }
  USERS.set(req.params.id, updated)
  return res.json(updated)
})

usersRouter.get('/', requireAuth, (req: Request<unknown, unknown, unknown, { query?: string }>, res: Response) => {
  const q = (req.query.query as string) || ''
  const list = [...USERS.values()].filter((u) => u.displayName.toLowerCase().includes(q.toLowerCase()))
  return res.json({ items: list })
})

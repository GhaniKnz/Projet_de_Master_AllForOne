import { Router } from 'express'
import { z } from 'zod'
import { issueToken } from '../middleware/auth.js'

export const authRouter = Router()

const GoogleAuthSchema = z.object({
  code: z.string().min(1)
})

// Mock endpoint: échanges OAuth seraient faits côté serveur
authRouter.post('/google', (req, res) => {
  const parse = GoogleAuthSchema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: 'Invalid payload' })
  // Normalement: échange code -> token Google, récupération userinfo
  // Ici: on émet un JWT applicatif pour un user de démo
  const jwt = issueToken({ userId: 'demo-user', displayName: 'Demo' })
  return res.json({ accessToken: jwt })
})

authRouter.post('/refresh', (_req, res) => {
  const jwt = issueToken({ userId: 'demo-user', displayName: 'Demo' })
  return res.json({ accessToken: jwt })
})

authRouter.post('/logout', (_req, res) => {
  return res.json({ ok: true })
})


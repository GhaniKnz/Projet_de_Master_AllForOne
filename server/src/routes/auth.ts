import { Router } from 'express'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { issueToken } from '../middleware/auth.js'

export const authRouter = Router()

const GoogleAuthSchema = z.object({
  code: z.string().min(1)
})

// Mock endpoint: OAuth exchange would normally be handled server-side.
authRouter.post('/google', (req: Request, res: Response) => {
  const parse = GoogleAuthSchema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: 'Invalid payload' })
  // Normally: exchange code -> Google token, retrieve user information.
  const jwt = issueToken({ userId: 'demo-user', displayName: 'Demo' })
  return res.json({ accessToken: jwt })
})

authRouter.post('/refresh', (_req: Request, res: Response) => {
  const jwt = issueToken({ userId: 'demo-user', displayName: 'Demo' })
  return res.json({ accessToken: jwt })
})

authRouter.post('/logout', (_req: Request, res: Response) => {
  return res.json({ ok: true })
})

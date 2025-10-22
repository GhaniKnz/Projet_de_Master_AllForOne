import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export type AuthPayload = { userId: string; displayName?: string }

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''
    if (!token) return res.status(401).json({ error: 'Missing token' })
    const secret = process.env.JWT_SECRET || 'dev-secret'
    const payload = jwt.verify(token, secret) as AuthPayload
    ;(req as any).auth = payload
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

export function issueToken(payload: AuthPayload) {
  const secret = process.env.JWT_SECRET || 'dev-secret'
  return jwt.sign(payload, secret, { expiresIn: '1h' })
}


import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export type AuthPayload = {
  userId: string
  displayName?: string
  email?: string
  role?: 'user' | 'admin'
  handle?: string
}
export type AuthenticatedRequest = Request & { auth: AuthPayload }

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''
    if (!token) return res.status(401).json({ error: 'Missing token' })
    const secret = process.env.JWT_SECRET || 'dev-secret'
    const payload = jwt.verify(token, secret) as AuthPayload
    ;(req as AuthenticatedRequest).auth = payload
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

export function requireRole(role: 'admin') {
  return (req: Request, res: Response, next: NextFunction) => {
    const payload = (req as AuthenticatedRequest).auth
    if (!payload?.role || payload.role !== role) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    next()
  }
}

export function issueToken(payload: AuthPayload) {
  const secret = process.env.JWT_SECRET || 'dev-secret'
  return jwt.sign(payload, secret, { expiresIn: '7d' })
}

export function getAuthPayload(req: Request): AuthPayload | null {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''
    if (!token) return null
    const secret = process.env.JWT_SECRET || 'dev-secret'
    return jwt.verify(token, secret) as AuthPayload
  } catch {
    return null
  }
}

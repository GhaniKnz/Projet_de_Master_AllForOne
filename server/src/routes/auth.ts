import { Router } from 'express'
import type { Request, Response } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { OAuth2Client } from 'google-auth-library'
import { issueToken, requireAuth } from '../middleware/auth.js'
import { UserModel } from '../models/user.js'
import type { AuthenticatedRequest } from '../middleware/auth.js'

export const authRouter = Router()

const RegisterSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
  displayName: z.string().min(2).max(50)
})

const LoginSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1)
})

const GoogleAuthSchema = z.object({
  idToken: z.string().min(10)
})

const ForgotPasswordSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase())
})

const ResetPasswordSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(128)
})

const oauthClient =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID.length > 0
    ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
    : null

function buildHandle(base: string) {
  const normalized = base
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 15)
  const suffix = crypto.randomBytes(3).toString('hex')
  return `@${normalized || 'player'}${suffix}`
}

function toPublicUser(user: any) {
  return {
    id: user.username,
    email: user.email,
    displayName: user.displayName,
    handle: user.handle,
    avatarUrl: user.avatarUrl,
    bannerUrl: user.bannerUrl,
    bio: user.bio,
    role: user.role,
    xp: user.xp,
    level: user.level,
    stats: user.stats,
    friends: user.friends
  }
}

authRouter.post('/register', async (req: Request, res: Response) => {
  const parsed = RegisterSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload' })
  }

  const { email, password, displayName } = parsed.data
  const existing = await UserModel.findOne({ email })
  if (existing) {
    return res.status(409).json({ error: 'Email already in use' })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const username = crypto.randomUUID()
  const handle = buildHandle(displayName)

  const user = await UserModel.create({
    username,
    email,
    passwordHash,
    displayName,
    handle,
    role: 'user'
  })

  const token = issueToken({
    userId: user.username,
    displayName: user.displayName,
    email: user.email,
    role: user.role,
    handle: user.handle
  })

  return res.status(201).json({ accessToken: token, user: toPublicUser(user) })
})

authRouter.post('/login', async (req: Request, res: Response) => {
  const parsed = LoginSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })

  const { email, password } = parsed.data
  const user = await UserModel.findOne({ email })
  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const isValid = await bcrypt.compare(password, user.passwordHash)
  if (!isValid) return res.status(401).json({ error: 'Invalid credentials' })

  const token = issueToken({
    userId: user.username,
    displayName: user.displayName,
    email: user.email,
    role: user.role,
    handle: user.handle
  })

  return res.json({ accessToken: token, user: toPublicUser(user) })
})

authRouter.post('/google', async (req: Request, res: Response) => {
  if (!oauthClient) {
    return res.status(503).json({ error: 'Google authentication not configured' })
  }
  const parsed = GoogleAuthSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })
  try {
    const ticket = await oauthClient.verifyIdToken({
      idToken: parsed.data.idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    })
    const payload = ticket.getPayload()
    if (!payload?.email || !payload.sub) {
      return res.status(400).json({ error: 'Google token missing email or sub' })
    }

    const email = payload.email.toLowerCase()
    let user = await UserModel.findOne({ email })
    if (!user) {
      const username = crypto.randomUUID()
      const displayName = payload.name || payload.given_name || 'Player'
      const handle = buildHandle(displayName)
      user = await UserModel.create({
        username,
        email,
        displayName,
        handle,
        avatarUrl: payload.picture,
        providers: [
          { provider: 'google', providerId: payload.sub, email }
        ]
      })
    } else {
      const hasProvider = user.providers.some(
        (provider) => provider.provider === 'google' && provider.providerId === payload.sub
      )
      if (!hasProvider) {
        user.providers.push({ provider: 'google', providerId: payload.sub, email })
        await user.save()
      }
    }

    const token = issueToken({
      userId: user.username,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      handle: user.handle
    })

    return res.json({ accessToken: token, user: toPublicUser(user) })
  } catch (err) {
    console.error('Google auth failed', err)
    return res.status(401).json({ error: 'Invalid Google token' })
  }
})

authRouter.post('/forgot-password', async (req: Request, res: Response) => {
  const parsed = ForgotPasswordSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })

  const user = await UserModel.findOne({ email: parsed.data.email })
  if (!user) {
    return res.json({ ok: true })
  }

  const token = crypto.randomBytes(32).toString('hex')
  user.resetToken = token
  user.resetTokenExpires = new Date(Date.now() + 1000 * 60 * 30) // 30 minutes
  await user.save()

  console.log('Password reset token for', user.email, token)
  return res.json({ ok: true })
})

authRouter.post('/reset-password', async (req: Request, res: Response) => {
  const parsed = ResetPasswordSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })

  const user = await UserModel.findOne({
    resetToken: parsed.data.token,
    resetTokenExpires: { $gt: new Date() }
  })
  if (!user) return res.status(400).json({ error: 'Invalid or expired token' })

  user.passwordHash = await bcrypt.hash(parsed.data.password, 10)
  user.resetToken = undefined
  user.resetTokenExpires = undefined
  await user.save()

  return res.json({ ok: true })
})

authRouter.post('/refresh', requireAuth, (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth
  const token = issueToken({
    userId: auth.userId,
    displayName: auth.displayName,
    email: auth.email,
    role: auth.role,
    handle: auth.handle
  })
  return res.json({ accessToken: token })
})

authRouter.post('/logout', (_req: Request, res: Response) => {
  return res.json({ ok: true })
})

authRouter.get('/me', requireAuth, async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth
  const user = await UserModel.findOne({ username: auth.userId }).lean()
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json({ user: toPublicUser(user) })
})

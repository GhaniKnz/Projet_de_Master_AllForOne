import mongoose, { Schema, Document } from 'mongoose'

export interface GameStats {
  gamesPlayed: number
  wins: number
  losses: number
  cardsPlayed: number
  unoCalls: number
  lastPlayedAt?: Date
}

export interface UserDocument extends Document {
  username: string
  email: string
  passwordHash?: string
  role: 'user' | 'admin'
  displayName: string
  handle: string
  avatarUrl?: string
  bannerUrl?: string
  bio?: string
  friends: string[]
  blocks: string[]
  xp: number
  level: number
  stats: {
    wins: number
    losses: number
  }
  gameStats: Map<string, GameStats>
  currentWinStreak: number
  bestWinStreak: number
  favoriteGame?: string
  totalGamesPlayed: number
  providers: Array<{
    provider: 'google'
    providerId: string
    email: string
  }>
  resetToken?: string
  resetTokenExpires?: Date
  createdAt: Date
  updatedAt: Date
}

const StatsSchema = new Schema(
  {
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 }
  },
  { _id: false }
)

const GameStatsSchema = new Schema(
  {
    gamesPlayed: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    cardsPlayed: { type: Number, default: 0 },
    unoCalls: { type: Number, default: 0 },
    lastPlayedAt: { type: Date }
  },
  { _id: false }
)

const ProviderSchema = new Schema(
  {
    provider: { type: String, enum: ['google'], required: true },
    providerId: { type: String, required: true },
    email: { type: String, required: true }
  },
  { _id: false }
)

const UserSchema = new Schema<UserDocument>(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    displayName: { type: String, required: true },
    handle: { type: String, required: true, unique: true },
    avatarUrl: String,
    bannerUrl: String,
    bio: String,
    friends: { type: [String], default: [] },
    blocks: { type: [String], default: [] },
    xp: { type: Number, default: 0, index: true },
    level: { type: Number, default: 1 },
    stats: { type: StatsSchema, default: () => ({}) },
    gameStats: { type: Map, of: GameStatsSchema, default: () => new Map() },
    currentWinStreak: { type: Number, default: 0 },
    bestWinStreak: { type: Number, default: 0 },
    favoriteGame: { type: String },
    totalGamesPlayed: { type: Number, default: 0 },
    providers: { type: [ProviderSchema], default: [] },
    resetToken: String,
    resetTokenExpires: Date
  },
  { timestamps: true }
)

export const UserModel = mongoose.model<UserDocument>('User', UserSchema)

export async function ensureUser(payload: {
  username: string
  email: string
  displayName: string
  handle?: string
  avatarUrl?: string
  bannerUrl?: string
  bio?: string
  xp?: number
  level?: number
  role?: 'user' | 'admin'
}) {
  const existing = await UserModel.findOne({ username: payload.username })
  if (existing) {
    let updated = false
    if (!existing.email && payload.email) {
      existing.email = payload.email
      updated = true
    }
    if (!existing.displayName && payload.displayName) {
      existing.displayName = payload.displayName
      updated = true
    }
    if (!existing.handle || existing.handle === payload.username) {
      existing.handle = payload.handle ?? `@${payload.username}`
      updated = true
    }
    if (payload.role && existing.role !== payload.role) {
      existing.role = payload.role
      updated = true
    }
    if (updated) await existing.save()
    return existing
  }
  return UserModel.create({
    username: payload.username,
    email: payload.email,
    displayName: payload.displayName,
    handle: payload.handle ?? `@${payload.username}`,
    avatarUrl: payload.avatarUrl,
    bannerUrl: payload.bannerUrl,
    bio: payload.bio,
    xp: payload.xp ?? 0,
    level: payload.level ?? 1,
    role: payload.role ?? 'user'
  })
}

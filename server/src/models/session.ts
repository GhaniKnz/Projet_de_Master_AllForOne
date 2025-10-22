import mongoose, { Schema, Document, Types } from 'mongoose'

type PlayerDocument = {
  id: string
  name: string
  avatar?: string
  isHost?: boolean
  isBot?: boolean
  status: 'waiting' | 'ready' | 'playing'
}

export interface SessionDocument extends Document {
  gameId: string
  title: string
  type: 'public' | 'private' | 'ranked'
  mode: 'realtime' | 'turn-based'
  status: 'waiting' | 'in-game' | 'completed'
  maxPlayers: number
  hostId: string
  players: PlayerDocument[]
  options: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
  accessCode?: string
}

const PlayerSchema = new Schema<PlayerDocument>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    avatar: String,
    isHost: { type: Boolean, default: false },
    isBot: { type: Boolean, default: false },
    status: { type: String, enum: ['waiting', 'ready', 'playing'], default: 'waiting' }
  },
  { _id: false }
)

const SessionSchema = new Schema<SessionDocument>(
  {
    gameId: { type: String, required: true },
    title: { type: String, required: true },
    type: { type: String, enum: ['public', 'private', 'ranked'], default: 'public' },
    mode: { type: String, enum: ['realtime', 'turn-based'], default: 'realtime' },
    status: { type: String, enum: ['waiting', 'in-game', 'completed'], default: 'waiting' },
    maxPlayers: { type: Number, default: 4 },
    hostId: { type: String, required: true },
    players: { type: [PlayerSchema], default: [] },
    options: { type: Schema.Types.Mixed, default: {} },
    accessCode: { type: String }
  },
  { timestamps: true }
)

export const SessionModel = mongoose.model<SessionDocument>('Session', SessionSchema)

export function toClientSession(doc: SessionDocument) {
  const obj = doc.toObject({ versionKey: false }) as any
  const id = (doc._id as Types.ObjectId).toString()
  delete obj._id
  return {
    id,
    ...obj
  }
}

import mongoose, { Schema, Document } from 'mongoose'

type Message = {
  id: string
  senderId: string
  content: string
  createdAt: Date
}

export interface ConversationDocument extends Document {
  type: 'dm' | 'group'
  title?: string
  createdBy: string
  members: string[]
  pinnedBy: string[]
  messages: Message[]
  lastMessage?: Message | null
  lastMessageAt: Date
  createdAt: Date
  updatedAt: Date
}

const MessageSchema = new Schema<Message>(
  {
    id: { type: String, required: true },
    senderId: { type: String, required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
)

const ConversationSchema = new Schema<ConversationDocument>(
  {
    type: { type: String, enum: ['dm', 'group'], default: 'dm' },
    title: { type: String },
    createdBy: { type: String, required: true },
    members: { type: [String], required: true },
    pinnedBy: { type: [String], default: [] },
    messages: { type: [MessageSchema], default: [] },
    lastMessage: { type: MessageSchema, default: null },
    lastMessageAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
)

ConversationSchema.index({ members: 1 })
ConversationSchema.index({ lastMessageAt: -1 })
ConversationSchema.index({ type: 1 })

export const ConversationModel = mongoose.model<ConversationDocument>('Conversation', ConversationSchema)

import mongoose, { Schema, Document } from 'mongoose'

type Message = {
  id: string
  senderId: string
  content: string
  createdAt: Date
}

export interface ConversationDocument extends Document {
  members: string[]
  messages: Message[]
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
    members: { type: [String], required: true },
    messages: { type: [MessageSchema], default: [] }
  },
  { timestamps: true }
)

export const ConversationModel = mongoose.model<ConversationDocument>('Conversation', ConversationSchema)


import mongoose, { Schema, Document } from 'mongoose'

export interface FeedPostDocument extends Document {
  authorId: string
  content: string
  likes: number
  createdAt: Date
  updatedAt: Date
}

const FeedPostSchema = new Schema<FeedPostDocument>(
  {
    authorId: { type: String, required: true },
    content: { type: String, required: true },
    likes: { type: Number, default: 0 }
  },
  { timestamps: true }
)

export const FeedPostModel = mongoose.model<FeedPostDocument>('FeedPost', FeedPostSchema)


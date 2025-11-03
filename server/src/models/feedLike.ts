import mongoose, { Schema, Document } from 'mongoose'

export interface FeedLikeDocument extends Document {
  postId: string
  userId: string
  createdAt: Date
}

const FeedLikeSchema = new Schema<FeedLikeDocument>(
  {
    postId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

FeedLikeSchema.index({ postId: 1, userId: 1 }, { unique: true })

export const FeedLikeModel = mongoose.model<FeedLikeDocument>('FeedLike', FeedLikeSchema)

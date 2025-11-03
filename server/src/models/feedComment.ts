import mongoose, { Schema, Document } from 'mongoose'

export interface FeedCommentDocument extends Document {
  postId: string
  authorId: string
  content: string
  createdAt: Date
  updatedAt: Date
}

const FeedCommentSchema = new Schema<FeedCommentDocument>(
  {
    postId: { type: String, required: true, index: true },
    authorId: { type: String, required: true, index: true },
    content: { type: String, required: true, trim: true }
  },
  { timestamps: true }
)

FeedCommentSchema.index({ postId: 1, createdAt: -1 })

export const FeedCommentModel = mongoose.model<FeedCommentDocument>('FeedComment', FeedCommentSchema)

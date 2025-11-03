import mongoose, { Schema, Document } from 'mongoose'

export type FeedMedia = {
  url: string
  type: 'image' | 'video'
  width?: number
  height?: number
  durationMs?: number
}

export interface FeedPostDocument extends Document {
  authorId: string
  content: string
  media: FeedMedia[]
  repostOf?: string
  likesCount: number
  commentsCount: number
  createdAt: Date
  updatedAt: Date
}

const FeedMediaSchema = new Schema<FeedMedia>(
  {
    url: { type: String, required: true },
    type: { type: String, enum: ['image', 'video'], required: true },
    width: Number,
    height: Number,
    durationMs: Number
  },
  { _id: false }
)

const FeedPostSchema = new Schema<FeedPostDocument>(
  {
    authorId: { type: String, required: true, index: true },
    content: { type: String, required: true, trim: true },
    media: { type: [FeedMediaSchema], default: [] },
    repostOf: { type: Schema.Types.ObjectId, ref: 'FeedPost', index: true },
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 }
  },
  { timestamps: true }
)

FeedPostSchema.index({ createdAt: -1 })

export const FeedPostModel = mongoose.model<FeedPostDocument>('FeedPost', FeedPostSchema)

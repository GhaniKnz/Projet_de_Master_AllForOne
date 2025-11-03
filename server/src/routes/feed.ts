import { Router } from 'express'
import type { Request, Response } from 'express'
import { Types } from 'mongoose'
import { requireAuth, getAuthPayload } from '../middleware/auth.js'
import { FeedPostModel } from '../models/feedPost.js'
import { FeedLikeModel } from '../models/feedLike.js'
import { FeedCommentModel } from '../models/feedComment.js'
import { UserModel } from '../models/user.js'
import { emitFeedEvent } from '../realtime/events.js'
import { awardXp } from '../services/xp.js'

export const feedRouter = Router()

const MAX_LIMIT = 50
type LeanFeedPost = {
  _id: Types.ObjectId
  authorId: string
  content: string
  media: any[]
  repostOf?: Types.ObjectId
  likesCount: number
  commentsCount: number
  createdAt: Date
  updatedAt: Date
}
type LeanFeedComment = {
  _id: Types.ObjectId
  postId: string
  authorId: string
  content: string
  createdAt: Date
  updatedAt: Date
}

feedRouter.get('/', async (req: Request, res: Response) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), MAX_LIMIT)
  const cursor = typeof req.query.cursor === 'string' && req.query.cursor ? req.query.cursor : null
  const filter = cursor && Types.ObjectId.isValid(cursor) ? { _id: { $lt: new Types.ObjectId(cursor) } } : {}

  const docs = (await FeedPostModel.find(filter).sort({ _id: -1 }).limit(limit + 1).lean()) as unknown as LeanFeedPost[]
  const hasNext = docs.length > limit
  if (hasNext) docs.pop()

  const viewer = getAuthPayload(req)
  let likedIds = new Set<string>()
  if (viewer && docs.length) {
    const ids = docs.map((doc) => doc._id.toString())
    const likes = await FeedLikeModel.find({ postId: { $in: ids }, userId: viewer.userId }).lean()
    likedIds = new Set(likes.map((like) => like.postId))
  }

  const authorIds = Array.from(new Set(docs.map((doc) => doc.authorId)))
  const authors = await UserModel.find({ username: { $in: authorIds } }).lean()
  const authorMap = new Map(
    authors.map((author) => [
      author.username,
      {
        id: author.username,
        displayName: author.displayName,
        handle: author.handle,
        avatarUrl: author.avatarUrl,
        level: author.level
      }
    ])
  )

  const items = docs.map((doc) => ({
    id: doc._id.toString(),
    authorId: doc.authorId,
    author: authorMap.get(doc.authorId) ?? null,
    content: doc.content,
    media: doc.media,
    repostOf: doc.repostOf ? doc.repostOf.toString() : undefined,
    likesCount: doc.likesCount,
    commentsCount: doc.commentsCount,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    viewerHasLiked: likedIds.has(doc._id.toString())
  }))

  res.json({
    items,
    nextCursor: hasNext ? items[items.length - 1]?.id ?? null : null
  })
})

feedRouter.post('/', requireAuth, async (req: Request, res: Response) => {
  const auth = req.auth!
  const content = String(req.body?.content || '').trim()
  if (!content && !Array.isArray(req.body?.media)) {
    return res.status(400).json({ error: 'Content or media required' })
  }

  const mediaInput = Array.isArray(req.body?.media) ? req.body.media.slice(0, 4) : []
  const media = mediaInput
    .map((item: any) => ({
      url: typeof item?.url === 'string' ? item.url : null,
      type: item?.type === 'video' ? 'video' : 'image',
      width: typeof item?.width === 'number' ? item.width : undefined,
      height: typeof item?.height === 'number' ? item.height : undefined,
      durationMs: typeof item?.durationMs === 'number' ? item.durationMs : undefined
    }))
    .filter((item: { url: string | null }) => item.url) as any[]

  const post = await FeedPostModel.create({
    authorId: auth.userId,
    content,
    media
  })

  const postId = (post._id as Types.ObjectId).toString()
  const author = await UserModel.findOne({ username: auth.userId }).lean()
  await awardXp(auth.userId, 5, 'feed_post')

  const payload = {
    id: postId,
    authorId: post.authorId,
    author: author
      ? {
          id: author.username,
          displayName: author.displayName,
          handle: author.handle,
          avatarUrl: author.avatarUrl,
          level: author.level
        }
      : null,
    content: post.content,
    media: post.media,
    likesCount: post.likesCount,
    commentsCount: post.commentsCount,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt
  }

  emitFeedEvent('FEED_POSTED', payload)

  res.status(201).json(payload)
})

feedRouter.post('/:postId/repost', requireAuth, async (req: Request<{ postId: string }>, res: Response) => {
  const auth = req.auth!
  const { postId } = req.params
  if (!Types.ObjectId.isValid(postId)) return res.status(400).json({ error: 'Invalid post id' })
  const original = await FeedPostModel.findById(postId).lean()
  if (!original) return res.status(404).json({ error: 'Not found' })

  const note = typeof req.body?.content === 'string' ? String(req.body.content).trim().slice(0, 280) : ''

  const repost = await FeedPostModel.create({
    authorId: auth.userId,
    content: note,
    media: [],
    repostOf: postId
  })

  await awardXp(auth.userId, 3, 'feed_repost')

  const author = await UserModel.findOne({ username: auth.userId }).lean()
  const responsePayload = {
    id: (repost._id as Types.ObjectId).toString(),
    authorId: repost.authorId,
    author: author
      ? {
          id: author.username,
          displayName: author.displayName,
          handle: author.handle,
          avatarUrl: author.avatarUrl,
          level: author.level
        }
      : null,
    content: repost.content,
    media: [],
    repostOf: postId,
    likesCount: 0,
    commentsCount: 0,
    createdAt: repost.createdAt,
    updatedAt: repost.updatedAt,
    viewerHasLiked: false
  }

  emitFeedEvent('FEED_POSTED', responsePayload)

  res.status(201).json(responsePayload)
})

feedRouter.post('/:postId/like', requireAuth, async (req: Request, res: Response) => {
  const auth = req.auth!
  const { postId } = req.params
  if (!Types.ObjectId.isValid(postId)) return res.status(400).json({ error: 'Invalid post id' })

  const existing = await FeedLikeModel.findOne({ postId, userId: auth.userId })
  let liked: boolean
  if (existing) {
    await existing.deleteOne()
    await FeedPostModel.updateOne({ _id: postId }, { $inc: { likesCount: -1 } }).exec()
    liked = false
  } else {
    try {
      await FeedLikeModel.create({ postId, userId: auth.userId })
      await FeedPostModel.updateOne({ _id: postId }, { $inc: { likesCount: 1 } }).exec()
      liked = true
    } catch (err: any) {
      if (err.code === 11000) {
        liked = true
      } else {
        throw err
      }
    }
  }

  const fresh = await FeedPostModel.findById(postId, { likesCount: 1 }).lean()
  const likesCount = fresh?.likesCount ?? 0

  emitFeedEvent('FEED_LIKED', { postId, userId: auth.userId, liked, likesCount })

  res.json({ liked, likesCount })
})

feedRouter.get('/:postId', async (req: Request, res: Response) => {
  const { postId } = req.params
  if (!Types.ObjectId.isValid(postId)) return res.status(400).json({ error: 'Invalid post id' })
  const post = await FeedPostModel.findById(postId).lean()
  if (!post) return res.status(404).json({ error: 'Not found' })
  const author = await UserModel.findOne({ username: post.authorId }).lean()

  const viewer = getAuthPayload(req)
  const viewerHasLiked = viewer
    ? Boolean(await FeedLikeModel.exists({ postId, userId: viewer.userId }))
    : false

  res.json({
    id: post._id.toString(),
    authorId: post.authorId,
    author: author
      ? {
          id: author.username,
          displayName: author.displayName,
          handle: author.handle,
          avatarUrl: author.avatarUrl,
          level: author.level
        }
      : null,
    content: post.content,
    media: post.media,
    repostOf: post.repostOf ? post.repostOf.toString() : undefined,
    likesCount: post.likesCount,
    commentsCount: post.commentsCount,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    viewerHasLiked
  })
})

feedRouter.get('/:postId/comments', async (req: Request, res: Response) => {
  const { postId } = req.params
  if (!Types.ObjectId.isValid(postId)) return res.status(400).json({ error: 'Invalid post id' })

  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), MAX_LIMIT)
  const cursor = typeof req.query.cursor === 'string' && req.query.cursor ? req.query.cursor : null
  const filter: Record<string, unknown> = { postId }
  if (cursor && Types.ObjectId.isValid(cursor)) {
    filter._id = { $lt: new Types.ObjectId(cursor) }
  }

  const docs = (await FeedCommentModel.find(filter).sort({ _id: -1 }).limit(limit + 1).lean()) as unknown as LeanFeedComment[]
  const commentAuthorIds = Array.from(new Set(docs.map((doc) => doc.authorId)))
  const commentAuthors = await UserModel.find({ username: { $in: commentAuthorIds } }).lean()
  const commentAuthorMap = new Map(
    commentAuthors.map((author) => [
      author.username,
      {
        id: author.username,
        displayName: author.displayName,
        handle: author.handle,
        avatarUrl: author.avatarUrl,
        level: author.level
      }
    ])
  )
  const hasNext = docs.length > limit
  if (hasNext) docs.pop()

  const items = docs.map((doc) => ({
    id: doc._id.toString(),
    postId: doc.postId,
    authorId: doc.authorId,
    author: commentAuthorMap.get(doc.authorId) ?? null,
    content: doc.content,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt
  }))

  res.json({ items, nextCursor: hasNext ? items[items.length - 1]?.id ?? null : null })
})

feedRouter.post('/:postId/comments', requireAuth, async (req: Request, res: Response) => {
  const auth = req.auth!
  const { postId } = req.params
  if (!Types.ObjectId.isValid(postId)) return res.status(400).json({ error: 'Invalid post id' })
  const content = String(req.body?.content || '').trim()
  if (!content) return res.status(400).json({ error: 'Content required' })

  const comment = await FeedCommentModel.create({
    postId,
    authorId: auth.userId,
    content
  })
  await FeedPostModel.updateOne({ _id: postId }, { $inc: { commentsCount: 1 } }).exec()

  const author = await UserModel.findOne({ username: auth.userId }).lean()
  await awardXp(auth.userId, 2, 'feed_comment')

  const responsePayload = {
    id: (comment._id as Types.ObjectId).toString(),
    postId: comment.postId,
    authorId: comment.authorId,
    author: author
      ? {
          id: author.username,
          displayName: author.displayName,
          handle: author.handle,
          avatarUrl: author.avatarUrl,
          level: author.level
        }
      : null,
    content: comment.content,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt
  }

  emitFeedEvent('FEED_COMMENTED', responsePayload)

  res.status(201).json(responsePayload)
})

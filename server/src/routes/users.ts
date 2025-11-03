import { Router } from 'express'
import type { Request, Response } from 'express'
import { requireAuth } from '../middleware/auth.js'
import type { AuthenticatedRequest } from '../middleware/auth.js'
import { UserModel } from '../models/user.js'
import { FeedPostModel } from '../models/feedPost.js'
import { FeedCommentModel } from '../models/feedComment.js'
import { awardXp, getProgression } from '../services/xp.js'

export const usersRouter = Router()

usersRouter.get('/me/progression', requireAuth, async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth!
  const progression = await getProgression(auth.userId)
  if (!progression) return res.status(404).json({ error: 'Not found' })
  res.json(progression)
})

usersRouter.put('/me/profile', requireAuth, async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth!
  const { displayName, avatarUrl, bannerUrl, bio } = req.body ?? {}
  const user = await UserModel.findOneAndUpdate(
    { username: auth.userId },
    {
      ...(displayName ? { displayName, handle: displayName.startsWith('@') ? displayName : `@${displayName}` } : {}),
      ...(avatarUrl ? { avatarUrl } : {}),
      ...(bannerUrl ? { bannerUrl } : {}),
      ...(typeof bio === 'string' ? { bio } : {})
    },
    { new: true }
  )
  if (!user) return res.status(404).json({ error: 'Not found' })
  res.json({
    id: user.username,
    displayName: user.displayName,
    handle: user.handle,
    avatarUrl: user.avatarUrl,
    bannerUrl: user.bannerUrl,
    bio: user.bio,
    xp: user.xp,
    level: user.level
  })
})

usersRouter.get('/me/friends', requireAuth, async (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth!
  const me = await UserModel.findOne({ username: auth.userId }).lean()
  if (!me) return res.status(404).json({ error: 'User not found' })
  if (!me.friends.length) return res.json({ items: [] })

  const friends = await UserModel.find({ username: { $in: me.friends } }).lean()
  const items = friends.map((friend) => ({
    id: friend.username,
    displayName: friend.displayName,
    handle: friend.handle,
    avatarUrl: friend.avatarUrl,
    level: friend.level
  }))
  res.json({ items })
})

usersRouter.post('/friends/:username', requireAuth, async (req: Request<{ username: string }>, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth!
  if (auth.userId === req.params.username) return res.status(400).json({ error: 'Cannot add yourself' })
  const me = await UserModel.findOne({ username: auth.userId })
  const target = await UserModel.findOne({ username: req.params.username })
  if (!me || !target) return res.status(404).json({ error: 'User not found' })
  if (!me.friends.includes(target.username)) {
    me.friends.push(target.username)
    await me.save()
    await awardXp(auth.userId, 10, 'friend_add')
  }
  res.json({ ok: true, friends: me.friends })
})

usersRouter.delete('/friends/:username', requireAuth, async (req: Request<{ username: string }>, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth!
  const me = await UserModel.findOne({ username: auth.userId })
  if (!me) return res.status(404).json({ error: 'User not found' })
  me.friends = me.friends.filter((id) => id !== req.params.username)
  await me.save()
  res.json({ ok: true, friends: me.friends })
})

usersRouter.get('/:username', async (req: Request<{ username: string }>, res: Response) => {
  const user = await UserModel.findOne({ username: req.params.username }).lean()
  if (!user) return res.status(404).json({ error: 'Not found' })

  const postsCount = await FeedPostModel.countDocuments({ authorId: user.username })
  const commentsCount = await FeedCommentModel.countDocuments({ authorId: user.username })

  return res.json({
    id: user.username,
    displayName: user.displayName,
    handle: user.handle,
    avatarUrl: user.avatarUrl,
    bannerUrl: user.bannerUrl,
    bio: user.bio,
    xp: user.xp,
    level: user.level,
    stats: user.stats,
    friends: user.friends,
    postsCount,
    commentsCount,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  })
})

usersRouter.get('/:username/activity', async (req: Request<{ username: string }>, res: Response) => {
  const { username } = req.params
  const posts = await FeedPostModel.find({ authorId: username }).sort({ createdAt: -1 }).limit(20).lean()
  const comments = await FeedCommentModel.find({ authorId: username }).sort({ createdAt: -1 }).limit(20).lean()

  const activity = [
    ...posts.map((post) => ({
      id: post._id.toString(),
      kind: 'post',
      createdAt: post.createdAt,
      content: post.content,
      media: post.media
    })),
    ...comments.map((comment) => ({
      id: comment._id.toString(),
      kind: 'comment',
      createdAt: comment.createdAt,
      content: comment.content,
      postId: comment.postId
    }))
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 40)

  res.json({ items: activity })
})

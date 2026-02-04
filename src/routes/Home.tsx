import React from 'react'
import { Link } from 'react-router-dom'
import { Heart, MessageCircle, Repeat2, Share, ImagePlus, Sparkles, RefreshCw, X } from 'lucide-react'
import Card from '../components/Card'
import FeedCommentsDrawer from '../components/FeedCommentsDrawer'
import { useFeedStore, CommentState } from '../store/feed'
import type { FeedMedia, FeedPost } from '../lib/api'

function formatRelative(date: string) {
  const delta = Date.now() - new Date(date).getTime()
  const minutes = Math.floor(delta / 60000)
  if (minutes < 1) return "A l'instant"
  if (minutes < 60) return `Il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Il y a ${hours} h`
  const days = Math.floor(hours / 24)
  return `Il y a ${days} j`
}

async function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function getImageSize(url: string) {
  return new Promise<{ width: number; height: number } | null>((resolve) => {
    const image = new Image()
    image.onload = () => resolve({ width: image.width, height: image.height })
    image.onerror = () => resolve(null)
    image.src = url
  })
}

type LocalMedia = {
  preview: string
  media: FeedMedia
}

export default function Home() {
  const posts = useFeedStore((state) => state.posts)
  const trends = useFeedStore((state) => state.trends)
  const loading = useFeedStore((state) => state.loading)
  const hasMore = useFeedStore((state) => state.hasMore)
  const error = useFeedStore((state) => state.error)
  const commentsStore = useFeedStore((state) => state.comments)
  const initialize = useFeedStore((state) => state.initialize)
  const refresh = useFeedStore((state) => state.refresh)
  const loadMore = useFeedStore((state) => state.loadMore)
  const publish = useFeedStore((state) => state.publish)
  const repost = useFeedStore((state) => state.repost)
  const toggleLike = useFeedStore((state) => state.toggleLike)
  const ensureComments = useFeedStore((state) => state.ensureComments)
  const addComment = useFeedStore((state) => state.addComment)
  const clearError = useFeedStore((state) => state.clearError)

  const [message, setMessage] = React.useState('')
  const [selectedMedia, setSelectedMedia] = React.useState<LocalMedia[]>([])
  const [activePost, setActivePost] = React.useState<FeedPost | null>(null)
  const [repostingId, setRepostingId] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const [publishing, setPublishing] = React.useState(false)

  React.useEffect(() => {
    void initialize()
  }, [initialize])

  React.useEffect(() => {
    if (!error) return
    const timer = setTimeout(() => clearError(), 4000)
    return () => clearTimeout(timer)
  }, [error, clearError])

  const commentState: CommentState | undefined = activePost ? commentsStore[activePost.id] : undefined

  const handlePublish = async () => {
    const content = message.trim()
    if (!content && selectedMedia.length === 0) return
    setPublishing(true)
    try {
      await publish(content, selectedMedia.map((item) => item.media))
      setMessage('')
      setSelectedMedia([])
    } finally {
      setPublishing(false)
    }
  }

  const handleAddMedia = () => fileInputRef.current?.click()

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) return
    const remaining = Math.max(0, 4 - selectedMedia.length)
    const toProcess = files.slice(0, remaining)
    const newMedia: LocalMedia[] = []
    for (const file of toProcess) {
      try {
        const dataUrl = await readFileAsDataUrl(file)
        const size = await getImageSize(dataUrl)
        newMedia.push({
          preview: dataUrl,
          media: {
            url: dataUrl,
            type: file.type.startsWith('video') ? 'video' : 'image',
            width: size?.width,
            height: size?.height
          }
        })
      } catch (err) {
        console.warn('Impossible de lire le fichier', err)
      }
    }
    setSelectedMedia((prev) => [...prev, ...newMedia])
    event.target.value = ''
  }

  const handleRemoveMedia = (index: number) => {
    setSelectedMedia((prev) => prev.filter((_, idx) => idx !== index))
  }

  const openComments = async (post: FeedPost) => {
    setActivePost(post)
    await ensureComments(post.id)
  }

  const handleSendComment = async (content: string) => {
    if (!activePost) return
    await addComment(activePost.id, content)
  }

  const handleRepost = async (post: FeedPost) => {
    setRepostingId(post.id)
    try {
      await repost(post.id)
    } finally {
      setRepostingId(null)
    }
  }

  const activeComments = activePost ? commentState : undefined

  return (
    <div className="space-y-4 pb-24">
      <Card className="shadow-card">
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              VO
            </span>
            <div className="flex-1 min-w-0">
              <label className="sr-only" htmlFor="new-post">
                Composer une publication
              </label>
              <textarea
                id="new-post"
                rows={2}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Quoi de neuf aujourd'hui ?"
                className="w-full resize-none border-none bg-transparent text-sm text-txt placeholder:text-muted focus:outline-none"
              />
            </div>
          </div>
            {selectedMedia.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedMedia.map((item, index) => (
                  <div key={item.preview} className="relative h-24 w-24 overflow-hidden rounded-2xl border border-border/60">
                    <img src={item.preview} alt="media" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(index)}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white focus-ring"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddMedia}
                className="flex items-center gap-1.5 rounded-xl bg-primary/10 px-2.5 py-1.5 text-xs text-primary transition hover:bg-primary/20 focus-ring"
              >
                <ImagePlus className="h-4 w-4" />
                <span className="hidden xs:inline">Media</span>
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-xl bg-panel px-2.5 py-1.5 text-xs text-muted transition hover:text-primary focus-ring"
              >
                <Sparkles className="h-4 w-4" />
                <span className="hidden xs:inline">Boost</span>
              </button>
              <button
                type="button"
                onClick={refresh}
                className="flex items-center gap-1.5 rounded-xl border border-border/60 px-2.5 py-1.5 text-xs text-muted transition hover:border-primary/50 hover:text-primary focus-ring"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishing || (!message.trim() && selectedMedia.length === 0)}
              className="rounded-xl bg-primary px-4 py-1.5 text-xs font-semibold text-white shadow-card transition hover:bg-primary/90 focus-ring disabled:cursor-not-allowed disabled:bg-primary/40"
            >
              {publishing ? '...' : 'Publier'}
            </button>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
      </Card>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">Tendances</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {trends.map((trend) => (
            <Card key={trend.id} className="bg-gradient-to-br from-surface to-primary/5">
              <p className="text-xs uppercase tracking-[0.3em] text-muted/80">En hausse {trend.growth}</p>
              <h3 className="mt-2 text-base font-semibold">{trend.title}</h3>
              <p className="text-sm text-muted">{trend.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">Fil public</h2>
        {loading && !posts.length ? (
          <Card className="flex items-center justify-center py-10 text-sm text-muted">Chargement du fil...</Card>
        ) : null}
        {posts.map((post) => (
          <article key={post.id}>
            <Card>
              <header className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Link to={`/profile/${post.author?.id ?? post.authorId}`} className="focus-ring">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
                      {post.author?.avatarUrl ? (
                        <img src={post.author.avatarUrl} alt="avatar" className="h-12 w-12 rounded-full object-cover" />
                      ) : (
                        post.author?.displayName?.slice(0, 2)?.toUpperCase() ?? '??'
                      )}
                    </span>
                  </Link>
                  <div>
                    <div className="flex items-center gap-2">
                      <Link to={`/profile/${post.author?.id ?? post.authorId}`} className="font-semibold text-txt hover:underline focus-ring">
                        {post.author?.displayName ?? 'Joueur mystere'}
                      </Link>
                      <span className="rounded-full bg-primary/10 px-2 py-[2px] text-[11px] font-semibold text-primary">
                        Niveau {post.author?.level ?? 1}
                      </span>
                    </div>
                    <p className="text-xs text-muted">
                      {post.author?.handle ?? '@inconnu'} - {formatRelative(post.createdAt)}
                    </p>
                  </div>
                </div>
              </header>
              {post.content ? <p className="mt-3 text-sm leading-relaxed text-txt">{post.content}</p> : null}
              {post.media?.length ? (
                <div className="mt-3 grid gap-2">
                  {post.media.map((media) => (
                    <img key={media.url} src={media.url} alt="media" className="w-full rounded-3xl object-cover" />
                  ))}
                </div>
              ) : null}
              {post.repostOf ? <RepostPreview postId={post.repostOf} /> : null}

              <footer className="mt-4 flex items-center justify-between text-sm text-muted">
                <button
                  type="button"
                  onClick={() => toggleLike(post.id)}
                  className={`flex items-center gap-2 rounded-2xl px-3 py-2 transition focus-ring ${
                    post.viewerHasLiked ? 'bg-primary text-white' : 'hover:bg-primary/10 hover:text-primary'
                  }`}
                  aria-pressed={post.viewerHasLiked}
                >
                  <Heart className="h-4 w-4" />
                  {post.likesCount}
                </button>
                <button
                  type="button"
                  onClick={() => openComments(post)}
                  className="flex items-center gap-2 rounded-2xl px-3 py-2 transition hover:bg-primary/10 hover:text-primary focus-ring"
                >
                  <MessageCircle className="h-4 w-4" />
                  {post.commentsCount}
                </button>
                <button
                  type="button"
                  onClick={() => handleRepost(post)}
                  className="flex items-center gap-2 rounded-2xl px-3 py-2 transition hover:bg-primary/10 hover:text-primary focus-ring disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={Boolean(repostingId) && repostingId !== post.id}
                >
                  <Repeat2 className="h-4 w-4" />
                  {repostingId === post.id ? 'Publication...' : 'Republier'}
                </button>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-2xl px-3 py-2 transition hover:bg-primary/10 hover:text-primary focus-ring"
                  disabled
                >
                  <Share className="h-4 w-4" />
                </button>
              </footer>
            </Card>
          </article>
        ))}
        {hasMore ? (
          <div className="flex justify-center">
            <button
              onClick={loadMore}
              className="rounded-2xl border border-border/60 px-4 py-2 text-sm font-semibold text-muted transition hover:border-primary/50 hover:text-primary focus-ring"
            >
              Charger plus
            </button>
          </div>
        ) : null}
      </section>

      {error ? <div className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}

      <FeedCommentsDrawer
        open={Boolean(activePost)}
        post={activePost}
        comments={activeComments}
        onClose={() => setActivePost(null)}
        onSend={handleSendComment}
        onLoadMore={() => {
          if (activePost) void ensureComments(activePost.id)
        }}
      />
    </div>
  )
}

function RepostPreview({ postId }: { postId: string }) {
  const posts = useFeedStore((state) => state.posts)
  const original = posts.find((post) => post.id === postId)
  if (!original) {
    return (
      <div className="mt-3 rounded-2xl border border-border/60 bg-panel px-4 py-3 text-sm text-muted">
        Publication originale indisponible.
      </div>
    )
  }
  return (
    <div className="mt-3 rounded-2xl border border-border/60 bg-panel px-4 py-3 text-sm text-muted">
      <p className="text-xs uppercase tracking-[0.3em] text-muted">Repost</p>
      <p className="mt-1 text-sm font-semibold text-txt">{original.author?.displayName ?? 'Joueur mystere'}</p>
      <p className="text-xs text-muted">{formatRelative(original.createdAt)}</p>
      <p className="mt-2 text-sm text-txt">{original.content}</p>
    </div>
  )
}

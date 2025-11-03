import React from 'react'
import { X, Send } from 'lucide-react'
import type { FeedPost, FeedComment } from '../lib/api'
import type { CommentState } from '../store/feed'
import Card from './Card'

type FeedCommentsDrawerProps = {
  open: boolean
  post: FeedPost | null
  comments: CommentState | undefined
  onClose: () => void
  onSend: (content: string) => Promise<void> | void
  onLoadMore: () => void
}

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

function renderComment(comment: FeedComment) {
  return (
    <li key={comment.id} className="rounded-2xl bg-panel px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {comment.author?.avatarUrl ? (
            <img src={comment.author.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
          ) : (
            comment.author?.displayName?.slice(0, 2)?.toUpperCase() ?? '??'
          )}
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-txt">{comment.author?.displayName ?? 'Joueur mystere'}</span>
            <span className="text-xs text-muted">{comment.author?.handle}</span>
            <span className="text-xs text-muted"> {formatRelative(comment.createdAt)}</span>
          </div>
          <p className="mt-1 text-sm text-txt">{comment.content}</p>
        </div>
      </div>
    </li>
  )
}

export default function FeedCommentsDrawer({
  open,
  post,
  comments,
  onClose,
  onSend,
  onLoadMore
}: FeedCommentsDrawerProps) {
  const [message, setMessage] = React.useState('')
  const [sending, setSending] = React.useState(false)
  const commentItems = React.useMemo(() => {
    if (!comments?.items?.length) return []
    const seen = new Set<string>()
    return comments.items.filter((item) => {
      if (!item.id) return true
      if (seen.has(item.id)) return false
      seen.add(item.id)
      return true
    })
  }, [comments])

  React.useEffect(() => {
    if (!open) {
      setMessage('')
      setSending(false)
    }
  }, [open])

  if (!open || !post) return null

  const handleSubmit = async () => {
    const content = message.trim()
    if (!content) return
    setSending(true)
    try {
      await onSend(content)
      setMessage('')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm md:items-center">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div className="safe-area relative flex h-[80vh] w-full max-w-2xl flex-col rounded-t-3xl border border-border/60 bg-surface shadow-soft md:h-[70vh] md:rounded-3xl">
        <header className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Commentaires</p>
            <p className="text-sm text-muted">{post.commentsCount} reponses</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-muted transition hover:bg-primary/10 hover:text-primary focus-ring">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <Card>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {post.author?.avatarUrl ? (
                  <img src={post.author.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  post.author?.displayName?.slice(0, 2)?.toUpperCase() ?? '??'
                )}
              </span>
              <div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold text-txt">{post.author?.displayName ?? 'Joueur'}</span>
                  <span className="text-xs text-muted">{post.author?.handle}</span>
                  <span className="text-xs text-muted"> {formatRelative(post.createdAt)}</span>
                </div>
                <p className="mt-2 text-sm text-txt">{post.content}</p>
                {post.media.length ? (
                  <div className="mt-3 grid gap-2">
                    {post.media.map((media) => (
                      <img key={media.url} src={media.url} alt="" className="w-full rounded-2xl object-cover" />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </Card>

          <ul className="space-y-3">
            {commentItems.length ? commentItems.map(renderComment) : <p className="text-sm text-muted">Aucun commentaire pour le moment.</p>}
          </ul>

          {comments?.hasMore ? (
            <div className="flex justify-center">
              <button
                onClick={onLoadMore}
                disabled={comments?.loading}
                className="rounded-2xl border border-border/60 px-4 py-2 text-sm font-semibold text-muted transition hover:border-primary/40 hover:text-primary focus-ring disabled:cursor-not-allowed disabled:opacity-60"
              >
                {comments?.loading ? 'Chargement...' : 'Charger plus'}
              </button>
            </div>
          ) : null}
        </div>

        <footer className="border-t border-border/60 px-5 py-4">
          <div className="flex items-end gap-3 rounded-3xl border border-border/60 bg-panel px-4 py-3">
            <textarea
              rows={2}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Repondre a la discussion..."
              className="flex-1 resize-none border-none bg-transparent text-sm text-txt placeholder:text-muted focus:outline-none"
            />
            <button
              onClick={handleSubmit}
              disabled={sending || !message.trim()}
              className="rounded-full bg-primary p-3 text-white shadow-card transition hover:bg-primary/90 focus-ring disabled:cursor-not-allowed disabled:bg-primary/40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}


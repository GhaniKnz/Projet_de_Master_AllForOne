import React from 'react'
import { Heart, MessageCircle, Repeat2, Share, ImagePlus, Sparkles } from 'lucide-react'
import Card from '../components/Card'
import { useFeedStore } from '../store/feed'

export default function Home() {
  const { posts, trends, toggleLike, addPost } = useFeedStore()
  const [message, setMessage] = React.useState('')

  const handlePublish = () => {
    const content = message.trim()
    if (!content) return
    addPost(content)
    setMessage('')
  }

  return (
    <div className="space-y-6 pb-10">
      <Card className="shadow-card">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
            VO
          </span>
          <div className="flex-1">
            <label className="sr-only" htmlFor="new-post">
              Créer une publication
            </label>
            <textarea
              id="new-post"
              rows={2}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Quoi de neuf aujourd’hui ?"
              className="w-full resize-none border-none bg-transparent text-base text-txt placeholder:text-muted focus:outline-none"
            />
            <div className="mt-4 flex items-center justify-between text-sm text-muted">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-2xl bg-primary/10 px-3 py-1.5 text-primary transition hover:bg-primary/20 focus-ring"
                >
                  <ImagePlus className="h-4 w-4" />
                  Média
                </button>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-2xl bg-panel px-3 py-1.5 text-muted transition hover:text-primary focus-ring"
                >
                  <Sparkles className="h-4 w-4" />
                  Boost
                </button>
              </div>
              <button
                type="button"
                onClick={handlePublish}
                disabled={!message.trim()}
                className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-primary/90 focus-ring disabled:cursor-not-allowed disabled:bg-muted"
              >
                Publier
              </button>
            </div>
          </div>
        </div>
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
        {posts.map((post) => (
          <article key={post.id}>
            <Card>
              <header className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
                    {post.author.avatar}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-txt">{post.author.name}</p>
                      <span className="rounded-full bg-primary/10 px-2 py-[2px] text-[11px] font-semibold text-primary">
                        Niveau {post.author.level}
                      </span>
                    </div>
                    <p className="text-xs text-muted">
                      {post.author.handle} · {post.createdAt}
                    </p>
                  </div>
                </div>
              </header>
              <p className="mt-3 text-sm leading-relaxed text-txt">{post.content}</p>
              {post.image ? <img src={post.image} alt="" className="mt-3 w-full rounded-3xl object-cover" /> : null}

              <footer className="mt-4 flex items-center justify-between text-sm text-muted">
                <button
                  type="button"
                  onClick={() => toggleLike(post.id)}
                  className={`flex items-center gap-2 rounded-2xl px-3 py-2 transition focus-ring ${
                    post.liked ? 'bg-primary text-white' : 'hover:bg-primary/10 hover:text-primary'
                  }`}
                  aria-pressed={post.liked}
                >
                  <Heart className="h-4 w-4" />
                  {post.likes}
                </button>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-2xl px-3 py-2 transition hover:bg-primary/10 hover:text-primary focus-ring"
                >
                  <MessageCircle className="h-4 w-4" />
                  {post.comments}
                </button>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-2xl px-3 py-2 transition hover:bg-primary/10 hover:text-primary focus-ring"
                >
                  <Repeat2 className="h-4 w-4" />
                  {post.shares}
                </button>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-2xl px-3 py-2 transition hover:bg-primary/10 hover:text-primary focus-ring"
                >
                  <Share className="h-4 w-4" />
                </button>
              </footer>
            </Card>
          </article>
        ))}
      </section>
    </div>
  )
}

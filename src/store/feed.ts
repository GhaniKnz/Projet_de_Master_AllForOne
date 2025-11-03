import { create } from "zustand"
import type { Socket } from "socket.io-client"
import { api, FeedPost, FeedMedia, FeedComment, isBackendConfigured, isApiError } from "../lib/api"
import { getSocket, disconnectSocket } from "../lib/socket"
import { getCurrentUser } from "../lib/api"

type Trend = {
  id: string
  title: string
  description: string
  growth: string
}

export type CommentState = {
  items: FeedComment[]
  loading: boolean
  cursor: string | null
  hasMore: boolean
  error?: string
}

type FeedState = {
  remote: boolean
  loading: boolean
  error?: string
  initialized: boolean
  posts: FeedPost[]
  trends: Trend[]
  cursor: string | null
  hasMore: boolean
  comments: Record<string, CommentState>
  socketReady: boolean
  initialize: () => Promise<void>
  refresh: () => Promise<void>
  loadMore: () => Promise<void>
  publish: (content: string, media?: FeedMedia[]) => Promise<void>
  repost: (postId: string, note?: string) => Promise<void>
  toggleLike: (postId: string) => Promise<void>
  ensureComments: (postId: string) => Promise<void>
  addComment: (postId: string, content: string) => Promise<void>
  clearError: () => void
}

const fallbackTrends: Trend[] = [
  { id: "uno", title: "#UNO", description: "2 540 joueurs en ce moment", growth: "+18%" },
  { id: "derocher", title: "#Derocher", description: "Tournoi Cascadeurs en direct", growth: "+34%" },
  { id: "no-mercy", title: "#NoMercy", description: "Nouvelles cartes devoilees", growth: "+12%" }
]

const fallbackPosts: FeedPost[] = [
  {
    id: "demo-1",
    authorId: "alex-martin",
    author: {
      id: "alex-martin",
      displayName: "Alex Martin",
      handle: "@alexm",
      avatarUrl: undefined,
      level: 12
    },
    content: "Quelqu'un pour une UNO No Mercy ? J'ai un creneau de 15 min et j'ai besoin de lancer une revanche !",
    media: [],
    likesCount: 42,
    commentsCount: 18,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    viewerHasLiked: false
  },
  {
    id: "demo-2",
    authorId: "team-galaxy",
    author: {
      id: "team-galaxy",
      displayName: "Team Galaxy",
      handle: "@teamgalaxy",
      avatarUrl: undefined,
      level: 21
    },
    content: "Tournoi Derocher ce soir a 21h30 ! XP x2 pour tous les participants et un badge exclusif a debloquer.",
    media: [],
    likesCount: 128,
    commentsCount: 64,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    viewerHasLiked: true
  },
  {
    id: "demo-3",
    authorId: "lina-om",
    author: {
      id: "lina-om",
      displayName: "Lina Om",
      handle: "@lina",
      avatarUrl: undefined,
      level: 7
    },
    content: "Premier top 10 dans le classement UNO ! Merci a l'equipe pour les matchs d'entrainement hier soir !",
    media: [
      {
        url: "https://images.unsplash.com/photo-1533237264985-ee6c93d41713?auto=format&fit=crop&w=900&q=80",
        type: "image"
      }
    ],
    likesCount: 201,
    commentsCount: 44,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    viewerHasLiked: false
  }
]

let feedSocket: Socket | null = null
let listenersRegistered = false

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  const result: T[] = []
  for (const item of items) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    result.push(item)
  }
  return result
}

function formatIncomingPost(post: FeedPost): FeedPost {
  return {
    ...post,
    viewerHasLiked: Boolean(post.viewerHasLiked)
  }
}

function connectSocket(set: (fn: any) => void, join = true) {
  if (!isBackendConfigured()) return null
  if (!feedSocket) {
    feedSocket = getSocket()
    if (feedSocket) {
      feedSocket.on("connect_error", () => {
        switchToOffline(set)
      })
    }
  }
  if (feedSocket && join) {
    if (feedSocket.connected) {
      feedSocket.emit("join_feed")
    } else {
      feedSocket.once("connect", () => {
        feedSocket?.emit("join_feed")
      })
    }
  }
  return feedSocket
}

function switchToOffline(set: (fn: any) => void) {
  disconnectSocket()
  feedSocket = null
  listenersRegistered = false
  set(() => ({
    remote: false,
    loading: false,
    initialized: true,
    posts: fallbackPosts,
    trends: fallbackTrends,
    cursor: null,
    hasMore: false,
    comments: {},
    socketReady: false
  }))
}

export const useFeedStore = create<FeedState>((set, get) => ({
  remote: isBackendConfigured(),
  loading: false,
  initialized: false,
  posts: [],
  trends: fallbackTrends,
  cursor: null,
  hasMore: false,
  comments: {},
  socketReady: false,
  async initialize() {
    if (!get().remote) {
      if (!get().initialized) {
        set({
          posts: fallbackPosts,
          trends: fallbackTrends,
          initialized: true
        })
      }
      return
    }
    set({ loading: true, error: undefined })
    try {
      const { items, nextCursor } = await api.fetchFeed(undefined, 30)
      set({
        posts: items.map(formatIncomingPost),
        cursor: nextCursor,
        hasMore: Boolean(nextCursor),
        initialized: true,
        loading: false
      })
    } catch (err: any) {
      if (isApiError(err)) {
        if (err.status === 401) {
          api.logout()
          switchToOffline(set)
          set({ error: "Connectez-vous pour afficher votre fil." })
          return
        }
        if (err.status === 0 || err.status >= 500) {
          switchToOffline(set)
          return
        }
        set({ error: err.message ?? "Impossible de recuperer le fil", loading: false })
        return
      }
      if ((err?.message || "").includes("Failed to fetch")) {
        switchToOffline(set)
        return
      }
      set({ error: err?.message ?? "Impossible de recuperer le fil", loading: false })
      return
    }

    if (!listenersRegistered) {
      const socket = connectSocket(set)
      if (socket) {
        socket.on("connect", () => {
          socket.emit("join_feed")
          set({ socketReady: true })
        })
        socket.on("FEED_POSTED", (payload: FeedPost) => {
          set((state) => ({
            posts: dedupeById([formatIncomingPost(payload), ...state.posts])
          }))
        })
        socket.on("FEED_LIKED", (payload: { postId: string; likesCount: number; liked: boolean; userId: string }) => {
          const viewer = getCurrentUser()
          set((state) => ({
            posts: state.posts.map((post) =>
              post.id === payload.postId
                ? {
                    ...post,
                    likesCount: payload.likesCount,
                    viewerHasLiked:
                      viewer && viewer.userId === payload.userId ? payload.liked : post.viewerHasLiked
                  }
                : post
            )
          }))
        })
        socket.on("FEED_COMMENTED", (payload: FeedComment) => {
          set((state) => {
            const existing = state.comments[payload.postId]
            const alreadyPresent = existing?.items?.some((item) => item.id === payload.id) ?? false
            const updatedComments = existing
              ? {
                  ...existing,
                  items: dedupeById([payload, ...existing.items]),
                  cursor: existing.cursor,
                  hasMore: existing.hasMore,
                  loading: false
                }
              : { items: [payload], cursor: null, hasMore: false, loading: false }
            return {
              posts: state.posts.map((post) =>
                post.id === payload.postId
                  ? {
                      ...post,
                      commentsCount: alreadyPresent ? post.commentsCount : post.commentsCount + 1
                    }
                  : post
              ),
              comments: { ...state.comments, [payload.postId]: updatedComments }
            }
          })
        })
        listenersRegistered = true
      }
    }
  },
  async refresh() {
    if (!get().remote) {
      set({ posts: fallbackPosts, trends: fallbackTrends })
      return
    }
    set({ loading: true })
    try {
      const { items, nextCursor } = await api.fetchFeed(undefined, 30)
      set({
        posts: items.map(formatIncomingPost),
        cursor: nextCursor,
        hasMore: Boolean(nextCursor),
        loading: false
      })
    } catch (err: any) {
      if (isApiError(err)) {
        if (err.status === 401) {
          api.logout()
          switchToOffline(set)
          set({ error: "Session expiree. Connectez-vous a nouveau.", loading: false })
          return
        }
        if (err.status === 0 || err.status >= 500) {
          switchToOffline(set)
          return
        }
        set({ error: err.message ?? "Erreur lors du rafraichissement", loading: false })
        return
      }
      if ((err?.message || "").includes("Failed to fetch")) {
        switchToOffline(set)
        return
      }
      set({ error: err?.message ?? "Erreur lors du rafraichissement", loading: false })
    }
  },
  async loadMore() {
    if (!get().remote || !get().hasMore || !get().cursor) return
    try {
      const { items, nextCursor } = await api.fetchFeed(get().cursor, 30)
      set((state) => {
        const merged = dedupeById([
          ...state.posts,
          ...items.map(formatIncomingPost)
        ])
        return {
          posts: merged,
          cursor: nextCursor,
          hasMore: Boolean(nextCursor)
        }
      })
    } catch (err: any) {
      if (isApiError(err)) {
        if (err.status === 401) {
          api.logout()
          switchToOffline(set)
          set({ error: "Connectez-vous pour continuer a parcourir le fil." })
          return
        }
        if (err.status === 0 || err.status >= 500) {
          switchToOffline(set)
          return
        }
        set({ error: err.message ?? "Impossible de charger plus de publications" })
        return
      }
      if ((err?.message || "").includes("Failed to fetch")) {
        switchToOffline(set)
        return
      }
      set({ error: err.message ?? "Impossible de charger plus de publications" })
    }
  },
  async publish(content, media) {
    if (!get().remote) return
    try {
      const payload = await api.createFeedPost({ content, media })
      set((state) => ({
        posts: dedupeById([formatIncomingPost(payload), ...state.posts])
      }))
    } catch (err: any) {
      if (isApiError(err)) {
        if (err.status === 401) {
          api.logout()
          switchToOffline(set)
          set({ error: "Connectez-vous pour publier." })
          return
        }
        if (err.status === 0 || err.status >= 500) {
          switchToOffline(set)
          return
        }
        set({ error: err.message ?? "Impossible de publier ce message" })
        return
      }
      const message = err?.message || ""
      if (message.includes("Failed to fetch")) {
        switchToOffline(set)
        return
      }
      set({ error: err?.message ?? "Impossible de publier ce message" })
    }
  },
  async repost(postId, note) {
    if (!get().remote) return
    try {
      const payload = await api.repostFeedPost(postId, note)
      set((state) => ({
        posts: dedupeById([formatIncomingPost(payload), ...state.posts])
      }))
    } catch (err: any) {
      if (isApiError(err)) {
        if (err.status === 401) {
          api.logout()
          switchToOffline(set)
          set({ error: "Connectez-vous pour republier." })
          return
        }
        if (err.status === 0 || err.status >= 500) {
          switchToOffline(set)
          return
        }
        set({ error: err.message ?? "Impossible de republier ce message" })
        return
      }
      const message = err?.message || ""
      if (message.includes("Failed to fetch")) {
        switchToOffline(set)
        return
      }
      set({ error: err?.message ?? "Impossible de republier ce message" })
    }
  },
  async toggleLike(postId) {
    if (!get().remote) return
    try {
      const result = await api.toggleFeedLike(postId)
      set((state) => ({
        posts: state.posts.map((post) =>
          post.id === postId
            ? {
                ...post,
                likesCount: result.likesCount,
                viewerHasLiked: result.liked
              }
            : post
        )
      }))
    } catch (err: any) {
      if (isApiError(err)) {
        if (err.status === 401) {
          api.logout()
          switchToOffline(set)
          set({ error: "Connectez-vous pour aimer une publication." })
          return
        }
        if (err.status === 0 || err.status >= 500) {
          switchToOffline(set)
          return
        }
        set({ error: err.message ?? "Impossible de mettre a jour le like" })
        return
      }
      const message = err?.message || ""
      if (message.includes("Failed to fetch")) {
        switchToOffline(set)
        return
      }
      set({ error: err?.message ?? "Impossible de mettre a jour le like" })
    }
  },
  async ensureComments(postId) {
    if (!get().remote) return
    const current = get().comments[postId]
    if (current && current.items.length && !current.hasMore) return
    set((state) => ({
      comments: {
        ...state.comments,
        [postId]: {
          items: current?.items ?? [],
          loading: true,
          cursor: current?.cursor ?? null,
          hasMore: current?.hasMore ?? false,
          error: undefined
        }
      }
    }))
    try {
      const { items, nextCursor } = await api.fetchFeedComments(postId, current?.cursor ?? undefined, 20)
      set((state) => ({
        comments: {
          ...state.comments,
          [postId]: {
            items: dedupeById([...(current?.items ?? []), ...items]),
            loading: false,
            cursor: nextCursor,
            hasMore: Boolean(nextCursor)
          }
        }
      }))
    } catch (err: any) {
      if (isApiError(err)) {
        if (err.status === 401) {
          api.logout()
          switchToOffline(set)
          set((state) => ({
            comments: {
              ...state.comments,
              [postId]: {
                ...(state.comments[postId] ?? { items: [], cursor: null, hasMore: false }),
                loading: false,
                error: "Connectez-vous pour voir les commentaires."
              }
            }
          }))
          return
        }
        if (err.status === 0 || err.status >= 500) {
          switchToOffline(set)
          return
        }
        set((state) => ({
          comments: {
            ...state.comments,
            [postId]: {
              ...(state.comments[postId] ?? { items: [], cursor: null, hasMore: false }),
              loading: false,
              error: err.message ?? "Impossible de charger les commentaires"
            }
          }
        }))
        return
      }
      const message = err?.message || ""
      if (message.includes("Failed to fetch")) {
        switchToOffline(set)
        return
      }
      set((state) => ({
        comments: {
          ...state.comments,
          [postId]: {
            ...(state.comments[postId] ?? { items: [], cursor: null, hasMore: false }),
            loading: false,
            error: err?.message ?? "Impossible de charger les commentaires"
          }
        }
      }))
    }
  },
  async addComment(postId, content) {
    if (!get().remote) return
    try {
      const comment = await api.createFeedComment(postId, content)
      set((state) => {
        const existing = state.comments[postId]
        const updatedComments = existing
          ? {
              ...existing,
              items: dedupeById([comment, ...existing.items]),
              loading: false
            }
          : { items: [comment], cursor: null, hasMore: false, loading: false }
        return {
          posts: state.posts.map((post) =>
            post.id === postId ? { ...post, commentsCount: post.commentsCount + 1 } : post
          ),
          comments: {
            ...state.comments,
            [postId]: updatedComments
          }
        }
      })
    } catch (err: any) {
      if (isApiError(err)) {
        if (err.status === 401) {
          api.logout()
          switchToOffline(set)
          set({ error: "Connectez-vous pour commenter." })
          return
        }
        if (err.status === 0 || err.status >= 500) {
          switchToOffline(set)
          return
        }
        set({ error: err.message ?? "Impossible de publier ce commentaire" })
        return
      }
      const message = err?.message || ""
      if (message.includes("Failed to fetch")) {
        switchToOffline(set)
        return
      }
      set({ error: err?.message ?? "Impossible de publier ce commentaire" })
    }
  },
  clearError() {
    set({ error: undefined })
  }
}))

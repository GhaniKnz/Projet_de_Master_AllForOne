const API_BASE = (import.meta as any).env?.VITE_API_URL || ''

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

const TOKEN_KEY = 'afo_token'

function getStorage(): Storage {
  try {
    return window.sessionStorage
  } catch {
    return window.localStorage
  }
}

function getToken() {
  try {
    const token = getStorage().getItem(TOKEN_KEY)
    if (token) return token
  } catch {
    // ignore storage errors
  }
  return localStorage.getItem(TOKEN_KEY) || ''
}

function setToken(token: string) {
  try {
    getStorage().setItem(TOKEN_KEY, token)
  } catch {
    localStorage.setItem(TOKEN_KEY, token)
  }
}

function clearToken() {
  try {
    getStorage().removeItem(TOKEN_KEY)
  } catch {
    // ignore
  }
  localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  status: number
  body?: any

  constructor(status: number, message: string, body?: any) {
    super(message || `Request failed with status ${status}`)
    this.status = status
    this.body = body
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

async function request<T = any>(method: HttpMethod, path: string, body?: any, auth = false): Promise<T> {
  if (!API_BASE) throw new Error('VITE_API_URL is not set')
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    })
  } catch (err: any) {
    throw new ApiError(0, err?.message || 'Network error')
  }
  if (!res.ok) {
    let payload: any
    let message = ''
    const text = await res.text().catch(() => '')
    if (text) {
      try {
        payload = JSON.parse(text)
        message = payload?.error || payload?.message || text
      } catch {
        message = text
      }
    } else {
      message = res.statusText
    }
    throw new ApiError(res.status, message, payload)
  }
  if (res.status === 204) {
    return undefined as T
  }
  return (await res.json()) as T
}

export type FeedMedia = {
  url: string
  type: 'image' | 'video'
  width?: number
  height?: number
  durationMs?: number
}

export type FeedAuthor = {
  id: string
  displayName: string
  handle: string
  avatarUrl?: string
  level: number
}

export type FeedPost = {
  id: string
  authorId: string
  author: FeedAuthor | null
  content: string
  media: FeedMedia[]
  repostOf?: string
  likesCount: number
  commentsCount: number
  createdAt: string
  updatedAt: string
  viewerHasLiked: boolean
}

export type FeedComment = {
  id: string
  postId: string
  authorId: string
  author: FeedAuthor | null
  content: string
  createdAt: string
  updatedAt: string
}

export type FriendSummary = {
  id: string
  displayName: string
  handle: string
  avatarUrl?: string
  level: number
}

export type UserProfile = {
  id: string
  email?: string
  displayName: string
  handle: string
  avatarUrl?: string
  bannerUrl?: string
  bio?: string
  xp: number
  level: number
  stats: { wins: number; losses: number }
  friends: string[]
  postsCount: number
  commentsCount: number
  createdAt: string
  updatedAt: string
}

export type ConversationSummary = {
  id: string
  type: 'dm' | 'group'
  title?: string
  members: string[]
  pinned: boolean
  lastMessage: { id: string; senderId: string; content: string; createdAt: string } | null
  lastMessageAt: string
  createdBy?: string
}

export type ChatMessage = {
  id: string
  senderId: string
  content: string
  createdAt: string
}

export type AuthUser = {
  id: string
  email: string
  displayName: string
  handle: string
  avatarUrl?: string
  bannerUrl?: string
  bio?: string
  role: 'user' | 'admin'
  xp: number
  level: number
  stats: { wins: number; losses: number }
  friends: string[]
}

export type Trophy = {
  id: string
  name: string
  description: string
  icon: string
  category: 'general' | 'uno' | 'social' | 'achievement' | 'rare' | 'legendary'
  xpReward: number
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
}

export type TrophyWithStatus = Trophy & {
  unlocked: boolean
  unlockedAt: string | null
}

export type GameEndResult = {
  ok: boolean
  xpGained: number
  totalXp: number
  level: number
  leveledUp: boolean
  currentWinStreak: number
  bestWinStreak: number
  newTrophies: Array<{ id: string; name: string; icon: string; xpReward: number }>
  progression: {
    xp: number
    level: number
    nextLevelAt: number
    progressToNext: number
    xpForNext: number
  }
}

export type GameStats = {
  gameId: string
  gamesPlayed: number
  wins: number
  losses: number
  cardsPlayed: number
  unoCalls: number
  lastPlayedAt?: string
}

export type UserDetailedStats = {
  totalGamesPlayed: number
  totalWins: number
  totalLosses: number
  winRate: string
  currentWinStreak?: number
  bestWinStreak: number
  favoriteGame?: string
  xp: number
  level: number
  gameStats: GameStats[]
  progression?: {
    xp: number
    level: number
    nextLevelAt: number
    progressToNext: number
    xpForNext: number
  }
}

type AuthResponse = {
  accessToken: string
  user: AuthUser
}

function storeAuthResponse(response: AuthResponse) {
  setToken(response.accessToken)
  return response.user
}

export const api = {
  async ensureDemoToken() {
    if (getToken()) return getToken()
    throw new Error('Authentication required')
  },
  isAuthenticated() {
    return Boolean(getToken())
  },
  logout() {
    clearToken()
    // Disconnect socket when logging out
    import('./socket').then(({ disconnectSocket }) => disconnectSocket())
  },
  register(payload: { email: string; password: string; displayName: string }) {
    return request<AuthResponse>('POST', '/api/v1/auth/register', payload).then(storeAuthResponse)
  },
  login(payload: { email: string; password: string }) {
    return request<AuthResponse>('POST', '/api/v1/auth/login', payload).then(storeAuthResponse)
  },
  loginWithGoogle(payload: { idToken: string }) {
    return request<AuthResponse>('POST', '/api/v1/auth/google', payload).then(storeAuthResponse)
  },
  refreshToken() {
    return request<{ accessToken: string }>('POST', '/api/v1/auth/refresh', {}, true).then((res) => {
      setToken(res.accessToken)
      return res.accessToken
    })
  },
  getCurrentProfile() {
    return request<{ user: AuthUser }>('GET', '/api/v1/auth/me', undefined, true).then((res) => res.user)
  },
  forgotPassword(email: string) {
    return request<{ ok: boolean }>('POST', '/api/v1/auth/forgot-password', { email })
  },
  resetPassword(payload: { token: string; password: string }) {
    return request<{ ok: boolean }>('POST', '/api/v1/auth/reset-password', payload)
  },
  // Feed
  fetchFeed(cursor?: string, limit = 20) {
    const params = new URLSearchParams()
    params.set('limit', String(limit))
    if (cursor) params.set('cursor', cursor)
    return request<{ items: FeedPost[]; nextCursor: string | null }>(
      'GET',
      `/api/v1/feed${params.toString() ? `?${params.toString()}` : ''}`
    )
  },
  createFeedPost(payload: { content: string; media?: FeedMedia[] }) {
    return request<FeedPost>('POST', '/api/v1/feed', payload, true)
  },
  repostFeedPost(postId: string, content?: string) {
    const body = content ? { content } : {}
    return request<FeedPost>('POST', `/api/v1/feed/${postId}/repost`, body, true)
  },
  toggleFeedLike(postId: string) {
    return request<{ liked: boolean; likesCount: number }>('POST', `/api/v1/feed/${postId}/like`, {}, true)
  },
  getFeedPost(postId: string) {
    return request<FeedPost>('GET', `/api/v1/feed/${postId}`)
  },
  fetchFeedComments(postId: string, cursor?: string, limit = 20) {
    const params = new URLSearchParams()
    params.set('limit', String(limit))
    if (cursor) params.set('cursor', cursor)
    return request<{ items: FeedComment[]; nextCursor: string | null }>(
      'GET',
      `/api/v1/feed/${postId}/comments${params.toString() ? `?${params.toString()}` : ''}`
    )
  },
  createFeedComment(postId: string, content: string) {
    return request<FeedComment>('POST', `/api/v1/feed/${postId}/comments`, { content }, true)
  },
  // Games
  getCatalog() {
    return request<{ items: any[] }>('GET', '/api/v1/games')
  },
  getSession(id: string) {
    return request<any>('GET', `/api/v1/sessions/${id}`)
  },
  listSessions(gameId: string) {
    const q = encodeURIComponent(gameId)
    return request<{ items: any[] }>('GET', `/api/v1/sessions?gameId=${q}`)
  },
  createSession(payload: { gameId: string; title?: string; type?: string; mode?: string; maxPlayers?: number; options?: any }) {
    return request<any>('POST', '/api/v1/sessions', payload, true)
  },
  joinSession(id: string) {
    return request<any>('POST', `/api/v1/sessions/${id}/join`, {}, true)
  },
  rejoinSession(id: string) {
    return request<any>('POST', `/api/v1/sessions/${id}/rejoin`, {}, true)
  },
  toggleReady(id: string) {
    return request<any>('POST', `/api/v1/sessions/${id}/ready`, {}, true)
  },
  startSession(id: string) {
    return request<any>('POST', `/api/v1/sessions/${id}/start`, {}, true)
  },
  updateSessionOptions(id: string, options: Record<string, unknown>) {
    return request<any>('POST', `/api/v1/sessions/${id}/options`, { options }, true)
  },
  addBotToSession(id: string, payload?: { name?: string; difficulty?: 'easy' | 'normal' | 'hard' }) {
    return request<any>('POST', `/api/v1/sessions/${id}/bots`, payload ?? {}, true)
  },
  // Users
  getUserProfile(username: string) {
    return request<UserProfile>('GET', `/api/v1/users/${username}`)
  },
  getUserActivity(username: string) {
    return request<{ items: any[] }>('GET', `/api/v1/users/${username}/activity`)
  },
  getFriends() {
    return request<{ items: FriendSummary[] }>('GET', '/api/v1/users/me/friends', undefined, true)
  },
  updateProfile(payload: { displayName?: string; avatarUrl?: string; bannerUrl?: string; bio?: string }) {
    return request<UserProfile>('PUT', '/api/v1/users/me/profile', payload, true)
  },
  addFriend(username: string) {
    return request<{ ok: boolean; friends: string[] }>('POST', `/api/v1/users/friends/${username}`, {}, true)
  },
  removeFriend(username: string) {
    return request<{ ok: boolean; friends: string[] }>('DELETE', `/api/v1/users/friends/${username}`, undefined, true)
  },
  getProgression() {
    return request<{ xp: number; level: number; nextLevelAt: number; progressToNext: number; xpForNext: number }>(
      'GET',
      '/api/v1/users/me/progression',
      undefined,
      true
    )
  },
  // Conversations / DM
  getConversations() {
    return request<{ items: ConversationSummary[] }>('GET', '/api/v1/conversations', undefined, true)
  },
  createConversation(payload: { members: string[]; title?: string }) {
    return request<ConversationSummary>('POST', '/api/v1/conversations', payload, true)
  },
  getConversationMessages(id: string) {
    return request<{ items: ChatMessage[] }>('GET', `/api/v1/conversations/${id}/messages`, undefined, true)
  },
  sendConversationMessage(id: string, content: string) {
    return request<ChatMessage>('POST', `/api/v1/conversations/${id}/messages`, { content }, true)
  },
  toggleConversationPin(id: string) {
    return request<{ pinned: boolean }>('POST', `/api/v1/conversations/${id}/pin`, {}, true)
  },
  createSessionFromConversation(id: string, payload: { gameId: string; title?: string; type?: string; mode?: string; maxPlayers?: number; options?: Record<string, unknown> }) {
    return request<{ session: any; message: ChatMessage }>('POST', `/api/v1/conversations/${id}/create-session`, payload, true)
  },
  // Trophies
  getAllTrophies() {
    return request<{ items: Trophy[] }>('GET', '/api/v1/trophies')
  },
  getMyTrophies() {
    return request<{ items: TrophyWithStatus[]; unlockedCount: number; totalCount: number }>('GET', '/api/v1/trophies/me', undefined, true)
  },
  getUserTrophies(userId: string) {
    return request<{ items: TrophyWithStatus[]; unlockedCount: number; totalCount: number }>('GET', `/api/v1/trophies/user/${userId}`)
  },
  getNewTrophies() {
    return request<{ items: Trophy[] }>('GET', '/api/v1/trophies/new', undefined, true)
  },
  unlockTrophy(trophyId: string) {
    return request<{ ok: boolean; trophy?: Trophy; xpGained: number; newXp: number; newLevel: number }>('POST', `/api/v1/trophies/unlock/${trophyId}`, {}, true)
  },
  // Game end
  endGame(payload: { gameId: string; sessionId?: string; isWinner: boolean; cardsPlayed?: number; unoCalls?: number; playerCount?: number }) {
    return request<GameEndResult>('POST', '/api/v1/trophies/game/end', payload, true)
  },
  // Stats
  getMyStats() {
    return request<UserDetailedStats>('GET', '/api/v1/trophies/stats/me', undefined, true)
  },
  getUserStats(userId: string) {
    return request<UserDetailedStats>('GET', `/api/v1/trophies/stats/user/${userId}`)
  },
  // Delete session
  deleteSession(id: string) {
    return request<{ ok: boolean }>('DELETE', `/api/v1/sessions/${id}`, undefined, true)
  }
}

export function isBackendConfigured() {
  return Boolean(API_BASE)
}

export function getStoredToken() {
  return getToken()
}

export function getCurrentUser() {
  const token = getToken()
  if (!token) return null
  try {
    const [, payload = ''] = token.split('.')
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return {
      userId: json.userId as string,
      displayName: json.displayName as string | undefined,
      email: json.email as string | undefined,
      role: json.role as 'user' | 'admin' | undefined
    }
  } catch (err) {
    return null
  }
}

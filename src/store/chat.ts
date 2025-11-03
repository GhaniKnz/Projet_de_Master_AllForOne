import { create } from 'zustand'
import type { Socket } from 'socket.io-client'
import { api, ConversationSummary, ChatMessage, isBackendConfigured, isApiError, getCurrentUser } from '../lib/api'
import { getSocket, disconnectSocket } from '../lib/socket'

const fallbackConversations: ConversationSummary[] = [
  {
    id: 'alex-demo',
    type: 'dm',
    title: 'Alex Martin',
    members: ['demo-user', 'alex-martin'],
    pinned: false,
    lastMessage: {
      id: 'm3',
      senderId: 'alex-martin',
      content: 'Parfait je cree le lobby. Hate de tester les nouvelles cartes.',
      createdAt: new Date().toISOString()
    },
    lastMessageAt: new Date().toISOString(),
    createdBy: 'alex-martin'
  },
  {
    id: 'uno-fr-demo',
    type: 'group',
    title: '#uno-fr',
    members: ['demo-user'],
    pinned: false,
    lastMessage: {
      id: 'g1',
      senderId: 'demo-user',
      content: 'Bienvenue dans le salon francophone !',
      createdAt: new Date().toISOString()
    },
    lastMessageAt: new Date().toISOString(),
    createdBy: 'demo-user'
  }
]

const fallbackMessages: Record<string, ChatMessage[]> = {
  'alex-demo': [
    { id: 'm1', senderId: 'alex-martin', content: 'Toujours partant pour No Mercy ce soir ?', createdAt: new Date().toISOString() },
    { id: 'm2', senderId: 'demo-user', content: 'Grave ! On se fait une equipe a 21h ?', createdAt: new Date().toISOString() }
  ],
  'uno-fr-demo': [
    { id: 'g1', senderId: 'uno-admin', content: 'Bienvenue dans le salon francophone !', createdAt: new Date().toISOString() }
  ]
}

let chatSocket: Socket | null = null
let chatListenersRegistered = false

function dedupeMessages(messages: ChatMessage[]): ChatMessage[] {
  const byId = new Map<string, ChatMessage>()
  for (const message of messages) {
    byId.set(message.id, message)
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )
}

function sortConversations(conversations: ConversationSummary[]): ConversationSummary[] {
  return [...conversations].sort(
    (a, b) => new Date(b.lastMessageAt ?? 0).getTime() - new Date(a.lastMessageAt ?? 0).getTime()
  )
}

type ConversationMessagesState = {
  items: ChatMessage[]
  loading: boolean
  error?: string
}

function buildOfflineMessages(): Record<string, ConversationMessagesState> {
  return Object.fromEntries(
    Object.entries(fallbackMessages).map(([key, items]) => [key, { items, loading: false }])
  )
}

function switchToOffline(set: (fn: any) => void, message?: string) {
  chatSocket = null
  chatListenersRegistered = false
  disconnectSocket()
  set((state) => ({
    remote: false,
    loading: false,
    conversations: sortConversations(fallbackConversations),
    messages: buildOfflineMessages(),
    unread: {},
    error: message ?? state.error
  }))
}

function normalizeMessage(message: ChatMessage): ChatMessage {
  const createdAt =
    typeof message.createdAt === 'string' ? message.createdAt : new Date(message.createdAt).toISOString()
  return { ...message, createdAt }
}

function applyMessageSnapshot(state: ChatState, conversationId: string, message: ChatMessage) {
  const normalized = normalizeMessage(message)
  const existingMessages = state.messages[conversationId]?.items ?? []
  const nextMessages = dedupeMessages([...existingMessages, normalized])
  const knowsConversation = state.conversations.some((conv) => conv.id === conversationId)
  const nextConversations = knowsConversation
    ? sortConversations(
        state.conversations.map((conv) =>
          conv.id === conversationId
            ? { ...conv, lastMessage: normalized, lastMessageAt: normalized.createdAt }
            : conv
        )
      )
    : state.conversations
  return {
    normalized,
    partial: {
      conversations: nextConversations,
      messages: {
        ...state.messages,
        [conversationId]: { items: nextMessages, loading: false }
      }
    }
  }
}

function ensureChatSocket(
  set: (fn: (state: ChatState) => Partial<ChatState> | void) => void,
  get: () => ChatState,
  conversationIds?: string[]
) {
  if (!isBackendConfigured()) return
  const socket = getSocket()
  if (!socket) return
  if (chatSocket && chatSocket !== socket) {
    chatListenersRegistered = false
  }
  chatSocket = socket
  if (!chatListenersRegistered) {
    socket.on('connect', () => {
      const ids = get()
        .conversations.map((conversation) => conversation.id)
        .filter(Boolean)
      if (ids.length) {
        socket.emit('join_conversations', ids)
      }
      const active = get().activeId
      if (active) {
        socket.emit('join_conversation', active)
      }
    })

    socket.on('disconnect', () => {
      chatListenersRegistered = false
    })

    socket.on('chat_message', (payload: { conversationId: string; message: ChatMessage }) => {
      if (!payload?.conversationId || !payload?.message) return
      const viewerId = getCurrentUser()?.userId
      set((state) => {
        const { normalized, partial } = applyMessageSnapshot(state, payload.conversationId, payload.message)
        const unread = { ...state.unread }
        if (state.activeId === payload.conversationId || (viewerId && normalized.senderId === viewerId)) {
          unread[payload.conversationId] = 0
        } else {
          unread[payload.conversationId] = (unread[payload.conversationId] ?? 0) + 1
        }
        return { ...partial, unread }
      })
    })

    socket.on('conversation_created', (conversation: ConversationSummary) => {
      if (!conversation) return
      set((state) => {
        if (state.conversations.some((existing) => existing.id === conversation.id)) {
          return {}
        }
        return {
          conversations: sortConversations([conversation, ...state.conversations]),
          unread: { ...state.unread, [conversation.id]: 0 }
        }
      })
      const joinedSocket = chatSocket ?? socket
      joinedSocket?.emit('join_conversation', conversation.id)
    })

    chatListenersRegistered = true
  }

  const idsToJoin = (conversationIds ?? get().conversations.map((conv) => conv.id)).filter(Boolean)
  if (idsToJoin.length) {
    socket.emit('join_conversations', idsToJoin)
  }

  return socket
}

type ChatState = {
  remote: boolean
  loading: boolean
  error?: string
  conversations: ConversationSummary[]
  messages: Record<string, ConversationMessagesState>
  unread: Record<string, number>
  activeId?: string
  initialize: () => Promise<void>
  refresh: () => Promise<void>
  loadMessages: (id: string) => Promise<void>
  sendMessage: (id: string, content: string) => Promise<void>
  togglePin: (id: string) => Promise<boolean>
  createConversation: (members: string[], title?: string) => Promise<ConversationSummary>
  createSessionFromConversation: (
    id: string,
    payload: { gameId: string; title?: string; type?: string; mode?: string; maxPlayers?: number; options?: Record<string, unknown> }
  ) => Promise<{ session: any; message: ChatMessage }>
  clearError: () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  remote: isBackendConfigured(),
  loading: false,
  conversations: [],
  messages: {},
  unread: {},
  async initialize() {
    if (!isBackendConfigured()) {
      switchToOffline(set)
      return
    }
    if (!get().remote) {
      set({ remote: true })
    }
    set({ loading: true, error: undefined })
    try {
      const res = await api.getConversations()
      const sorted = sortConversations(res.items)
      set((state) => {
        const unread = { ...state.unread }
        for (const conversation of sorted) {
          if (!(conversation.id in unread)) unread[conversation.id] = 0
        }
        return { conversations: sorted, unread, loading: false }
      })
      ensureChatSocket(set, get, sorted.map((conversation) => conversation.id))
    } catch (err: any) {
      if (isApiError(err)) {
        if (err.status === 401) {
          api.logout()
          switchToOffline(set, 'Connectez-vous pour voir vos messages.')
          return
        }
        if (err.status === 0 || err.status >= 500) {
          switchToOffline(set)
          return
        }
        set({ error: err.message ?? 'Unable to load conversations', loading: false })
        return
      }
      if ((err?.message || '').includes('Failed to fetch')) {
        switchToOffline(set)
        return
      }
      set({ error: err?.message ?? 'Unable to load conversations', loading: false })
    }
  },
  async refresh() {
    if (!isBackendConfigured()) {
      switchToOffline(set)
      return
    }
    if (!get().remote) {
      set({ remote: true })
    }
    try {
      const res = await api.getConversations()
      const sorted = sortConversations(res.items)
      set((state) => {
        const unread = { ...state.unread }
        for (const conversation of sorted) {
          if (!(conversation.id in unread)) unread[conversation.id] = 0
        }
        return { conversations: sorted, unread }
      })
      ensureChatSocket(set, get, sorted.map((conversation) => conversation.id))
    } catch (err: any) {
      if (isApiError(err)) {
        if (err.status === 401) {
          api.logout()
          switchToOffline(set, 'Connectez-vous pour rafraichir vos discussions.')
          return
        }
        if (err.status === 0 || err.status >= 500) {
          switchToOffline(set)
          return
        }
        set({ error: err.message ?? 'Unable to refresh conversations' })
        return
      }
      if ((err?.message || '').includes('Failed to fetch')) {
        switchToOffline(set)
        return
      }
      set({ error: err?.message ?? 'Unable to refresh conversations' })
    }
  },
  async loadMessages(id) {
    if (!get().remote) {
      const fallback = fallbackMessages[id]
      set((state) => ({
        messages: {
          ...state.messages,
          [id]: { items: dedupeMessages((fallback ?? []).map(normalizeMessage)), loading: false }
        },
        activeId: id,
        unread: { ...state.unread, [id]: 0 }
      }))
      return
    }
    set((state) => ({
      messages: {
        ...state.messages,
        [id]: { items: state.messages[id]?.items ?? [], loading: true }
      },
      activeId: id,
      unread: { ...state.unread, [id]: 0 }
    }))
    try {
      const res = await api.getConversationMessages(id)
      set((state) => ({
        messages: {
          ...state.messages,
          [id]: { items: dedupeMessages(res.items.map(normalizeMessage)), loading: false }
        },
        unread: { ...state.unread, [id]: 0 }
      }))
      const socket = ensureChatSocket(set, get)
      socket?.emit('join_conversation', id)
    } catch (err: any) {
      if (isApiError(err)) {
        if (err.status === 401) {
          api.logout()
          switchToOffline(set, 'Connectez-vous pour consulter vos messages.')
          return
        }
        if (err.status === 0 || err.status >= 500) {
          switchToOffline(set)
          return
        }
        set((state) => ({
          messages: {
            ...state.messages,
            [id]: {
              items: state.messages[id]?.items ?? [],
              loading: false,
              error: err.message ?? 'Unable to load messages'
            }
          }
        }))
        return
      }
      if ((err?.message || '').includes('Failed to fetch')) {
        switchToOffline(set)
        return
      }
      set((state) => ({
        messages: {
          ...state.messages,
          [id]: {
            items: state.messages[id]?.items ?? [],
            loading: false,
            error: err?.message ?? 'Unable to load messages'
          }
        }
      }))
    }
  },
  async sendMessage(id, content) {
    if (!get().remote) {
      const message: ChatMessage = {
        id: Date.now().toString(),
        senderId: 'demo-user',
        content,
        createdAt: new Date().toISOString()
      }
      set((state) => {
        const { partial } = applyMessageSnapshot(state, id, message)
        return {
          ...partial,
          unread: { ...state.unread, [id]: 0 }
        }
      })
      return
    }
    try {
      const res = await api.sendConversationMessage(id, content)
      set((state) => {
        const { partial } = applyMessageSnapshot(state, id, res)
        return {
          ...partial,
          unread: { ...state.unread, [id]: 0 }
        }
      })
      ensureChatSocket(set, get)
    } catch (err: any) {
      if (isApiError(err)) {
        if (err.status === 401) {
          api.logout()
          switchToOffline(set, 'Connectez-vous pour envoyer des messages.')
          return
        }
        if (err.status === 0 || err.status >= 500) {
          switchToOffline(set)
          return
        }
      set((state) => ({
        messages: {
          ...state.messages,
          [id]: {
            items: dedupeMessages(state.messages[id]?.items ?? []),
            loading: false,
            error: err.message ?? 'Unable to send message'
          }
        }
      }))
        return
      }
      if ((err?.message || '').includes('Failed to fetch')) {
        switchToOffline(set)
        return
      }
      set((state) => ({
        messages: {
          ...state.messages,
          [id]: {
            items: dedupeMessages(state.messages[id]?.items ?? []),
            loading: false,
            error: err?.message ?? 'Unable to send message'
          }
        }
      }))
    }
  },
  async togglePin(id) {
    if (!get().remote) {
      set((state) => ({
        conversations: state.conversations.map((conv) =>
          conv.id === id ? { ...conv, pinned: !conv.pinned } : conv
        )
      }))
      return get().conversations.find((conv) => conv.id === id)?.pinned ?? false
    }
    try {
      const res = await api.toggleConversationPin(id)
      set((state) => ({
        conversations: state.conversations.map((conv) =>
          conv.id === id ? { ...conv, pinned: res.pinned } : conv
        )
      }))
      return res.pinned
    } catch (err: any) {
      if (isApiError(err)) {
        if (err.status === 401) {
          api.logout()
          switchToOffline(set, 'Connectez-vous pour gerer vos favoris.')
          return false
        }
        if (err.status === 0 || err.status >= 500) {
          switchToOffline(set)
          return false
        }
        set({ error: err.message ?? 'Unable to update favorite status' })
        return get().conversations.find((conv) => conv.id === id)?.pinned ?? false
      }
      if ((err?.message || '').includes('Failed to fetch')) {
        switchToOffline(set)
        return false
      }
      set({ error: err?.message ?? 'Unable to update favorite status' })
      return get().conversations.find((conv) => conv.id === id)?.pinned ?? false
    }
  },
  async createConversation(members, title) {
    if (!members.length) {
      throw new Error('Aucun membre fourni')
    }
    if (!get().remote) {
      const conversation: ConversationSummary = {
        id: `offline-${Date.now()}`,
        type: members.length > 1 ? 'group' : 'dm',
        title: title ?? members.join(', '),
        members: ['demo-user', ...members],
        pinned: false,
        lastMessage: null,
        lastMessageAt: new Date().toISOString(),
        createdBy: 'demo-user'
      }
      set((state) => ({
        conversations: sortConversations([conversation, ...state.conversations]),
        unread: { ...state.unread, [conversation.id]: 0 }
      }))
      return conversation
    }
    try {
      const res = await api.createConversation({ members, title })
      set((state) => {
        const others = state.conversations.filter((conv) => conv.id !== res.id)
        return {
          conversations: sortConversations([res, ...others]),
          unread: { ...state.unread, [res.id]: 0 }
        }
      })
      ensureChatSocket(set, get, [res.id])
      return res
    } catch (err: any) {
      if (isApiError(err)) {
        if (err.status === 401) {
          api.logout()
          switchToOffline(set, 'Connectez-vous pour créer une discussion.')
          throw new Error('Authentification requise')
        }
        if (err.status === 0 || err.status >= 500) {
          switchToOffline(set)
          throw new Error('Service indisponible')
        }
        throw new Error(err.message ?? 'Impossible de créer la discussion')
      }
      if ((err?.message || '').includes('Failed to fetch')) {
        switchToOffline(set)
        throw new Error('Connexion interrompue')
      }
      throw err
    }
  },
  async createSessionFromConversation(id, payload) {
    if (!get().remote) {
      throw new Error('Session creation unavailable offline')
    }
    try {
      const res = await api.createSessionFromConversation(id, payload)
      set((state) => {
        const { partial } = applyMessageSnapshot(state, id, res.message)
        return {
          ...partial,
          unread: { ...state.unread, [id]: 0 }
        }
      })
      ensureChatSocket(set, get)
      return res
    } catch (err: any) {
      if (isApiError(err)) {
        if (err.status === 401) {
          api.logout()
          switchToOffline(set, 'Connectez-vous pour creer une partie.')
          throw new Error('Authentication required')
        }
        if (err.status === 0 || err.status >= 500) {
          switchToOffline(set)
          throw new Error('Service indisponible')
        }
        throw err
      }
      if ((err?.message || '').includes('Failed to fetch')) {
        switchToOffline(set)
        throw new Error('Connexion interrompue')
      }
      throw err
    }
  },
  clearError() {
    set({ error: undefined })
  }
}))

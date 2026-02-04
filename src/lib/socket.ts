import { io, Socket } from 'socket.io-client'
import { isBackendConfigured, getStoredToken } from './api'

let socket: Socket | null = null
let isConnecting = false
let pendingConversations: Set<string> = new Set()
let connectionErrors = 0
const MAX_CONNECTION_ERRORS = 3

// Event listeners storage
const messageListeners: Set<(payload: { conversationId: string; message: any }) => void> = new Set()
const conversationCreatedListeners: Set<(conversation: any) => void> = new Set()

function createSocket(): Socket | null {
  const base = (import.meta as any).env?.VITE_API_URL
  if (!base) {
    console.warn('[Socket] No API URL configured')
    return null
  }
  
  const token = getStoredToken()
  if (!token) {
    console.warn('[Socket] No auth token, cannot connect')
    return null
  }

  console.log('[Socket] Creating socket connection to:', base)
  
  const newSocket = io(base, {
    transports: ['websocket', 'polling'],
    auth: { token },
    autoConnect: true,
    reconnection: false,  // Disable auto-reconnection - we handle it manually
    timeout: 20000
  })

  newSocket.on('connect', () => {
    console.log('[Socket] ✅ Connected with ID:', newSocket.id)
    isConnecting = false
    connectionErrors = 0
    
    // Join any pending conversations
    if (pendingConversations.size > 0) {
      const ids = Array.from(pendingConversations)
      console.log('[Socket] Joining pending conversations:', ids.length)
      newSocket.emit('join_conversations', ids)
      pendingConversations.clear()
    }
  })

  newSocket.on('disconnect', (reason) => {
    console.log('[Socket] ❌ Disconnected:', reason)
    isConnecting = false
    
    // If server disconnected us, stop completely - user needs to re-login
    if (reason === 'io server disconnect') {
      connectionErrors++
      console.warn('[Socket] Server rejected connection. Please re-login to get a new token.')
      socket = null
      // Don't try to reconnect - the token is likely invalid
      return
    }
  })

  newSocket.on('connect_error', (error) => {
    console.warn('[Socket] Connection error:', error.message)
    isConnecting = false
    connectionErrors++
    
    if (connectionErrors >= MAX_CONNECTION_ERRORS) {
      console.warn('[Socket] Too many connection errors, stopping.')
      socket = null
    }
  })

  newSocket.on('reconnect', (attemptNumber) => {
    console.log('[Socket] Reconnected after', attemptNumber, 'attempts')
  })

  // Forward chat_message events to all registered listeners
  newSocket.on('chat_message', (payload: { conversationId: string; message: any }) => {
    console.log('[Socket] 📨 Received chat_message for conversation:', payload.conversationId)
    messageListeners.forEach(listener => {
      try {
        listener(payload)
      } catch (err) {
        console.error('[Socket] Error in message listener:', err)
      }
    })
  })

  // Forward conversation_created events
  newSocket.on('conversation_created', (conversation: any) => {
    console.log('[Socket] 📬 Received conversation_created:', conversation?.id)
    conversationCreatedListeners.forEach(listener => {
      try {
        listener(conversation)
      } catch (err) {
        console.error('[Socket] Error in conversation listener:', err)
      }
    })
  })

  return newSocket
}

export function getSocket(): Socket | null {
  if (!isBackendConfigured()) return null
  
  // Return existing connected socket
  if (socket?.connected) {
    return socket
  }
  
  // If already connecting, return the socket (will connect soon)
  if (socket && isConnecting) {
    return socket
  }
  
  // If socket exists but not connected, try to reconnect
  if (socket && !socket.connected && !isConnecting) {
    console.log('[Socket] Reconnecting existing socket...')
    isConnecting = true
    socket.connect()
    return socket
  }
  
  // Create new socket if none exists
  if (!socket) {
    isConnecting = true
    socket = createSocket()
  }
  
  return socket
}

export function disconnectSocket() {
  if (socket) {
    console.log('[Socket] Disconnecting...')
    socket.disconnect()
    socket = null
  }
  isConnecting = false
  connectionErrors = 0
  pendingConversations.clear()
}

export function reconnectSocket() {
  console.log('[Socket] Forcing reconnection...')
  disconnectSocket()
  return getSocket()
}

export function joinConversation(conversationId: string) {
  if (!conversationId) return
  
  const s = getSocket()
  if (s?.connected) {
    console.log('[Socket] Joining conversation:', conversationId)
    s.emit('join_conversation', conversationId)
  } else {
    console.log('[Socket] Queueing conversation join:', conversationId)
    pendingConversations.add(conversationId)
  }
}

export function joinConversations(conversationIds: string[]) {
  if (!conversationIds.length) return
  
  const s = getSocket()
  if (s?.connected) {
    console.log('[Socket] Joining', conversationIds.length, 'conversations')
    s.emit('join_conversations', conversationIds)
  } else {
    console.log('[Socket] Queueing', conversationIds.length, 'conversations')
    conversationIds.forEach(id => pendingConversations.add(id))
  }
}

export function leaveConversation(conversationId: string) {
  const s = getSocket()
  if (s?.connected) {
    s.emit('leave_conversation', conversationId)
  }
  pendingConversations.delete(conversationId)
}

export function onChatMessage(listener: (payload: { conversationId: string; message: any }) => void) {
  messageListeners.add(listener)
  // Ensure socket is initialized when adding listeners
  getSocket()
  return () => {
    messageListeners.delete(listener)
  }
}

export function onConversationCreated(listener: (conversation: any) => void) {
  conversationCreatedListeners.add(listener)
  // Ensure socket is initialized when adding listeners
  getSocket()
  return () => {
    conversationCreatedListeners.delete(listener)
  }
}

export function isSocketConnected(): boolean {
  return socket?.connected ?? false
}

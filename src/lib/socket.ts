import { io, Socket } from 'socket.io-client'
import { isBackendConfigured, getStoredToken } from './api'

let socket: Socket | null = null

export function getSocket(): Socket | null {
  if (!isBackendConfigured()) return null
  if (socket) return socket
  const base = (import.meta as any).env?.VITE_API_URL
  if (!base) return null
  socket = io(base, {
    transports: ['websocket'],
    auth: {
      token: getStoredToken() || undefined
    }
  })
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}


import type { Server } from 'socket.io'

let ioInstance: Server | null = null

export function bindSocketServer(io: Server) {
  ioInstance = io
}

export function emitFeedEvent<T>(event: string, payload: T) {
  if (!ioInstance) return
  ioInstance.to('feed:global').emit(event, payload)
}

export function emitChatEvent<T>(conversationId: string, event: string, payload: T) {
  if (!ioInstance) return
  ioInstance.to(`chat:${conversationId}`).emit(event, payload)
}

export function emitUserEvent<T>(userId: string, event: string, payload: T) {
  if (!ioInstance) return
  ioInstance.to(`user:${userId}`).emit(event, payload)
}

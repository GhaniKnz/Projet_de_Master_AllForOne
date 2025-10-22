import type { Server, Socket } from 'socket.io'

type JoinPayload = { sessionId: string; userId: string; displayName?: string }

export function registerSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    socket.on('join_session', (payload: JoinPayload) => {
      if (!payload?.sessionId) return
      socket.join(`game:${payload.sessionId}`)
      io.to(`game:${payload.sessionId}`).emit('player_joined', { userId: payload.userId, displayName: payload.displayName })
    })

    socket.on('leave_session', (payload: JoinPayload) => {
      if (!payload?.sessionId) return
      socket.leave(`game:${payload.sessionId}`)
      io.to(`game:${payload.sessionId}`).emit('player_left', { userId: payload.userId })
    })

    socket.on('chat_message', (data: { conversationId: string; message: any }) => {
      if (!data?.conversationId) return
      io.to(`chat:${data.conversationId}`).emit('chat_message', data.message)
    })
  })
}


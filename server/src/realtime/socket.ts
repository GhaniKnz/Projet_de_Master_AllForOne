import type { Server, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import { Types } from 'mongoose'
import type { AuthPayload } from '../middleware/auth.js'
import { ConversationModel } from '../models/conversation.js'

type JoinPayload = { sessionId: string; displayName?: string }
type AuthedSocket = Socket & { data: { userId?: string } }

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'

export function registerSocketHandlers(io: Server) {
  io.on('connection', (rawSocket: Socket) => {
    const socket = rawSocket as AuthedSocket
    const token = typeof rawSocket.handshake.auth?.token === 'string' ? rawSocket.handshake.auth.token : ''
    if (!token) {
      rawSocket.disconnect(true)
      return
    }

    try {
      const payload = jwt.verify(token, JWT_SECRET) as AuthPayload
      if (!payload?.userId) {
        rawSocket.disconnect(true)
        return
      }
      socket.data.userId = payload.userId
      socket.join(`user:${payload.userId}`)
    } catch (err) {
      rawSocket.disconnect(true)
      return
    }

    socket.on('join_session', (payload: JoinPayload) => {
      const userId = socket.data.userId
      if (!payload?.sessionId || !userId) return
      socket.join(`game:${payload.sessionId}`)
      io.to(`game:${payload.sessionId}`).emit('player_joined', { userId, displayName: payload.displayName ?? userId })
    })

    socket.on('leave_session', (payload: JoinPayload) => {
      const userId = socket.data.userId
      if (!payload?.sessionId || !userId) return
      socket.leave(`game:${payload.sessionId}`)
      io.to(`game:${payload.sessionId}`).emit('player_left', { userId })
    })

    socket.on('join_feed', () => {
      socket.join('feed:global')
    })

    socket.on('leave_feed', () => {
      socket.leave('feed:global')
    })

    socket.on('join_conversation', async (conversationId: string) => {
      const userId = socket.data.userId
      if (!conversationId || !userId) return
      if (!Types.ObjectId.isValid(conversationId)) return
      try {
        const exists = await ConversationModel.exists({ _id: conversationId, members: userId })
        if (!exists) return
        socket.join(`chat:${conversationId}`)
      } catch (err) {
        console.warn('join_conversation failed', err)
      }
    })

    socket.on('join_conversations', async (conversationIds: string[]) => {
      const userId = socket.data.userId
      if (!Array.isArray(conversationIds) || !conversationIds.length || !userId) return
      const validIds = conversationIds.filter((id) => Types.ObjectId.isValid(id))
      if (!validIds.length) return
      try {
        const allowed = await ConversationModel.find({ _id: { $in: validIds }, members: userId })
          .select('_id')
          .lean()
        for (const conv of allowed) {
          socket.join(`chat:${conv._id.toString()}`)
        }
      } catch (err) {
        console.warn('join_conversations failed', err)
      }
    })

    socket.on('leave_conversation', (conversationId: string) => {
      if (!conversationId) return
      socket.leave(`chat:${conversationId}`)
    })

    socket.on('chat_message', async (data: { conversationId: string; message: any }) => {
      const userId = socket.data.userId
      if (!data?.conversationId || !data?.message || !userId) return
      if (!Types.ObjectId.isValid(data.conversationId)) return
      try {
        const exists = await ConversationModel.exists({ _id: data.conversationId, members: userId })
        if (!exists) return
        io.to(`chat:${data.conversationId}`).emit('chat_message', { conversationId: data.conversationId, message: data.message })
      } catch (err) {
        console.warn('chat_message relay failed', err)
      }
    })
  })
}

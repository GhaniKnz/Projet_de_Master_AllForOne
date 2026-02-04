import type { Server, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import { Types } from 'mongoose'
import type { AuthPayload } from '../middleware/auth.js'
import { ConversationModel } from '../models/conversation.js'
import { SessionModel } from '../models/session.js'

type JoinPayload = { sessionId: string; displayName?: string }
type AuthedSocket = Socket & { data: { userId?: string } }

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'

export function registerSocketHandlers(io: Server) {
  io.on('connection', (rawSocket: Socket) => {
    const socket = rawSocket as AuthedSocket
    const token = typeof rawSocket.handshake.auth?.token === 'string' ? rawSocket.handshake.auth.token : ''
    console.log('[Socket] Connection attempt, token length:', token?.length || 0, 'token preview:', token?.substring(0, 30) + '...')
    if (!token) {
      console.warn('[Socket] Connection rejected: no token')
      rawSocket.disconnect(true)
      return
    }

    try {
      const payload = jwt.verify(token, JWT_SECRET) as AuthPayload
      if (!payload?.userId) {
        console.warn('[Socket] Connection rejected: invalid payload')
        rawSocket.disconnect(true)
        return
      }
      socket.data.userId = payload.userId
      socket.join(`user:${payload.userId}`)
      console.log('[Socket] ✅ User connected:', payload.userId, 'socket:', socket.id)
    } catch (err: any) {
      console.warn('[Socket] Connection rejected: token verification failed -', err.message)
      rawSocket.disconnect(true)
      return
    }

    socket.on('disconnect', (reason) => {
      console.log('[Socket] User disconnected:', socket.data.userId, 'reason:', reason)
    })

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

    // Update session activity when a player performs an action
    socket.on('game_action', async (payload: { sessionId: string; action: string }) => {
      const userId = socket.data.userId
      if (!payload?.sessionId || !userId) return
      try {
        // Update the session's updatedAt timestamp to mark activity
        await SessionModel.findByIdAndUpdate(payload.sessionId, { updatedAt: new Date() })
        // Broadcast the action to other players
        io.to(`game:${payload.sessionId}`).emit('game_action', { userId, action: payload.action })
      } catch (err) {
        console.warn('game_action update failed', err)
      }
    })

    // Join game chat
    socket.on('join_game_chat', (sessionId: string) => {
      if (!sessionId) return
      socket.join(`game_chat:${sessionId}`)
    })

    socket.on('leave_game_chat', (sessionId: string) => {
      if (!sessionId) return
      socket.leave(`game_chat:${sessionId}`)
    })

    socket.on('game_chat_message', async (data: { sessionId: string; message: any }) => {
      const userId = socket.data.userId
      if (!data?.sessionId || !data?.message || !userId) return
      // Update session activity
      try {
        await SessionModel.findByIdAndUpdate(data.sessionId, { updatedAt: new Date() })
      } catch (err) {
        // ignore
      }
      io.to(`game_chat:${data.sessionId}`).emit('game_chat_message', data.message)
    })

    socket.on('join_feed', () => {
      socket.join('feed:global')
    })

    socket.on('leave_feed', () => {
      socket.leave('feed:global')
    })

    socket.on('join_conversation', async (conversationId: string) => {
      const userId = socket.data.userId
      console.log('[Socket] join_conversation request:', conversationId, 'by user:', userId)
      if (!conversationId || !userId) return
      if (!Types.ObjectId.isValid(conversationId)) {
        console.warn('[Socket] Invalid conversationId:', conversationId)
        return
      }
      try {
        const exists = await ConversationModel.exists({ _id: conversationId, members: userId })
        if (!exists) {
          console.warn('[Socket] User not member of conversation:', conversationId)
          return
        }
        socket.join(`chat:${conversationId}`)
        console.log('[Socket] ✅ User', userId, 'joined conversation:', conversationId)
      } catch (err) {
        console.warn('join_conversation failed', err)
      }
    })

    socket.on('join_conversations', async (conversationIds: string[]) => {
      const userId = socket.data.userId
      console.log('[Socket] join_conversations request:', conversationIds?.length, 'conversations by user:', userId)
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
        console.log('[Socket] ✅ User', userId, 'joined', allowed.length, 'conversations')
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

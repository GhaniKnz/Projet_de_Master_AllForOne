import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Star, StarOff, Gamepad2, ShieldCheck } from 'lucide-react'
import ChatComposer from '../components/ChatComposer'
import Card from '../components/Card'
import { useChatStore } from '../store/chat'
import { useAppStore } from '../store/app'
import { getSocket } from '../lib/socket'

function getInitials(value: string) {
  const label = value.trim()
  if (!label) return '??'
  const parts = label.split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
}

export default function Messages() {
  const params = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAppStore((state) => ({ user: state.user }))
  const {
    conversations,
    messages,
    initialize,
    loadMessages,
    sendMessage,
    togglePin,
    createSessionFromConversation
  } = useChatStore((state) => ({
    conversations: state.conversations,
    messages: state.messages,
    initialize: state.initialize,
    loadMessages: state.loadMessages,
    sendMessage: state.sendMessage,
    togglePin: state.togglePin,
    createSessionFromConversation: state.createSessionFromConversation
  }))

  const conversationId = params.id ?? ''
  const conversation = React.useMemo(
    () => conversations.find((conv) => conv.id === conversationId),
    [conversations, conversationId]
  )
  const messageState = conversationId ? messages[conversationId] : undefined

  const listRef = React.useRef<HTMLDivElement | null>(null)
  const bottomRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (conversations.length === 0) void initialize()
  }, [conversations.length, initialize])

  React.useEffect(() => {
    if (!conversationId) return
    void loadMessages(conversationId)
  }, [conversationId, loadMessages])

  React.useEffect(() => {
    if (!conversationId) return
    const socket = getSocket()
    if (!socket) return
    
    const joinConversation = () => {
      console.log('[Messages] Joining conversation:', conversationId)
      socket.emit('join_conversation', conversationId)
    }
    
    // Si déjà connecté, joindre immédiatement
    if (socket.connected) {
      joinConversation()
    }
    
    // Écouter les reconnexions pour rejoindre à nouveau
    socket.on('connect', joinConversation)
    
    return () => {
      socket.off('connect', joinConversation)
      socket.emit('leave_conversation', conversationId)
    }
  }, [conversationId])

  React.useEffect(() => {
    if (!messageState?.items || messageState.items.length === 0) return
    const behavior = listRef.current && listRef.current.scrollHeight - listRef.current.scrollTop > 900 ? 'smooth' : 'auto'
    bottomRef.current?.scrollIntoView({ behavior, block: 'end' })
  }, [messageState?.items?.length, conversationId])

  if (!conversationId || !conversation) {
    return (
      <section className="space-y-3">
        <h1 className="text-xl font-semibold text-txt">Conversation introuvable</h1>
        <p className="text-sm text-muted">Choisissez un contact ou un salon depuis l&apos;onglet Messages.</p>
      </section>
    )
  }

  const handleCreateSession = async () => {
    try {
      const res = await createSessionFromConversation(conversationId, { gameId: 'uno', type: 'private' })
      const sessionId = res.session?.id ?? res.session?._id ?? ''
      const url = sessionId ? `/uno/lobby?session=${encodeURIComponent(sessionId)}` : '/uno/lobby'
      navigate(url, { state: { session: res.session } })
    } catch (err: any) {
      window.alert(err?.message || 'Impossible de creer la partie')
    }
  }

  const displayName = conversation.title ?? conversation.members.join(', ')
  const initials = getInitials(displayName)
  const memberCount = conversation.members.length

  return (
    <div className="flex h-[calc(100vh-96px)] flex-col gap-4 pb-24">
      <Card className="flex-shrink-0 flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
            {initials}
          </span>
          <div>
            <h1 className="text-lg font-semibold text-txt">{displayName}</h1>
            <div className="flex items-center gap-2 text-xs text-muted">
              <span>
                {memberCount} participant{memberCount > 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1 text-primary/80">
                <ShieldCheck className="h-3 w-3" />
                Chiffré
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              try {
                await togglePin(conversationId)
              } catch (err: any) {
                window.alert(err?.message ?? 'Impossible de mettre a jour les favoris')
              }
            }}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/60 bg-surface text-muted transition hover:border-primary/40 hover:text-primary focus-ring"
            aria-label={conversation.pinned ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            {conversation.pinned ? <Star className="h-4 w-4" /> : <StarOff className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={handleCreateSession}
            className="flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-card transition hover:bg-primary/90 focus-ring"
          >
            <Gamepad2 className="h-4 w-4" />
            Créer une partie
          </button>
        </div>
      </Card>

      <div
        ref={listRef}
        className="flex-1 min-h-0 overflow-y-auto rounded-3xl border border-border/60 bg-surface/70 px-4 py-6 shadow-soft backdrop-blur-sm"
      >
        {messageState?.loading ? <p className="text-sm text-muted">Chargement...</p> : null}
        {messageState?.error ? <p className="text-sm text-danger">{messageState.error}</p> : null}
        <div className="flex flex-col gap-3">
          {(messageState?.items ?? []).map((message) => {
            const isMine = user ? message.senderId === user.id : false
            const bubbleClasses = isMine
              ? 'ml-auto bg-gradient-to-br from-primary to-primary/80 text-white shadow-card'
              : 'bg-white text-txt border border-border/40'
            const time = new Date(message.createdAt).toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit'
            })
            return (
              <div key={message.id} className="flex flex-col gap-1">
                <div className={`max-w-[75%] rounded-3xl px-4 py-2 text-sm leading-relaxed ${bubbleClasses}`}>
                  <p>{message.content}</p>
                </div>
                <span className={`text-xs ${isMine ? 'ml-auto text-muted/70' : 'text-muted'}`}>{time}</span>
              </div>
            )
          })}
          {(messageState?.items?.length ?? 0) === 0 && !messageState?.loading ? (
            <p className="rounded-3xl bg-panel px-4 py-3 text-center text-sm text-muted">
              Aucun message pour le moment. Lancez la discussion !
            </p>
          ) : null}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="flex-shrink-0">
        <ChatComposer
          onSend={async (text) => {
            try {
              await sendMessage(conversationId, text)
            } catch (err: any) {
              window.alert(err?.message ?? "Impossible d'envoyer le message")
            }
          }}
        />
      </div>
    </div>
  )
}

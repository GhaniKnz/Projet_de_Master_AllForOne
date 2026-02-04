import React from 'react'
import { Send, Smile, MessageCircle, X, ChevronDown } from 'lucide-react'

type ChatMessage = {
  id: string
  senderId: string
  senderName: string
  senderAvatar: string
  content: string
  timestamp: Date
  type: 'text' | 'system' | 'emoji'
}

type GameChatProps = {
  messages: ChatMessage[]
  onSendMessage: (content: string) => void
  currentUserId: string
  isMinimized?: boolean
  onToggleMinimize?: () => void
}

const QUICK_EMOJIS = ['👍', '😂', '😮', '😭', '🎉', '🔥', '💀', '❤️']

const QUICK_MESSAGES = [
  'Bien joué !',
  'Pas de chance...',
  'UNO !',
  'À toi !',
  'GG',
  'Wow !',
  '+4 de la mort 💀',
  'Revenge !'
]

export default function GameChat({
  messages,
  onSendMessage,
  currentUserId,
  isMinimized = false,
  onToggleMinimize
}: GameChatProps) {
  const [text, setText] = React.useState('')
  const [showQuickMessages, setShowQuickMessages] = React.useState(false)
  const [unreadCount, setUnreadCount] = React.useState(0)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Scroll to bottom on new messages
  React.useEffect(() => {
    if (!isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      setUnreadCount(0)
    } else {
      setUnreadCount((prev) => prev + 1)
    }
  }, [messages.length, isMinimized])

  const handleSend = () => {
    const value = text.trim()
    if (!value) return
    onSendMessage(value)
    setText('')
    setShowQuickMessages(false)
  }

  const handleQuickMessage = (msg: string) => {
    onSendMessage(msg)
    setShowQuickMessages(false)
  }

  if (isMinimized) {
    return (
      <button
        onClick={onToggleMinimize}
        className="fixed bottom-24 right-4 z-50 flex items-center gap-2 bg-primary text-white rounded-full px-4 py-3 shadow-lg hover:bg-primary/90 transition-all animate-bounce-subtle"
      >
        <MessageCircle className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="fixed bottom-24 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] bg-surface/95 backdrop-blur-lg rounded-3xl shadow-2xl border border-border/50 overflow-hidden flex flex-col animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary/10 to-accent/10 border-b border-border/30">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          <span className="font-semibold text-txt">Chat de partie</span>
          <span className="text-xs text-muted bg-bg px-2 py-0.5 rounded-full">
            {messages.length} msg
          </span>
        </div>
        <button
          onClick={onToggleMinimize}
          className="p-1 hover:bg-bg rounded-full transition-colors"
        >
          <ChevronDown className="w-5 h-5 text-muted" />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-3 space-y-2 max-h-64 min-h-[200px] scrollbar-thin"
      >
        {messages.length === 0 && (
          <div className="text-center text-muted text-sm py-8">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Aucun message</p>
            <p className="text-xs">Discutez avec vos adversaires !</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMine = msg.senderId === currentUserId
          const isSystem = msg.type === 'system'

          if (isSystem) {
            return (
              <div key={msg.id} className="text-center">
                <span className="text-xs text-muted bg-bg/50 px-3 py-1 rounded-full">
                  {msg.content}
                </span>
              </div>
            )
          }

          return (
            <div
              key={msg.id}
              className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              {!isMine && (
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
                  {msg.senderAvatar}
                </div>
              )}

              {/* Message bubble */}
              <div
                className={`
                  max-w-[75%] px-3 py-2 rounded-2xl
                  ${isMine
                    ? 'bg-gradient-to-br from-primary to-primary/80 text-white rounded-br-md'
                    : 'bg-bg text-txt rounded-bl-md border border-border/30'
                  }
                `}
              >
                {!isMine && (
                  <p className="text-xs font-medium text-primary/80 mb-0.5">
                    {msg.senderName}
                  </p>
                )}
                <p className={`text-sm ${msg.type === 'emoji' ? 'text-2xl' : ''}`}>
                  {msg.content}
                </p>
                <p className={`text-[10px] mt-1 ${isMine ? 'text-white/60' : 'text-muted'}`}>
                  {formatTime(msg.timestamp)}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick messages */}
      {showQuickMessages && (
        <div className="px-3 py-2 border-t border-border/30 bg-bg/50">
          <div className="flex flex-wrap gap-1 mb-2">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleQuickMessage(emoji)}
                className="text-xl hover:scale-125 transition-transform p-1"
              >
                {emoji}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {QUICK_MESSAGES.map((msg) => (
              <button
                key={msg}
                onClick={() => handleQuickMessage(msg)}
                className="text-xs bg-surface border border-border/50 px-2 py-1 rounded-full hover:border-primary/50 hover:text-primary transition-colors"
              >
                {msg}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-border/30 bg-surface">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowQuickMessages(!showQuickMessages)}
            className={`p-2 rounded-full transition-colors ${
              showQuickMessages ? 'bg-primary/10 text-primary' : 'text-muted hover:text-primary'
            }`}
          >
            <Smile className="w-5 h-5" />
          </button>

          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Message..."
            className="flex-1 bg-bg border border-border/50 rounded-full px-4 py-2 text-sm text-txt placeholder:text-muted focus:outline-none focus:border-primary/50"
          />

          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="p-2 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

import React from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageSquarePlus, Search, Users, Flame, Star, StarOff } from 'lucide-react'
import Tabs from '../components/Tabs'
import Card from '../components/Card'
import ActionSheet from '../components/ActionSheet'
import type { ConversationSummary } from '../lib/api'
import { useChatStore } from '../store/chat'

const SALONS = [
  { id: 'uno-fr-demo', name: '#uno-fr', members: '1 254 connectes', topic: 'Parties en francais' },
  { id: 'derocher-pro', name: '#derocher-pro', members: '342 connectes', topic: 'Strategies avancees' },
  { id: 'allforone-news', name: '#news', members: 'Officiel', topic: 'Annonces et patch notes' }
]

function formatTime(dateString?: string) {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export default function Channels() {
  const navigate = useNavigate()
  const [currentTab, setCurrentTab] = React.useState('Discussions')
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const { conversations, initialize, togglePin, error, unread } = useChatStore((state) => ({
    conversations: state.conversations,
    initialize: state.initialize,
    togglePin: state.togglePin,
    error: state.error,
    unread: state.unread
  }))

  React.useEffect(() => {
    void initialize()
  }, [initialize])

  const pinned = conversations.filter((conv) => conv.pinned)
  const others = conversations.filter((conv) => !conv.pinned)
  const hasPinned = pinned.length > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            placeholder="Rechercher un ami ou un salon"
            className="w-full rounded-2xl border border-border/60 bg-surface py-3 pl-11 pr-4 text-sm text-txt placeholder:text-muted focus:border-primary focus:outline-none"
          />
        </div>
        <button
          onClick={() => setSheetOpen(true)}
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 bg-surface text-muted transition hover:text-primary focus-ring"
          aria-label="Voir mes contacts"
        >
          <Users className="h-5 w-5" />
        </button>
      </div>

      <div className="flex items-center justify-between">
        <Tabs items={['Discussions', 'Salons']} current={currentTab} onChange={setCurrentTab} />
        <button
          onClick={() => {
            setSheetOpen(true)
          }}
          className="flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-primary/90 focus-ring"
        >
          <MessageSquarePlus className="h-4 w-4" />
          Nouvelle discussion
        </button>
      </div>

      {error ? <Card className="border-danger/40 bg-danger/10 text-sm text-danger">{error}</Card> : null}

      {currentTab === 'Discussions' ? (
        <ul className="space-y-3">
          {hasPinned ? (
            <li>
              <p className="px-2 text-xs uppercase tracking-[0.3em] text-muted">Favoris</p>
            </li>
          ) : null}
          {pinned.map((conversation) => (
            <ConversationRow
              key={conversation.id}
              conversation={conversation}
              onOpen={() => navigate(`/messages/${conversation.id}`)}
              onTogglePin={async () => {
                await togglePin(conversation.id)
              }}
              unreadCount={unread[conversation.id] ?? 0}
            />
          ))}
          {hasPinned ? (
            <li>
              <p className="px-2 text-xs uppercase tracking-[0.3em] text-muted">Tous les messages</p>
            </li>
          ) : null}
          {others.map((conversation) => (
            <ConversationRow
              key={conversation.id}
              conversation={conversation}
              onOpen={() => navigate(`/messages/${conversation.id}`)}
              onTogglePin={async () => {
                await togglePin(conversation.id)
              }}
              unreadCount={unread[conversation.id] ?? 0}
            />
          ))}
          {conversations.length === 0 ? (
            <Card className="text-sm text-muted">Aucune discussion pour le moment. Lancez-en une !</Card>
          ) : null}
        </ul>
      ) : (
        <section className="space-y-3">
          {SALONS.map((salon) => (
            <Card key={salon.id} className="flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <p className="text-base font-semibold text-txt">{salon.name}</p>
                <p className="text-sm text-muted">{salon.topic}</p>
                <p className="text-xs text-muted/80">{salon.members}</p>
              </div>
              <button
                onClick={() => navigate(`/messages/${salon.id}`)}
                className="flex items-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20 focus-ring"
              >
                <Flame className="h-4 w-4" />
                Rejoindre
              </button>
            </Card>
          ))}
        </section>
      )}

      <ActionSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        actions={[
          { label: 'Inviter un ami', onClick: () => navigate('/profile') },
          { label: 'Creer un groupe', onClick: () => navigate('/channels') },
          { label: 'Explorer les salons publics', onClick: () => setCurrentTab('Salons') }
        ]}
      />
    </div>
  )
}

function ConversationRow({
  conversation,
  onOpen,
  onTogglePin,
  unreadCount
}: {
  conversation: ConversationSummary
  onOpen: () => void
  onTogglePin: () => void
  unreadCount: number
}) {
  const lastMessagePreview =
    conversation.lastMessage?.content?.trim().length
      ? conversation.lastMessage.content
      : 'Nouveau message'
  const timeLabel = formatTime(conversation.lastMessageAt ?? conversation.lastMessage?.createdAt)
  const unreadLabel = unreadCount > 9 ? '9+' : String(unreadCount)
  const hasUnread = unreadCount > 0
  return (
    <li>
      <Card
        onClick={onOpen}
        className={`flex items-center gap-3 ${hasUnread ? 'border-primary/40 bg-primary/5' : ''}`}
        role="button"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {conversation.title?.slice(0, 2).toUpperCase() ?? 'DM'}
        </span>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-base font-semibold text-txt">{conversation.title ?? conversation.members.join(', ')}</p>
            <div className="flex items-center gap-2">
              {timeLabel ? <span className="text-xs text-muted">{timeLabel}</span> : null}
              {unreadCount > 0 ? (
                <span className="flex h-5 min-w-[1.4rem] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-white">
                  {unreadLabel}
                </span>
              ) : null}
            </div>
          </div>
          <p className="truncate text-sm text-muted">{lastMessagePreview}</p>
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onTogglePin()
          }}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-muted transition hover:text-primary focus-ring"
          aria-label={conversation.pinned ? 'Retirer des favoris' : 'Mettre en favoris'}
        >
          {conversation.pinned ? <Star className="h-4 w-4" /> : <StarOff className="h-4 w-4" />}
        </button>
      </Card>
    </li>
  )
}

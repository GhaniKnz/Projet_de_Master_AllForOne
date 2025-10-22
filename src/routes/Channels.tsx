import React from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageSquarePlus, Search, Users, Flame } from 'lucide-react'
import Tabs from '../components/Tabs'
import Card from '../components/Card'
import ActionSheet from '../components/ActionSheet'

const CONVERSATIONS = [
  {
    id: 'alex',
    name: 'Alex Martin',
    preview: 'Toujours partant pour No Mercy ce soir ?',
    time: '12:45',
    unread: 2,
    avatar: 'AM',
    status: 'en ligne'
  },
  {
    id: 'crew',
    name: 'Squad UNO',
    preview: 'Nouveau tournoi annoncé 🎉',
    time: '11:02',
    unread: 0,
    avatar: '5',
    status: '5 membres'
  },
  {
    id: 'lina',
    name: 'Lina',
    preview: 'GG pour ton top 10 !',
    time: 'Hier',
    unread: 0,
    avatar: 'L',
    status: 'vu'
  }
]

const SALONS = [
  { id: 'uno-fr', name: '#uno-fr', members: '1 254 connectés', topic: 'Parties en français' },
  { id: 'derocher-pro', name: '#derocher-pro', members: '342 connectés', topic: 'Stratégies avancées' },
  { id: 'allforone-news', name: '#news', members: 'Officiel', topic: 'Annonces & patch notes' }
]

export default function Channels() {
  const navigate = useNavigate()
  const [currentTab, setCurrentTab] = React.useState('Discussions')
  const [sheetOpen, setSheetOpen] = React.useState(false)

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
          onClick={() => setSheetOpen(true)}
          className="flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-primary/90 focus-ring"
        >
          <MessageSquarePlus className="h-4 w-4" />
          Nouvelle discussion
        </button>
      </div>

      {currentTab === 'Discussions' ? (
        <ul className="space-y-3">
          {CONVERSATIONS.map((conversation) => (
            <li key={conversation.id}>
              <Card
                onClick={() => navigate(`/messages/${conversation.id}`)}
                className="flex items-center gap-3"
                role="button"
                ariaLabel={`Ouvrir la conversation avec ${conversation.name}`}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {conversation.avatar}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-base font-semibold text-txt">{conversation.name}</p>
                    <span className="text-xs text-muted">{conversation.time}</span>
                  </div>
                  <p className="truncate text-sm text-muted">{conversation.preview}</p>
                  <p className="text-xs text-muted/80">{conversation.status}</p>
                </div>
                {conversation.unread > 0 ? (
                  <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-primary px-2 text-xs font-semibold text-white">
                    {conversation.unread}
                  </span>
                ) : null}
              </Card>
            </li>
          ))}
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
          { label: 'Créer un groupe', onClick: () => navigate('/channels') },
          { label: 'Explorer les salons publics', onClick: () => setCurrentTab('Salons') }
        ]}
      />
    </div>
  )
}

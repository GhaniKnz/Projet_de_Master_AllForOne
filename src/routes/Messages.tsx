import React from 'react'
import { useParams } from 'react-router-dom'
import ChatComposer from '../components/ChatComposer'
import Card from '../components/Card'

type ChatMessage = {
  id: string
  author: 'me' | 'them'
  content: string
  time: string
}

const CONV_DETAILS: Record<
  string,
  {
    name: string
    status: string
    avatar: string
    messages: ChatMessage[]
  }
> = {
  alex: {
    name: 'Alex Martin',
    status: 'En ligne',
    avatar: 'AM',
    messages: [
      { id: 'm1', author: 'them', content: 'Toujours partant pour No Mercy ce soir ?', time: '12:41' },
      { id: 'm2', author: 'me', content: 'Grave ! On se fait une équipe à 21h ?', time: '12:42' },
      { id: 'm3', author: 'them', content: 'Parfait je crée le lobby. Hâte de tester les nouvelles cartes.', time: '12:43' }
    ]
  },
  'uno-fr': {
    name: '#uno-fr',
    status: '1 254 joueurs connectés',
    avatar: 'UNO',
    messages: [
      { id: 'm1', author: 'them', content: 'Bienvenue dans le salon francophone !', time: '09:30' },
      { id: 'm2', author: 'me', content: 'Salut tout le monde 👋', time: '09:31' },
      { id: 'm3', author: 'them', content: 'Une place dispo pour une partie en classé !', time: '09:32' }
    ]
  }
}

export default function Messages() {
  const params = useParams<{ id: string }>()
  const conversation = params.id ? CONV_DETAILS[params.id] : undefined
  const [messages, setMessages] = React.useState<ChatMessage[]>(conversation?.messages ?? [])

  React.useEffect(() => {
    if (!conversation) return
    setMessages(conversation.messages)
  }, [conversation])

  if (!conversation) {
    return (
      <section className="space-y-3">
        <h1 className="text-xl font-semibold text-txt">Conversation introuvable</h1>
        <p className="text-sm text-muted">Choisissez un contact ou un salon depuis l’onglet Messages.</p>
      </section>
    )
  }

  return (
    <div className="flex flex-col gap-4 pb-24">
      <Card className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {conversation.avatar}
        </span>
        <div>
          <h1 className="text-lg font-semibold text-txt">{conversation.name}</h1>
          <p className="text-sm text-muted">{conversation.status}</p>
        </div>
      </Card>

      <div className="flex-1 space-y-3 rounded-3xl border border-border/60 bg-surface/90 p-4 shadow-soft">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.author === 'me' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-soft ${
                message.author === 'me'
                  ? 'bg-primary text-white'
                  : 'bg-bg text-txt'
              }`}
            >
              <p>{message.content}</p>
              <span className={`mt-1 block text-xs ${message.author === 'me' ? 'text-white/80' : 'text-muted'}`}>
                {message.time}
              </span>
            </div>
          </div>
        ))}
      </div>

      <ChatComposer
        onSend={(text) =>
          setMessages((prev) => [
            ...prev,
            {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              author: 'me',
              content: text,
              time: 'Maintenant'
            }
          ])
        }
      />
    </div>
  )
}

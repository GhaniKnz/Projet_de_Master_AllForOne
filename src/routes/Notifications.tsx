import React from 'react'
import Card from '../components/Card'
import { BellRing, Gamepad2, Heart, MessageCircle } from 'lucide-react'

const NOTIFICATIONS = [
  {
    id: 'notif1',
    type: 'message',
    title: 'Alex vous a envoyé un message',
    description: '“Tu es dispo pour une revanche UNO ce soir ?”',
    time: 'Il y a 5 min'
  },
  {
    id: 'notif2',
    type: 'game',
    title: 'Invitation à rejoindre “UNO No Mercy”',
    description: 'Lina et 3 autres joueurs vous attendent dans le lobby.',
    time: 'Il y a 20 min'
  },
  {
    id: 'notif3',
    type: 'social',
    title: '12 personnes ont aimé votre publication',
    description: '“Tournoi Dérocher ce soir à 21h30 !”',
    time: 'Il y a 1 h'
  }
]

const ICONS: Record<string, React.ReactNode> = {
  message: <MessageCircle className="h-5 w-5" />,
  game: <Gamepad2 className="h-5 w-5" />,
  social: <Heart className="h-5 w-5" />
}

export default function Notifications() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border/70 bg-surface p-5 shadow-soft">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <BellRing className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-txt">Notifications</h1>
            <p className="text-sm text-muted">Gérez les invitations, messages et alertes de la communauté.</p>
          </div>
        </div>
      </section>

      <Card className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-txt">Notifications push</p>
          <p className="text-xs text-muted">Soyez averti instantanément même hors de l’application.</p>
        </div>
        <button className="rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/20 focus-ring">
          Gérer
        </button>
      </Card>

      <ul className="space-y-3">
        {NOTIFICATIONS.map((notification) => (
          <li key={notification.id}>
            <Card className="flex items-center gap-4 bg-bg/80">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                {ICONS[notification.type]}
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-txt">{notification.title}</p>
                <p className="text-sm text-muted">{notification.description}</p>
                <p className="text-xs text-muted/80">{notification.time}</p>
              </div>
              <button className="rounded-2xl border border-border/60 px-4 py-2 text-xs font-semibold text-muted transition hover:border-primary/40 hover:text-primary focus-ring">
                Voir
              </button>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  )
}

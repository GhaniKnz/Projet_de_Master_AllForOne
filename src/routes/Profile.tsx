import React from 'react'
import Card from '../components/Card'
import Tabs from '../components/Tabs'
import { useAppStore } from '../store/app'

const STATS = [
  { label: 'Niveau', value: '12', description: 'Prochain palier à 1 200 XP' },
  { label: 'XP total', value: '8 540', description: '+240 cette semaine' },
  { label: 'Victoires', value: '134', description: '+8 ce mois-ci' }
]

const FRIENDS = [
  { id: 'alex', name: 'Alex', status: 'En ligne' },
  { id: 'lina', name: 'Lina', status: 'Dans un lobby UNO' },
  { id: 'marc', name: 'Marc', status: 'Déconnecté' },
  { id: 'clara', name: 'Clara', status: 'Disponible' }
]

const BADGES = [
  { id: 'uno-master', name: 'UNO Master', description: '100 victoires UNO', unlocked: true },
  { id: 'community-hero', name: 'Community Hero', description: '50 messages appréciés', unlocked: true },
  { id: 'night-owl', name: 'Night Owl', description: '10 parties gagnées après minuit', unlocked: false }
]

const SECTIONS = ['Aperçu', 'Historique', 'Classements']

export default function Profile() {
  const user = useAppStore((state) => state.user) ?? {
    name: 'Invité',
    avatar: 'IN',
    xp: 0,
    level: 1
  }
  const [currentSection, setCurrentSection] = React.useState(SECTIONS[0])

  return (
    <div className="space-y-6">
      <section className="flex flex-col items-start gap-4 rounded-3xl border border-border/70 bg-surface p-6 shadow-soft sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-semibold text-primary">
            {user.avatar}
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-txt">{user.name}</h1>
            <p className="text-sm text-muted">Niveau {user.level} · {user.xp} XP</p>
            <button className="mt-3 rounded-2xl border border-border/70 px-4 py-2 text-sm font-semibold text-muted transition hover:border-primary/60 hover:text-primary focus-ring">
              Modifier le profil
            </button>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-primary/90 focus-ring">
            Inviter des amis
          </button>
          <button className="rounded-2xl border border-border/70 px-4 py-2 text-sm font-semibold text-muted transition hover:border-primary/60 hover:text-primary focus-ring">
            Paramètres
          </button>
        </div>
      </section>

      <div className="flex items-center justify-between">
        <Tabs items={SECTIONS} current={currentSection} onChange={setCurrentSection} />
      </div>

      {currentSection === 'Aperçu' ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {STATS.map((stat) => (
              <Card key={stat.label}>
                <p className="text-xs uppercase tracking-[0.3em] text-muted">{stat.label}</p>
                <p className="mt-3 text-2xl font-semibold text-txt">{stat.value}</p>
                <p className="text-sm text-muted">{stat.description}</p>
              </Card>
            ))}
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">Amis</h2>
              <button className="text-xs font-semibold text-primary hover:underline focus-ring">Voir tout</button>
            </div>
            <Card className="grid gap-3 sm:grid-cols-2">
              {FRIENDS.map((friend) => (
                <div key={friend.id} className="flex items-center justify-between rounded-2xl bg-bg px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-txt">{friend.name}</p>
                    <p className="text-xs text-muted">{friend.status}</p>
                  </div>
                  <button className="rounded-2xl border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary/20 focus-ring">
                    Inviter
                  </button>
                </div>
              ))}
            </Card>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">Badges</h2>
            <Card className="grid gap-3 sm:grid-cols-3">
              {BADGES.map((badge) => (
                <div
                  key={badge.id}
                  className={`flex flex-col gap-2 rounded-2xl border px-4 py-4 text-sm ${
                    badge.unlocked
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-border/60 bg-bg text-muted'
                  }`}
                >
                  <p className="text-base font-semibold">{badge.name}</p>
                  <p className="text-xs">{badge.description}</p>
                </div>
              ))}
            </Card>
          </section>
        </div>
      ) : (
        <Card>
          <p className="text-sm text-muted">Cette section sera bientôt disponible.</p>
        </Card>
      )}
    </div>
  )
}

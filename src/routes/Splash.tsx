import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Gamepad2, MessageCircleHeart, Sparkles, Users } from 'lucide-react'
import { useAppStore } from '../store/app'

const features = [
  {
    icon: <MessageCircleHeart className="h-5 w-5" />,
    title: 'Discussions instantanées',
    description: 'Chats privés, salons publics et réactions en direct.'
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: 'Communauté soudée',
    description: 'Retrouvez vos amis ou découvrez de nouveaux coéquipiers.'
  },
  {
    icon: <Sparkles className="h-5 w-5" />,
    title: 'Progression motivante',
    description: 'Classements, badges exclusifs et boutique premium.'
  }
]

export default function Splash() {
  const navigate = useNavigate()
  const enterAsGuest = useAppStore((state) => state.enterAsGuest)

  const handleGuest = () => {
    enterAsGuest('Invité')
    navigate('/home')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-gradient-to-b from-white to-bg px-6 py-10 text-center">
      <header className="flex w-full max-w-xl items-center justify-between text-sm text-muted">
        <span>AllForOne</span>
        <span>Version Preview</span>
      </header>

      <div className="flex w-full max-w-xl flex-col items-center gap-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-primary/20 bg-primary/10 text-primary shadow-card">
          <Gamepad2 className="h-8 w-8" />
        </div>
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.4em] text-muted">Jouez. Discutez. Connectez.</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-txt">La plateforme qui réunit jeux et social</h1>
          <p className="mt-4 text-base text-muted">
            Retrouver vos amis autour de vos jeux préférés, partager vos moments forts et progressez ensemble, le tout dans une
            expérience inspirée du design Apple.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row">
          <button
            onClick={() => navigate('/auth')}
            className="w-full rounded-2xl bg-primary py-3 text-base font-semibold text-white shadow-card transition hover:bg-primary/90 focus-ring"
          >
            Se connecter / Créer un compte
          </button>
          <button
            onClick={handleGuest}
            className="w-full rounded-2xl border border-border/70 bg-surface py-3 text-base font-semibold text-txt transition hover:border-primary/50 focus-ring"
          >
            Explorer en invité
          </button>
        </div>
      </div>

      <ul className="grid w-full max-w-xl gap-4 rounded-3xl border border-border/70 bg-white/70 p-5 shadow-soft sm:grid-cols-3">
        {features.map((feature) => (
          <li key={feature.title} className="flex flex-col items-center gap-2 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              {feature.icon}
            </span>
            <h2 className="text-sm font-semibold text-txt">{feature.title}</h2>
            <p className="text-xs text-muted">{feature.description}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

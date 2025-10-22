import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Apple, Facebook, Mail, Lock, LogIn, User } from 'lucide-react'
import { useAppStore } from '../store/app'
import { api, isBackendConfigured } from '../lib/api'

const socialProviders = [
  { id: 'apple', label: 'Continuer avec Apple', icon: <Apple className="h-5 w-5" /> },
  { id: 'google', label: 'Continuer avec Google', icon: <LogIn className="h-5 w-5" /> },
  { id: 'facebook', label: 'Continuer avec Facebook', icon: <Facebook className="h-5 w-5" /> }
]

export default function Auth() {
  const navigate = useNavigate()
  const enterAsGuest = useAppStore((state) => state.enterAsGuest)
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const remote = isBackendConfigured()

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    navigate('/home')
  }

  async function handleDemoBackendLogin() {
    try {
      setError(null)
      await api.ensureDemoToken()
      navigate('/home')
    } catch (e: any) {
      setError(e?.message || 'Connexion au backend impossible')
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-10 bg-bg px-6 py-10">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-muted">AllForOne</p>
        <h1 className="mt-2 text-3xl font-semibold text-txt">Bienvenue parmi la communauté</h1>
        <p className="mt-3 text-sm text-muted">
          Connectez-vous pour retrouver vos amis, rejoindre des parties et partager vos moments forts. Une seule identité pour tous vos jeux.
        </p>
      </header>

      <section className="space-y-3">
        {socialProviders.map((provider) => (
          <button
            key={provider.id}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-border/80 bg-surface py-3 text-sm font-semibold text-txt transition hover:border-primary/60 hover:text-primary focus-ring"
            type="button"
          >
            {provider.icon}
            {provider.label}
          </button>
        ))}
        {remote && (
          <button
            type="button"
            onClick={handleDemoBackendLogin}
            className="w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-white shadow-card transition hover:bg-primary/90 focus-ring"
          >
            Se connecter (démo backend)
          </button>
        )}
      </section>

      <div className="relative flex items-center gap-3 text-xs text-muted">
        <span className="flex-1 border-t border-border/60" aria-hidden />
        <span aria-label="ou">ou</span>
        <span className="flex-1 border-t border-border/60" aria-hidden />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-border/70 bg-surface p-5 shadow-soft">
        {error && <p className="rounded-2xl bg-danger/10 px-4 py-2 text-sm text-danger">{error}</p>}
        <div>
          <label htmlFor="display-name" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-muted">
            <User className="h-4 w-4" />
            Pseudonyme
          </label>
          <input
            id="display-name"
            type="text"
            placeholder="Choisissez un nom visible"
            className="mt-2 w-full rounded-2xl border border-border/60 bg-bg px-4 py-3 text-sm text-txt focus:border-primary focus:outline-none"
            required
          />
        </div>
        <div>
          <label htmlFor="email" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-muted">
            <Mail className="h-4 w-4" />
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="prenom@mail.com"
            className="mt-2 w-full rounded-2xl border border-border/60 bg-bg px-4 py-3 text-sm text-txt focus:border-primary focus:outline-none"
            required
          />
        </div>
        <div>
          <label htmlFor="password" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-muted">
            <Lock className="h-4 w-4" />
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            minLength={6}
            className="mt-2 w-full rounded-2xl border border-border/60 bg-bg px-4 py-3 text-sm text-txt focus:border-primary focus:outline-none"
            required
          />
        </div>

        <button
          type="submit"
          className="mt-2 w-full rounded-2xl bg-primary py-3 text-base font-semibold text-white shadow-card transition hover:bg-primary/90 focus-ring"
        >
          Continuer
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          enterAsGuest('Invité')
          navigate('/home')
        }}
        className="self-center text-sm font-medium text-muted transition hover:text-primary focus-ring"
      >
        Continuer sans inscription
      </button>
    </div>
  )
}

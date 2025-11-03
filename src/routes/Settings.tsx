import React from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import { useAppStore } from '../store/app'
import { api } from '../lib/api'

const LANGUAGE_OPTIONS = [
  { value: 'fr', label: 'Francais' },
  { value: 'en', label: 'English' }
]

export default function Settings() {
  const navigate = useNavigate()
  const { user, preferences, setPreference, logout } = useAppStore((state) => ({
    user: state.user,
    preferences: state.preferences,
    setPreference: state.setPreference,
    logout: state.logout
  }))

  const handleLogout = () => {
    api.logout()
    logout()
    navigate('/auth', { replace: true })
  }

  return (
    <div className="space-y-6 pb-24">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold text-txt">Preferences</h1>
        <p className="text-sm text-muted">Personnalisez votre experience AllForOne.</p>
      </section>

      <Card className="space-y-4">
        <header>
          <h2 className="text-lg font-semibold text-txt">Apparence</h2>
          <p className="text-sm text-muted">Activez un theme sombre ou un fil compact.</p>
        </header>
        <div className="flex flex-col gap-3">
          <ToggleRow
            label="Theme sombre"
            description="Reduit la luminosite pour les sessions nocturnes."
            checked={preferences.darkMode}
            onChange={(value) => setPreference('darkMode', value)}
          />
          <ToggleRow
            label="Fil compact"
            description="Affiche davantage de publications par ecran."
            checked={preferences.compactFeed}
            onChange={(value) => setPreference('compactFeed', value)}
          />
        </div>
      </Card>

      <Card className="space-y-4">
        <header>
          <h2 className="text-lg font-semibold text-txt">Notifications</h2>
          <p className="text-sm text-muted">Activez ou coupez les alertes push.</p>
        </header>
        <ToggleRow
          label="Recevoir les notifications"
          description="Soyez prevenu lorsqu un ami vous invite ou vous mentionne."
          checked={preferences.notifications}
          onChange={(value) => setPreference('notifications', value)}
        />
      </Card>

      <Card className="space-y-4">
        <header>
          <h2 className="text-lg font-semibold text-txt">Langue</h2>
          <p className="text-sm text-muted">Choisissez la langue de l interface.</p>
        </header>
        <select
          value={preferences.language}
          onChange={(event) => setPreference('language', event.target.value as 'fr' | 'en')}
          className="w-full rounded-2xl border border-border/60 bg-bg px-4 py-3 text-sm text-txt focus:border-primary focus:outline-none"
        >
          {LANGUAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Card>

      <Card className="space-y-4">
        <header>
          <h2 className="text-lg font-semibold text-txt">Compte</h2>
          <p className="text-sm text-muted">
            Connecte en tant que <span className="font-semibold text-txt">{user?.displayName ?? 'Invite'}</span>
          </p>
        </header>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger transition hover:bg-danger/20 focus-ring"
        >
          Se deconnecter
        </button>
      </Card>
    </div>
  )
}

type ToggleRowProps = {
  label: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
}

function ToggleRow({ label, description, checked, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-border/60 bg-panel px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-txt">{label}</p>
        <p className="text-xs text-muted">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
          checked ? 'bg-primary' : 'bg-border'
        }`}
        aria-pressed={checked}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
            checked ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}

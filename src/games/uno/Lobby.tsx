import React from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { useGamesStore, GameSession } from '../../store/games'
import { useAppStore } from '../../store/app'
import { useUnoStore } from '../../store/uno'
import Card from '../../components/Card'
import Topbar from '../../components/Topbar'
import { api, isBackendConfigured, getCurrentUser } from '../../lib/api'

const POLL_INTERVAL = 5000

export default function UnoLobby() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const sessionIdFromUrl = searchParams.get('session')
  const initialSession = (location.state as { session?: GameSession } | null)?.session

  const remote = isBackendConfigured()

  const {
    sessions,
    activeSessionId,
    setActiveSession,
    localPlayerId,
    toggleReady,
    updateOptions,
    addBotToSession,
    startSession,
    setLocalPlayerId
  } = useGamesStore((state) => ({
    sessions: state.sessions,
    activeSessionId: state.activeSessionId,
    setActiveSession: state.setActiveSession,
    localPlayerId: state.localPlayerId,
    toggleReady: state.toggleReady,
    updateOptions: state.updateOptions,
    addBotToSession: state.addBotToSession,
    startSession: state.startSession,
    setLocalPlayerId: state.setLocalPlayerId
  }))
  const user = useAppStore((state) => state.user)
  const initializeUno = useUnoStore((state) => state.initializeFromSession)

  const currentSession = React.useMemo(() => {
    const targetId = sessionIdFromUrl ?? activeSessionId
    if (!targetId) return null
    return sessions.find((session) => session.id === targetId) ?? null
  }, [sessionIdFromUrl, activeSessionId, sessions])

  const [remoteSession, setRemoteSession] = React.useState<GameSession | null>(remote ? initialSession ?? null : null)
  const [loading, setLoading] = React.useState(remote && !initialSession)
  const [error, setError] = React.useState<string | null>(null)
  const [feedback, setFeedback] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!remote) return
    const targetId = sessionIdFromUrl ?? initialSession?.id ?? activeSessionId
    if (!targetId) return
    let mounted = true
    setLoading(true)

    const load = async () => {
      try {
        if (!api.isAuthenticated()) {
          navigate('/auth')
          return
        }
        const current = getCurrentUser()
        if (current) setLocalPlayerId(current.userId)
        const data = await api.getSession(targetId)
        if (!mounted) return
        setRemoteSession(data)
        setActiveSession(targetId)
        setLoading(false)
        setError(null)
      } catch (err) {
        if (!mounted) return
        setError('Unable to load lobby. Check the backend.')
        setLoading(false)
      }
    }

    load()
    const interval = setInterval(load, POLL_INTERVAL)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [remote, sessionIdFromUrl, initialSession, activeSessionId, setActiveSession, setLocalPlayerId])

  const session = remote ? remoteSession : currentSession

  React.useEffect(() => {
    if (!remote && session && session.id !== activeSessionId) {
      setActiveSession(session.id)
    }
  }, [remote, session, activeSessionId, setActiveSession])

  React.useEffect(() => {
    if (!feedback) return
    const timer = window.setTimeout(() => setFeedback(null), 3000)
    return () => window.clearTimeout(timer)
  }, [feedback])

  if (remote && loading) {
    return (
      <div className="min-h-screen bg-bg">
        <Topbar title="Salon UNO" back />
        <div className="mx-auto max-w-xl px-4 py-6">
          <Card className="text-sm text-muted">Loading lobby...</Card>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-bg">
        <Topbar title="Salon UNO" back />
        <div className="mx-auto max-w-xl px-4 py-6">
          <Card className="text-sm text-muted">No active session. Return to the games catalog.</Card>
        </div>
      </div>
    )
  }

  const localPlayer = session.players.find((player) => player.id === localPlayerId)
  const isHost = localPlayer?.isHost ?? false
  const totalPlayers = session.players.length
  const readyPlayers = session.players.filter((player) => player.isBot || player.status === 'ready').length
  const everyoneReady = totalPlayers > 0 && readyPlayers === totalPlayers
  const canStart = isHost && totalPlayers >= 2 && everyoneReady
  const inviteLink =
    typeof window !== 'undefined' ? `${window.location.origin.replace(/\/$/, '')}/uno/lobby?session=${session.id}` : ''
  const canAddBot =
    (session.options.allowBots ?? true) &&
    isHost &&
    session.status === 'waiting' &&
    session.players.length < session.maxPlayers
  const canNativeShare =
    typeof navigator !== 'undefined' && 'share' in navigator && typeof (navigator as any).share === 'function'

  const handleToggleReady = async () => {
    if (!localPlayer) return
    if (remote) {
      try {
        if (!api.isAuthenticated()) {
          navigate('/auth')
          return
        }
        const updated = await api.toggleReady(session.id)
        setRemoteSession(updated)
         setError(null)
         setFeedback('Statut de préparation mis à jour')
      } catch (err: any) {
        setError(err?.message || 'Failed to change ready status')
      }
      return
    }
    toggleReady(session.id, localPlayer.id)
  }

  const handleAddBot = () => {
    if (remote) {
      ;(async () => {
        try {
          if (!api.isAuthenticated()) {
            navigate('/auth')
            return
          }
          const updated = await api.addBotToSession(session.id)
          setRemoteSession(updated)
          setError(null)
          setFeedback('Bot ajouté à la partie')
        } catch (err: any) {
          setError(err?.message || "Impossible d'ajouter un bot")
        }
      })()
      return
    }
    addBotToSession(session.id)
    setFeedback('Bot ajouté à la partie')
  }

  const handleStart = async () => {
    if (remote) {
      try {
        if (!api.isAuthenticated()) {
          navigate('/auth')
          return
        }
        const updated = await api.startSession(session.id)
        setRemoteSession(updated)
        setError(null)
        initializeUno(updated, updated.players)
        navigate(`/uno/game?session=${updated.id}`)
      } catch (err: any) {
        setError(err?.message || 'Unable to launch the game')
      }
      return
    }
    initializeUno(session, session.players)
    startSession(session.id)
    navigate(`/uno/game?session=${session.id}`)
  }

  const handleOptionChange = (updates: Partial<typeof session.options>) => {
    if (remote) {
      if (!isHost) return
      ;(async () => {
        try {
          if (!api.isAuthenticated()) {
            navigate('/auth')
            return
          }
          const updated = await api.updateSessionOptions(session.id, updates)
          setRemoteSession(updated)
          setError(null)
          setFeedback('Options mises à jour')
        } catch (err: any) {
          setError(err?.message || 'Impossible de mettre à jour les options')
        }
      })()
      return
    }
    updateOptions(session.id, updates)
  }

  const copyToClipboard = (value: string, message: string) => {
    if (!value) return
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(value)
        .then(() => setFeedback(message))
        .catch(() => setError('Impossible de copier dans le presse-papiers'))
      return
    }
    try {
      const textarea = document.createElement('textarea')
      textarea.value = value
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setFeedback(message)
    } catch (err) {
      setError('Impossible de copier dans le presse-papiers')
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      <Topbar title="Salon UNO" subtitle={renderVariantLabel(session.gameId)} back />
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-28 pt-4">
        {error ? <Card className="border-danger/40 bg-danger/10 text-sm text-danger">{error}</Card> : null}
        {feedback ? <Card className="border-primary/40 bg-primary/10 text-sm text-primary">{feedback}</Card> : null}

        <Card className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Code de session</p>
            <p className="text-lg font-semibold text-txt">{session.accessCode ?? 'Public'}</p>
          </div>
          <button
            onClick={() => session.accessCode && copyToClipboard(session.accessCode, 'Code de session copié')}
            className="rounded-2xl border border-border/60 px-4 py-2 text-xs font-semibold text-muted transition hover:border-primary/50 hover:text-primary focus-ring disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!session.accessCode}
          >
            Copier
          </button>
        </Card>

        <Card className="flex flex-col gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Lien d invitation</p>
            <p className="break-words text-sm text-txt">{inviteLink}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => copyToClipboard(inviteLink, 'Lien d’invitation copié')}
              className="rounded-2xl border border-border/60 px-4 py-2 text-xs font-semibold text-muted transition hover:border-primary/50 hover:text-primary focus-ring"
            >
              Copier le lien
            </button>
            {canNativeShare ? (
              <button
                type="button"
                onClick={() => {
                  ;(navigator as any)
                    .share({
                      title: session.title,
                      text: 'Rejoins ma partie UNO sur AllForOne !',
                      url: inviteLink
                    })
                    .catch(() => null)
                }}
                className="rounded-2xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-card transition hover:bg-primary/90 focus-ring"
              >
                Partager
              </button>
            ) : null}
          </div>
        </Card>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">
              Players ({session.players.length}/{session.maxPlayers})
            </h2>
            {canAddBot ? (
              <button
                onClick={handleAddBot}
                className="rounded-2xl border border-border/60 px-4 py-2 text-xs font-semibold text-muted transition hover:border-primary/50 hover:text-primary focus-ring"
              >
                Ajouter un bot
              </button>
            ) : null}
          </div>
          <div className="space-y-2">
            {session.players.map((player) => (
              <Card key={player.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {player.avatar}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-txt">
                      {player.name}
                      {player.isHost ? ' (Hôte)' : ''}
                      {player.id === localPlayerId ? ' (Vous)' : ''}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs text-muted">
                      <span>{renderStatus(player.status)}</span>
                      {player.isBot ? <span>Bot</span> : null}
                    </div>
                  </div>
                </div>
                {player.id === localPlayerId ? (
                  <button
                    onClick={handleToggleReady}
                    className={`rounded-2xl px-4 py-2 text-xs font-semibold focus-ring ${
                      player.status === 'ready'
                        ? 'bg-primary text-white shadow-card'
                        : 'border border-border/60 text-muted transition hover:border-primary/50 hover:text-primary'
                    }`}
                  >
                    {player.status === 'ready' ? 'Annuler Prêt' : 'Je suis prêt'}
                  </button>
                ) : (
                  <span className="text-xs text-muted">{player.status === 'ready' ? 'Prêt' : 'En attente'}</span>
                )}
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">Règles</h2>
          <Card className="grid gap-3 sm:grid-cols-2">
            <ToggleField
              label="Empilement des +2/+4"
              value={session.options.allowStacking ?? false}
              onChange={(value) => handleOptionChange({ allowStacking: value })}
              disabled={!isHost}
            />
            <ToggleField
              label="Challenge +4"
              value={session.options.allowWildChallenge ?? false}
              onChange={(value) => handleOptionChange({ allowWildChallenge: value })}
              disabled={!isHost}
            />
            <InputField
              label="Timer par tour"
              value={session.options.timerPerTurn ?? 0}
              onChange={(value) => handleOptionChange({ timerPerTurn: value })}
              disabled={!isHost}
            />
            {session.gameId === 'uno-no-mercy' ? (
              <InputField
                label="Seuil élimination"
                value={session.options.eliminationThreshold ?? 25}
                onChange={(value) => handleOptionChange({ eliminationThreshold: value })}
                disabled={!isHost}
              />
            ) : null}
          </Card>
        </section>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            onClick={handleToggleReady}
            className="rounded-2xl border border-border/60 px-4 py-2 text-sm font-semibold text-muted transition hover:border-primary/50 hover:text-primary focus-ring"
          >
            {localPlayer?.status === 'ready' ? 'Annuler Prêt' : 'Je suis prêt'}
          </button>
          <button
            onClick={handleStart}
            className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-primary/90 focus-ring disabled:cursor-not-allowed disabled:bg-muted"
            disabled={!canStart}
          >
            Lancer la partie
          </button>
        </div>
      </div>
    </div>
  )
}

function renderVariantLabel(gameId: string) {
  return gameId === 'uno-no-mercy' ? 'Mode No Mercy' : 'Mode classique'
}

function renderStatus(status: string) {
  switch (status) {
    case 'ready':
      return 'Prêt'
    case 'playing':
      return 'En jeu'
    case 'waiting':
      return 'En attente'
    default:
      return status
  }
}

function ToggleField({
  label,
  value,
  onChange,
  disabled
}: {
  label: string
  value: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-xs font-semibold transition focus-ring ${
        disabled
          ? 'cursor-not-allowed border-border/60 text-muted/60'
          : value
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-border/60 text-muted hover:border-primary/50 hover:text-primary'
      }`}
      disabled={disabled}
    >
      {label}
      <span
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
          value ? 'bg-primary' : 'bg-border'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
            value ? 'translate-x-4' : 'translate-x-1'
          }`}
        />
      </span>
    </button>
  )
}

function InputField({
  label,
  value,
  onChange,
  disabled
}: {
  label: string
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}) {
  return (
    <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
      {label}
      <input
        type="number"
        min={0}
        value={value}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        disabled={disabled}
        className="w-full rounded-2xl border border-border/60 bg-bg px-3 py-2 text-sm text-txt focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      />
    </label>
  )
}


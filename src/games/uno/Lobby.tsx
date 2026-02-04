import React from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import {
  Users, Crown, Bot, Copy, Share2, Settings, Play, Clock, Zap,
  Shield, Layers, UserPlus, Check, X, Link, Sparkles, Trophy, Target
} from 'lucide-react'
import { useGamesStore, GameSession } from '../../store/games'
import { useAppStore } from '../../store/app'
import { useUnoStore } from '../../store/uno'
import { api, isBackendConfigured, getCurrentUser } from '../../lib/api'

const POLL_INTERVAL = 5000

type LobbyPlayer = GameSession['players'][0]

export default function UnoLobbyNew() {
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
  const [showSettings, setShowSettings] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

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
        
        // If the game is already in progress and we're a player, go directly to the game
        if (data.status === 'in-game' && current) {
          const isPlayerInGame = data.players.some((p: any) => p.id === current.userId)
          if (isPlayerInGame) {
            setActiveSession(targetId)
            initializeUno(data, data.players)
            navigate(`/uno/game?session=${targetId}`, { replace: true })
            return
          }
        }
        
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
  }, [remote, sessionIdFromUrl, initialSession, activeSessionId, setActiveSession, setLocalPlayerId, navigate, initializeUno])

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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/80">Chargement du salon...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 text-center max-w-md">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Session introuvable</h2>
          <p className="text-white/60 mb-6">La session n'existe pas ou a expiré.</p>
          <button
            onClick={() => navigate('/games')}
            className="bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors"
          >
            Retour aux jeux
          </button>
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
  const inviteLink = typeof window !== 'undefined'
    ? `${window.location.origin.replace(/\/$/, '')}/uno/lobby?session=${session.id}`
    : ''
  const canAddBot = (session.options.allowBots ?? true) && isHost && session.status === 'waiting' && session.players.length < session.maxPlayers
  const canNativeShare = typeof navigator !== 'undefined' && 'share' in navigator

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
      (async () => {
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
      (async () => {
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

  const copyToClipboard = (value: string) => {
    if (!value) return
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(true)
      setFeedback('Copié !')
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => setError('Impossible de copier'))
  }

  const isNoMercy = session.gameId === 'uno-no-mercy'

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-accent/20 rounded-full blur-3xl animate-pulse animation-delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white"
          >
            ←
          </button>
          <div className="text-center">
            <h1 className="text-2xl font-black text-white flex items-center gap-2 justify-center">
              <span className="text-3xl">🃏</span>
              UNO
              {isNoMercy && (
                <span className="text-sm bg-gradient-to-r from-red-500 to-orange-500 px-3 py-1 rounded-full font-bold">
                  NO MERCY
                </span>
              )}
            </h1>
            <p className="text-white/60 text-sm">Salon d'attente</p>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-xl transition-colors text-white ${showSettings ? 'bg-primary' : 'bg-white/10 hover:bg-white/20'}`}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 px-4 pb-32 max-w-2xl mx-auto">
        {/* Error/Feedback */}
        {error && (
          <div className="mb-4 bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-2xl flex items-center gap-2 animate-shake">
            <X className="w-5 h-5" />
            {error}
          </div>
        )}
        {feedback && (
          <div className="mb-4 bg-green-500/20 border border-green-500/50 text-green-200 px-4 py-3 rounded-2xl flex items-center gap-2 animate-slide-down">
            <Check className="w-5 h-5" />
            {feedback}
          </div>
        )}

        {/* Session code card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 mb-6 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Code de session</p>
              <p className="text-4xl font-black text-white tracking-widest">
                {session.accessCode ?? 'PUBLIC'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => session.accessCode && copyToClipboard(session.accessCode)}
                className={`p-3 rounded-xl transition-all ${copied ? 'bg-green-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
              {canNativeShare && (
                <button
                  onClick={() => (navigator as any).share({
                    title: session.title,
                    text: 'Rejoins ma partie UNO !',
                    url: inviteLink
                  }).catch(() => null)}
                  className="p-3 rounded-xl bg-primary hover:bg-primary/90 text-white transition-colors"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 text-white/60 text-sm bg-white/5 rounded-xl px-4 py-2">
            <Link className="w-4 h-4" />
            <span className="truncate flex-1">{inviteLink}</span>
            <button
              onClick={() => copyToClipboard(inviteLink)}
              className="text-primary hover:text-primary/80 text-xs font-semibold"
            >
              Copier
            </button>
          </div>
        </div>

        {/* Players */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 mb-6 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold flex items-center gap-2">
              <Users className="w-5 h-5" />
              Joueurs ({totalPlayers}/{session.maxPlayers})
            </h2>
            {canAddBot && (
              <button
                onClick={handleAddBot}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-white text-sm transition-colors"
              >
                <Bot className="w-4 h-4" />
                Ajouter un bot
              </button>
            )}
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-white/10 rounded-full mb-6 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
              style={{ width: `${(readyPlayers / totalPlayers) * 100}%` }}
            />
          </div>

          {/* Player list */}
          <div className="space-y-3">
            {session.players.map((player, index) => (
              <PlayerCard
                key={player.id}
                player={player}
                isLocal={player.id === localPlayerId}
                onToggleReady={player.id === localPlayerId ? handleToggleReady : undefined}
                animationDelay={index * 100}
              />
            ))}

            {/* Empty slots */}
            {Array.from({ length: session.maxPlayers - totalPlayers }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex items-center justify-center py-4 border-2 border-dashed border-white/20 rounded-2xl text-white/40"
              >
                <UserPlus className="w-5 h-5 mr-2" />
                En attente d'un joueur...
              </div>
            ))}
          </div>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 mb-6 border border-white/10 animate-slide-down">
            <h2 className="text-white font-bold flex items-center gap-2 mb-6">
              <Settings className="w-5 h-5" />
              Règles de la partie
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <OptionToggle
                icon={<Layers className="w-5 h-5" />}
                label="Empilement des +2/+4"
                description="Permet d'empiler les cartes +2 et +4"
                value={session.options.allowStacking ?? false}
                onChange={(v) => handleOptionChange({ allowStacking: v })}
                disabled={!isHost}
              />
              <OptionToggle
                icon={<Shield className="w-5 h-5" />}
                label="Challenge +4"
                description="Permet de contester un +4"
                value={session.options.allowWildChallenge ?? false}
                onChange={(v) => handleOptionChange({ allowWildChallenge: v })}
                disabled={!isHost}
              />
              <OptionInput
                icon={<Clock className="w-5 h-5" />}
                label="Timer par tour"
                description="Secondes par tour (0 = illimité)"
                value={session.options.timerPerTurn ?? 0}
                onChange={(v) => handleOptionChange({ timerPerTurn: v })}
                disabled={!isHost}
                unit="sec"
              />
              {isNoMercy && (
                <OptionInput
                  icon={<Target className="w-5 h-5" />}
                  label="Seuil d'élimination"
                  description="Nombre de cartes pour être éliminé"
                  value={session.options.eliminationThreshold ?? 25}
                  onChange={(v) => handleOptionChange({ eliminationThreshold: v })}
                  disabled={!isHost}
                  unit="cartes"
                />
              )}
            </div>

            {!isHost && (
              <p className="text-white/40 text-sm text-center mt-4">
                Seul l'hôte peut modifier les règles
              </p>
            )}
          </div>
        )}

        {/* Game mode info */}
        {isNoMercy && (
          <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30 rounded-3xl p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold mb-1">Mode No Mercy</h3>
                <p className="text-white/60 text-sm">
                  Cartes spéciales brutales (+6, +10, Skip All), élimination si vous atteignez {session.options.eliminationThreshold ?? 25} cartes.
                  Pas de pitié !
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 inset-x-0 z-20 bg-gradient-to-t from-black via-black/90 to-transparent pt-8 pb-6 px-4">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleToggleReady}
            className={`
              flex-1 py-4 rounded-2xl font-bold text-lg transition-all
              ${localPlayer?.status === 'ready'
                ? 'bg-white/20 text-white border-2 border-white/30'
                : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/30'
              }
            `}
          >
            {localPlayer?.status === 'ready' ? (
              <span className="flex items-center justify-center gap-2">
                <Check className="w-5 h-5" />
                Prêt !
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5" />
                Je suis prêt
              </span>
            )}
          </button>

          {isHost && (
            <button
              onClick={handleStart}
              disabled={!canStart}
              className={`
                flex-1 py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2
                ${canStart
                  ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/30 hover:scale-[1.02]'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              <Play className="w-5 h-5" />
              Lancer la partie
            </button>
          )}
        </div>

        {!canStart && isHost && (
          <p className="text-white/40 text-sm text-center mt-3">
            {totalPlayers < 2 ? 'Minimum 2 joueurs requis' : 'En attente que tous les joueurs soient prêts'}
          </p>
        )}
      </div>
    </div>
  )
}

// Sub-components
function PlayerCard({
  player,
  isLocal,
  onToggleReady,
  animationDelay
}: {
  player: LobbyPlayer
  isLocal: boolean
  onToggleReady?: () => void
  animationDelay: number
}) {
  const isReady = player.status === 'ready' || player.isBot

  return (
    <div
      className={`
        flex items-center justify-between p-4 rounded-2xl transition-all
        ${isLocal ? 'bg-primary/20 border-2 border-primary/50' : 'bg-white/5'}
        animate-slide-in
      `}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className={`
          relative w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg
          ${isReady ? 'bg-green-500 text-white' : 'bg-white/20 text-white'}
          transition-colors
        `}>
          {player.avatar}
          {player.isHost && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
              <Crown className="w-3 h-3 text-white" />
            </div>
          )}
          {player.isBot && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gray-600 rounded-full flex items-center justify-center">
              <Bot className="w-3 h-3 text-white" />
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <p className="text-white font-semibold flex items-center gap-2">
            {player.name}
            {isLocal && <span className="text-xs text-primary">(Vous)</span>}
          </p>
          <p className={`text-sm ${isReady ? 'text-green-400' : 'text-white/40'}`}>
            {player.isBot ? 'Bot' : isReady ? 'Prêt' : 'En attente'}
          </p>
        </div>
      </div>

      {/* Action */}
      {isLocal && onToggleReady && !player.isBot && (
        <button
          onClick={onToggleReady}
          className={`
            px-4 py-2 rounded-xl font-semibold text-sm transition-all
            ${isReady
              ? 'bg-white/10 text-white hover:bg-white/20'
              : 'bg-green-500 text-white hover:bg-green-600'
            }
          `}
        >
          {isReady ? 'Annuler' : 'Prêt'}
        </button>
      )}

      {/* Ready indicator for others */}
      {!isLocal && (
        <div className={`
          w-10 h-10 rounded-full flex items-center justify-center
          ${isReady ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-white/20'}
        `}>
          {isReady ? <Check className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
        </div>
      )}
    </div>
  )
}

function OptionToggle({
  icon,
  label,
  description,
  value,
  onChange,
  disabled
}: {
  icon: React.ReactNode
  label: string
  description: string
  value: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      className={`
        text-left p-4 rounded-2xl transition-all
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${value ? 'bg-primary/20 border-2 border-primary/50' : 'bg-white/5 border-2 border-transparent hover:border-white/20'}
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${value ? 'bg-primary/30 text-primary' : 'bg-white/10 text-white/60'}`}>
            {icon}
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{label}</p>
            <p className="text-white/40 text-xs">{description}</p>
          </div>
        </div>
        <div className={`
          w-12 h-6 rounded-full transition-colors relative
          ${value ? 'bg-primary' : 'bg-white/20'}
        `}>
          <div className={`
            absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md
            ${value ? 'left-7' : 'left-1'}
          `} />
        </div>
      </div>
    </button>
  )
}

function OptionInput({
  icon,
  label,
  description,
  value,
  onChange,
  disabled,
  unit
}: {
  icon: React.ReactNode
  label: string
  description: string
  value: number
  onChange: (value: number) => void
  disabled?: boolean
  unit: string
}) {
  return (
    <div className={`p-4 rounded-2xl bg-white/5 ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-xl bg-white/10 text-white/60">
          {icon}
        </div>
        <div>
          <p className="text-white font-semibold text-sm">{label}</p>
          <p className="text-white/40 text-xs">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          disabled={disabled}
          className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white text-center font-semibold focus:outline-none focus:border-primary disabled:cursor-not-allowed"
        />
        <span className="text-white/40 text-sm">{unit}</span>
      </div>
    </div>
  )
}

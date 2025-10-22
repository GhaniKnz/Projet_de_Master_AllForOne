import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useGamesStore } from '../../store/games'
import { useAppStore } from '../../store/app'
import { useDerocherStore } from '../../store/derocher'
import Card from '../../components/Card'
import Topbar from '../../components/Topbar'

export default function DerocherLobby() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionIdFromUrl = searchParams.get('session')

  const {
    sessions,
    activeSessionId,
    setActiveSession,
    localPlayerId,
    toggleReady,
    addBotToSession,
    startSession
  } = useGamesStore((state) => ({
    sessions: state.sessions,
    activeSessionId: state.activeSessionId,
    setActiveSession: state.setActiveSession,
    localPlayerId: state.localPlayerId,
    toggleReady: state.toggleReady,
    addBotToSession: state.addBotToSession,
    startSession: state.startSession
  }))
  const user = useAppStore((state) => state.user)
  const initializeDerocher = useDerocherStore((state) => state.initializeFromSession)

  const session = React.useMemo(() => {
    const targetId = sessionIdFromUrl ?? activeSessionId
    if (!targetId) return null
    return sessions.find((item) => item.id === targetId && item.gameId === 'derocher') ?? null
  }, [sessions, sessionIdFromUrl, activeSessionId])

  React.useEffect(() => {
    if (session && session.id !== activeSessionId) {
      setActiveSession(session.id)
    }
  }, [session, activeSessionId, setActiveSession])

  if (!session) {
    return (
      <div className="min-h-screen bg-bg">
        <Topbar title="Salon Derocher" back />
        <div className="mx-auto max-w-xl px-4 py-6">
          <Card className="text-sm text-muted">Aucune session Derocher active.</Card>
        </div>
      </div>
    )
  }

  const localPlayer = session.players.find((player) => player.id === localPlayerId)
  const isHost = localPlayer?.isHost ?? false
  const readyPlayers = session.players.filter((player) => player.status === 'ready').length
  const canStart = isHost && readyPlayers >= 2

  const handleToggleReady = () => {
    if (!localPlayer) return
    toggleReady(session.id, localPlayer.id)
  }

  const handleAddBot = () => {
    addBotToSession(session.id)
  }

  const handleStart = () => {
    initializeDerocher(session, session.players)
    startSession(session.id)
    navigate(`/derocher/game?session=${session.id}`)
  }

  return (
    <div className="min-h-screen bg-bg">
      <Topbar title="Salon Derocher" subtitle="Jeu d adresse" back />
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-24 pt-4">
        <Card className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Mode</p>
            <p className="text-lg font-semibold text-txt">
              {session.mode === 'turn-based' ? 'Tour par tour' : 'Temps reel'}
            </p>
          </div>
          <div className="text-xs text-muted">
            Hote: {session.players.find((player) => player.isHost)?.name ?? 'Inconnu'}
          </div>
        </Card>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">
              Joueurs ({session.players.length}/{session.maxPlayers})
            </h2>
            {session.options.allowBots && isHost ? (
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
                      {player.isHost ? ' (Hote)' : ''}
                      {player.id === localPlayerId ? ' (Vous)' : ''}
                    </p>
                    <p className="text-xs text-muted">{player.status === 'ready' ? 'Pret' : 'En attente'}</p>
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
                    {player.status === 'ready' ? 'Pret' : 'Se tenir pret'}
                  </button>
                ) : null}
              </Card>
            ))}
          </div>
        </section>

        <Card className="text-sm text-muted">
          Retirez les blocs un par un sans faire tomber la structure. Chaque bloc rapporte un nombre de points
          different. En mode tour par tour, vous pouvez quitter le salon et revenir plus tard pour jouer votre coup.
        </Card>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            onClick={handleToggleReady}
            className="rounded-2xl border border-border/60 px-4 py-2 text-sm font-semibold text-muted transition hover:border-primary/50 hover:text-primary focus-ring"
          >
            {localPlayer?.status === 'ready' ? 'Annuler Pret' : 'Je suis pret'}
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

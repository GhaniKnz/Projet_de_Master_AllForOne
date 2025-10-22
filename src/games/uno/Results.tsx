import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useUnoStore } from '../../store/uno'
import { useGamesStore } from '../../store/games'
import Card from '../../components/Card'
import Topbar from '../../components/Topbar'

export default function UnoResults() {
  const navigate = useNavigate()
  const { sessionId, results, players, reset } = useUnoStore((state) => ({
    sessionId: state.sessionId,
    results: state.results,
    players: state.players,
    reset: state.reset
  }))
  const { setActiveSession, completeSession } = useGamesStore((state) => ({
    setActiveSession: state.setActiveSession,
    completeSession: state.completeSession
  }))

  React.useEffect(() => {
    if (sessionId) {
      completeSession(sessionId)
      setActiveSession(sessionId)
    }
  }, [sessionId, setActiveSession, completeSession])

  const winners = results.map((playerId) => {
    const player = players.find((p) => p.id === playerId)
    return player?.name ?? playerId
  })

  return (
    <div className="min-h-screen bg-bg">
      <Topbar title="Fin de partie" back />
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-20 pt-6">
        <Card className="bg-gradient-to-br from-primary/10 via-white to-accent/10">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Bravo</p>
          <h1 className="mt-2 text-2xl font-semibold text-txt">Partie terminee</h1>
          <p className="mt-2 text-sm text-muted">
            Consultez le classement ci-dessous et lancez une revanche pour conserver la dynamique.
          </p>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">Classement</h2>
          {winners.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Aucun gagnant enregistre.</p>
          ) : (
            <ol className="mt-3 space-y-2">
              {winners.map((name, index) => (
                <li key={name} className="flex items-center justify-between rounded-2xl bg-bg px-4 py-3 text-sm text-txt">
                  <span>
                    #{index + 1} {name}
                  </span>
                  {index === 0 ? (
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Vainqueur</span>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </Card>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            onClick={() => {
              reset()
              if (sessionId) navigate(`/uno/lobby?session=${sessionId}`)
              else navigate('/games')
            }}
            className="rounded-2xl border border-border/60 px-4 py-2 text-sm font-semibold text-muted transition hover:border-primary/50 hover:text-primary focus-ring"
          >
            Retour au salon
          </button>
          <button
            onClick={() => {
              reset()
              navigate('/games')
            }}
            className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-primary/90 focus-ring"
          >
            Voir d autres jeux
          </button>
        </div>
      </div>
    </div>
  )
}

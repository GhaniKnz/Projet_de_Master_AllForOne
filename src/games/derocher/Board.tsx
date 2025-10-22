import React from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Topbar from '../../components/Topbar'
import Card from '../../components/Card'
import { useDerocherStore } from '../../store/derocher'
import { useGamesStore } from '../../store/games'

export default function DerocherBoard() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session')
  const { activeSessionId } = useGamesStore((state) => ({
    activeSessionId: state.activeSessionId
  }))

  React.useEffect(() => {
    if (sessionId && sessionId !== activeSessionId) {
      navigate(`/derocher/lobby?session=${sessionId}`, { replace: true })
    }
  }, [sessionId, activeSessionId, navigate])

  const { players, structure, currentPlayerIndex, takeBlock, activityLog } = useDerocherStore((state) => ({
    players: state.players,
    structure: state.structure,
    currentPlayerIndex: state.currentPlayerIndex,
    takeBlock: state.takeBlock,
    activityLog: state.activityLog
  }))

  const currentPlayer = players[currentPlayerIndex]

  return (
    <div className="min-h-screen bg-bg">
      <Topbar title="Derocher" subtitle="Retirez un bloc sans tout faire tomber" back />
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-20 pt-6">
        <section className="grid gap-3 sm:grid-cols-2">
          {players.map((player) => (
            <Card
              key={player.id}
              className={`flex items-center justify-between ${player.id === currentPlayer?.id ? 'border-primary/50 shadow-card' : ''}`}
            >
              <div>
                <p className="text-sm font-semibold text-txt">{player.name}</p>
                <p className="text-xs text-muted">{player.status === 'eliminated' ? 'Elimine' : 'Points: ' + player.points}</p>
              </div>
            </Card>
          ))}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">Structure</h2>
          <Card className="grid grid-cols-2 gap-2">
            {structure.length === 0 ? (
              <p className="col-span-2 text-sm text-muted">Plus aucun bloc disponible.</p>
            ) : (
              structure.map((block) => (
                <button
                  key={block.id}
                  onClick={() => takeBlock(block.id)}
                  className="rounded-2xl border border-border/60 px-3 py-3 text-left text-sm text-txt transition hover:border-primary/50 hover:text-primary focus-ring"
                >
                  <div className="font-semibold">{block.label}</div>
                  <div className="text-xs text-muted">Stabilite {block.stability}% · {block.points} pts</div>
                </button>
              ))
            )}
          </Card>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">Journal</h2>
          <Card className="space-y-2 text-xs text-muted">
            {activityLog.length === 0 ? <p>En attente du premier coup.</p> : null}
            {activityLog.map((entry, index) => (
              <p key={`${entry}-${index}`}>{entry}</p>
            ))}
          </Card>
        </section>
      </div>
    </div>
  )
}

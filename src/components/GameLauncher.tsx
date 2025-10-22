import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Gamepad2, Users, Rocket, X } from 'lucide-react'
import { useUIStore } from '../store/ui'
import { useAppStore } from '../store/app'
import { useGamesStore, GameId } from '../store/games'
import { buildSessionPlayer } from '../utils/sessionPlayer'

type LauncherGame = {
  id: GameId
  name: string
  description: string
}

const GAMES: LauncherGame[] = [
  { id: 'uno', name: 'UNO', description: 'Classique incontournable. Parties courtes et rythme rapide.' },
  { id: 'uno-no-mercy', name: 'UNO No Mercy', description: 'Variante competitive. Combos +10 et elimination.' },
  { id: 'derocher', name: 'Derocher', description: 'Jeu d adresse original. Mode temps reel ou tour par tour.' }
]

const iconForGame = (gameId: GameId) => {
  switch (gameId) {
    case 'uno':
      return <Gamepad2 className="h-5 w-5" />
    case 'uno-no-mercy':
      return <Users className="h-5 w-5" />
    case 'derocher':
    default:
      return <Rocket className="h-5 w-5" />
  }
}

export default function GameLauncher() {
  const navigate = useNavigate()
  const { launcherOpen, closeLauncher } = useUIStore((state) => ({
    launcherOpen: state.launcherOpen,
    closeLauncher: state.closeLauncher
  }))
  const user = useAppStore((state) => state.user)
  const quickPlay = useGamesStore((state) => state.quickPlay)

  if (!launcherOpen) return null

  const handleQuickPlay = (gameId: GameId) => {
    const session = quickPlay({
      gameId,
      player: buildSessionPlayer(user)
    })

    closeLauncher()
    if (session.gameId === 'uno' || session.gameId === 'uno-no-mercy') {
      navigate(`/uno/lobby?session=${session.id}`)
      return
    }
    if (session.gameId === 'derocher') {
      navigate(`/derocher/lobby?session=${session.id}`)
      return
    }
    navigate('/games')
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Choisir un jeu a lancer"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/20 backdrop-blur-sm transition duration-200 md:items-center"
    >
      <div className="absolute inset-0" onClick={closeLauncher} aria-hidden />
      <div className="safe-area relative w-full max-w-md rounded-t-3xl border border-white/70 bg-surface p-6 shadow-card md:rounded-3xl">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Lancez une partie</p>
            <h2 className="mt-1 text-2xl font-semibold">Choisissez votre jeu</h2>
          </div>
          <button
            onClick={closeLauncher}
            className="rounded-full border border-border/60 p-2 text-muted transition hover:bg-panel focus-ring"
            aria-label="Fermer le lanceur"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <ul className="mt-6 space-y-3">
          {GAMES.map((game) => (
            <li key={game.id}>
              <button
                onClick={() => handleQuickPlay(game.id)}
                className="w-full rounded-2xl border border-border/60 bg-bg px-4 py-4 text-left transition hover:border-primary/40 hover:bg-primaryMuted focus-ring"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-soft">
                    {iconForGame(game.id)}
                  </span>
                  <div>
                    <p className="text-base font-semibold">{game.name}</p>
                    <p className="text-sm text-muted">{game.description}</p>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

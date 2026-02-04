import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useUnoStore } from '../../store/uno'
import { useGamesStore } from '../../store/games'
import { api, getCurrentUser, GameEndResult } from '../../lib/api'
import Card from '../../components/Card'
import Topbar from '../../components/Topbar'

export default function UnoResults() {
  const navigate = useNavigate()
  const { sessionId, variant, results, players, reset } = useUnoStore((state) => ({
    sessionId: state.sessionId,
    variant: state.variant,
    results: state.results,
    players: state.players,
    reset: state.reset
  }))
  const { setActiveSession, completeSession } = useGamesStore((state) => ({
    setActiveSession: state.setActiveSession,
    completeSession: state.completeSession
  }))

  const [gameEndData, setGameEndData] = React.useState<GameEndResult | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [showTrophyAnimation, setShowTrophyAnimation] = React.useState(false)

  const currentUser = getCurrentUser()
  const winnerId = results[0]
  const isWinner = currentUser?.userId === winnerId

  React.useEffect(() => {
    const handleGameEnd = async () => {
      if (sessionId) {
        completeSession(sessionId)
        setActiveSession(sessionId)
      }

      // Appeler l'API pour enregistrer les stats et obtenir l'XP
      if (currentUser?.userId) {
        try {
          const gameId = variant === 'no-mercy' ? 'uno-no-mercy' : 'uno'
          const result = await api.endGame({
            gameId,
            sessionId: sessionId ?? undefined,
            isWinner,
            playerCount: players.length
          })
          setGameEndData(result)

          // Afficher l'animation des trophées si nouveaux
          if (result.newTrophies.length > 0) {
            setShowTrophyAnimation(true)
          }

          // Supprimer la session après la fin de partie
          if (sessionId) {
            await api.deleteSession(sessionId).catch(() => {})
          }
        } catch (err) {
          console.error('Failed to end game:', err)
        }
      }
      setLoading(false)
    }

    handleGameEnd()
  }, [sessionId, setActiveSession, completeSession, currentUser?.userId, isWinner, variant, players.length])

  const winners = results.map((playerId) => {
    const player = players.find((p) => p.id === playerId)
    return { id: playerId, name: player?.name ?? playerId }
  })

  return (
    <div className="min-h-screen bg-bg">
      <Topbar title="Fin de partie" back />
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-20 pt-6">
        {/* Résultat principal */}
        <Card className={`bg-gradient-to-br ${isWinner ? 'from-yellow-400/20 via-amber-100 to-orange-400/20' : 'from-primary/10 via-white to-accent/10'}`}>
          <p className="text-xs uppercase tracking-[0.3em] text-muted">{isWinner ? '🏆 Victoire!' : 'Partie terminée'}</p>
          <h1 className="mt-2 text-2xl font-semibold text-txt">
            {isWinner ? 'Félicitations!' : 'Bien joué!'}
          </h1>
          {loading ? (
            <p className="mt-2 text-sm text-muted">Calcul des récompenses...</p>
          ) : gameEndData ? (
            <div className="mt-4 space-y-3">
              {/* XP gagné */}
              <div className="flex items-center gap-3">
                <span className="text-2xl">✨</span>
                <div>
                  <p className="text-lg font-bold text-primary">+{gameEndData.xpGained} XP</p>
                  <p className="text-xs text-muted">Total: {gameEndData.totalXp} XP</p>
                </div>
              </div>

              {/* Level up */}
              {gameEndData.leveledUp && (
                <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 p-3">
                  <span className="text-2xl">🎉</span>
                  <div>
                    <p className="text-sm font-bold text-purple-600">Niveau supérieur!</p>
                    <p className="text-xs text-muted">Vous êtes maintenant niveau {gameEndData.level}</p>
                  </div>
                </div>
              )}

              {/* Barre de progression XP */}
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>Niveau {gameEndData.level}</span>
                  <span>{Math.round(gameEndData.progression.progressToNext)} / {gameEndData.progression.xpForNext} XP</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-1000"
                    style={{ width: `${(gameEndData.progression.progressToNext / gameEndData.progression.xpForNext) * 100}%` }}
                  />
                </div>
              </div>

              {/* Série de victoires */}
              {isWinner && gameEndData.currentWinStreak > 1 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-orange-500">🔥</span>
                  <span className="text-muted">Série de {gameEndData.currentWinStreak} victoires!</span>
                </div>
              )}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">
              Consultez le classement ci-dessous.
            </p>
          )}
        </Card>

        {/* Nouveaux trophées */}
        {showTrophyAnimation && gameEndData?.newTrophies && gameEndData.newTrophies.length > 0 && (
          <Card className="border-2 border-yellow-400/50 bg-gradient-to-br from-yellow-50 to-amber-50">
            <p className="text-xs uppercase tracking-[0.3em] text-amber-600">🏆 Nouveaux trophées débloqués!</p>
            <div className="mt-3 space-y-2">
              {gameEndData.newTrophies.map((trophy) => (
                <div key={trophy.id} className="flex items-center gap-3 rounded-xl bg-white/80 p-3 shadow-sm">
                  <span className="text-3xl">{trophy.icon}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-txt">{trophy.name}</p>
                    <p className="text-xs text-primary">+{trophy.xpReward} XP</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Classement */}
        <Card>
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">Classement</h2>
          {winners.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Aucun gagnant enregistré.</p>
          ) : (
            <ol className="mt-3 space-y-2">
              {winners.map((winner, index) => (
                <li key={winner.id} className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm ${
                  winner.id === currentUser?.userId ? 'bg-primary/10 text-primary' : 'bg-bg text-txt'
                }`}>
                  <span className="flex items-center gap-2">
                    {index === 0 && <span>🥇</span>}
                    {index === 1 && <span>🥈</span>}
                    {index === 2 && <span>🥉</span>}
                    {index > 2 && <span className="text-muted">#{index + 1}</span>}
                    {winner.name}
                    {winner.id === currentUser?.userId && <span className="text-xs text-muted">(vous)</span>}
                  </span>
                  {index === 0 && (
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Vainqueur</span>
                  )}
                </li>
              ))}
            </ol>
          )}
        </Card>

        {/* Actions */}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            onClick={() => {
              reset()
              navigate('/games')
            }}
            className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-primary/90 focus-ring"
          >
            Retour aux jeux
          </button>
        </div>
      </div>
    </div>
  )
}

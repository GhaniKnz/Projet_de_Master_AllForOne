import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useUnoStore, UnoPlayer } from '../../store/uno'
import { useGamesStore } from '../../store/games'
import Topbar from '../../components/Topbar'
import Card from '../../components/Card'
import { cssClass, label, Color } from './engine'

const WILD_COLORS = [
  { key: 'R', label: 'Rouge', className: 'bg-red-500' },
  { key: 'G', label: 'Vert', className: 'bg-green-500' },
  { key: 'B', label: 'Bleu', className: 'bg-blue-500' },
  { key: 'Y', label: 'Jaune', className: 'bg-yellow-400 text-black' }
] as const

export default function UnoUI() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionIdFromUrl = searchParams.get('session') ?? null
  const localPlayerId = useGamesStore((state) => state.localPlayerId)

  const {
    sessionId,
    variant,
    rules,
    players,
    discard,
    turn,
    pendingDraw,
    forcedColor,
    rouletteColor,
    started,
    playCard,
    drawCard,
    callUno
  } = useUnoStore((state) => ({
    sessionId: state.sessionId,
    variant: state.variant,
    rules: state.rules,
    players: state.players,
    discard: state.discard,
    turn: state.turn,
    pendingDraw: state.pendingDraw,
    forcedColor: state.forcedColor,
    rouletteColor: state.rouletteColor,
    started: state.started,
    playCard: state.playCard,
    drawCard: state.drawCard,
    callUno: state.callUno
  }))

  React.useEffect(() => {
    if (sessionIdFromUrl && sessionId && sessionIdFromUrl !== sessionId) {
      navigate(`/uno/lobby?session=${sessionId}`, { replace: true })
    }
  }, [sessionIdFromUrl, sessionId, navigate])

  const orderedPlayers = orderPlayers(players, localPlayerId)
  const myPlayer = orderedPlayers.find((player) => player.isLocal) ?? orderedPlayers[0]
  const myIndex = players.findIndex((player) => player.id === myPlayer.id)

  const topCard = discard[discard.length - 1]
  const isMyTurn = started && myIndex === turn && myPlayer.status !== 'eliminated'

  const [colorPickerIndex, setColorPickerIndex] = React.useState<number | null>(null)

  const handlePlay = (index: number) => {
    if (!myPlayer || myPlayer.status === 'eliminated') return
    const card = myPlayer.hand[index]
    if (!card) return
    if (card.type === 'wild') {
      setColorPickerIndex(index)
      return
    }
    playCard(index)
  }

  const handleColorSelect = (colorKey: string) => {
    if (colorPickerIndex === null) return
    playCard(colorPickerIndex, colorKey as any)
    setColorPickerIndex(null)
  }

  const handleDraw = () => {
    setColorPickerIndex(null)
    drawCard()
  }

  const handleCallUno = () => {
    if (!myPlayer) return
    callUno(myPlayer.id)
  }

  return (
    <div className="min-h-screen bg-bg">
      <Topbar
        title="UNO"
        subtitle={variant === 'no-mercy' ? 'Variante No Mercy' : 'Version classique'}
        back
        right={
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Tour {turn + 1}/{players.length}
          </span>
        }
      />

      <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-28 pt-4">
        <section className="grid gap-3 sm:grid-cols-2">
          {orderedPlayers.map((player) => (
            <Card
              key={player.id}
              className={`flex items-center justify-between ${player.status === 'eliminated' ? 'opacity-50' : ''} ${
                player.isLocal ? 'border-primary/50 shadow-card' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {player.avatar}
                </span>
                <div>
                  <p className="text-sm font-semibold text-txt">
                    {player.name}
                    {player.isLocal ? ' (Vous)' : ''}
                  </p>
                  <p className="text-xs text-muted">
                    {player.status === 'eliminated'
                      ? 'Elimine'
                      : `${player.hand.length} carte${player.hand.length > 1 ? 's' : ''}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs">
                {player.id === players[turn]?.id && player.status !== 'eliminated' ? (
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">A toi</span>
                ) : null}
                {player.hand.length === 1 && !player.hasCalledUno ? (
                  <span className="rounded-full bg-danger/10 px-2 py-1 text-danger">UNO</span>
                ) : null}
              </div>
            </Card>
          ))}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">Plateau</h2>
          <Card className="flex items-center justify-between bg-gradient-to-r from-primary/10 via-white to-accent/10">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Carte active</p>
              <p className="mt-2 text-lg font-semibold text-txt">
                {topCard ? label(topCard, topCard.color as Color) : 'Aucune'}
              </p>
              {forcedColor ? (
                <p className="text-xs text-muted">Couleur imposee: {renderColor(forcedColor)}</p>
              ) : null}
              {pendingDraw > 0 ? (
                <p className="text-xs text-danger">Penalite: +{pendingDraw} cartes</p>
              ) : null}
              {rouletteColor ? (
                <p className="text-xs text-accent">Roulette couleur: {renderColor(rouletteColor)}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex h-24 w-16 items-center justify-center rounded-2xl border-2 border-dashed border-border/80 bg-bg text-xs text-muted">
                Pioche
              </div>
              <div
                className={`flex h-24 w-16 items-center justify-center rounded-2xl text-sm font-semibold ${
                  topCard ? cssClass(topCard) : 'bg-panel text-txt'
                }`}
              >
                {topCard ? topCard.value : ''}
              </div>
            </div>
          </Card>
        </section>

        {variant === 'no-mercy' && rules.eliminationThreshold ? (
          <Card className="flex items-center gap-3 text-xs text-muted">
            <span className="rounded-full bg-danger/10 px-2 py-1 text-danger font-semibold">No Mercy</span>
            Elimination si un joueur atteint {rules.eliminationThreshold} cartes.
          </Card>
        ) : null}

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">Votre main</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCallUno}
                className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-2 text-xs font-semibold text-danger transition hover:bg-danger/20 focus-ring disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!myPlayer || myPlayer.hand.length !== 1 || myPlayer.hasCalledUno}
              >
                UNO !
              </button>
              <button
                onClick={handleDraw}
                className="rounded-2xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-card transition hover:bg-primary/90 focus-ring"
                disabled={!isMyTurn}
              >
                Piocher
              </button>
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-3">
            {myPlayer?.hand.map((card, index) => (
              <button
                key={`${card.value}-${index}`}
                onClick={() => handlePlay(index)}
                disabled={!isMyTurn}
                className={`min-w-[100px] rounded-2xl px-4 py-6 text-base font-semibold text-white shadow-card transition focus-ring disabled:cursor-not-allowed disabled:opacity-40 ${cssClass(
                  card
                )}`}
              >
                {card.type === 'wild' && card.color ? label(card, card.color as Color) : card.value}
              </button>
            ))}
          </div>

          {colorPickerIndex !== null ? (
            <Card className="space-y-3">
              <p className="text-sm font-semibold text-txt">Choisissez la couleur du joker</p>
              <div className="flex gap-3">
                {WILD_COLORS.map((color) => (
                  <button
                    key={color.key}
                    onClick={() => handleColorSelect(color.key)}
                    className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-card focus-ring ${color.className}`}
                  >
                    {color.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setColorPickerIndex(null)}
                className="w-full rounded-2xl border border-border/60 px-4 py-2 text-xs font-semibold text-muted transition hover:border-primary/50 hover:text-primary focus-ring"
              >
                Annuler
              </button>
            </Card>
          ) : null}
        </section>
      </div>
    </div>
  )
}

function orderPlayers(players: UnoPlayer[], localPlayerId: string | null) {
  if (!players || players.length === 0) return []
  const index = players.findIndex((player) => player.id === localPlayerId)
  if (index === -1) {
    return players.map((player) => ({ ...player, isLocal: false }))
  }
  const ordered = [...players.slice(index), ...players.slice(0, index)]
  return ordered.map((player, idx) => ({
    ...player,
    isLocal: idx === 0
  }))
}

function renderColor(color: Color) {
  switch (color) {
    case 'R':
      return 'Rouge'
    case 'G':
      return 'Vert'
    case 'B':
      return 'Bleu'
    case 'Y':
      return 'Jaune'
    default:
      return color
  }
}

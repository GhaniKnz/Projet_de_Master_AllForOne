import React from 'react'
import { Card as CardType, Color } from '../engine'

type GameTableProps = {
  topCard: CardType | null
  forcedColor?: Color
  pendingDraw: number
  deckCount: number
  onDrawClick: () => void
  isMyTurn: boolean
  lastPlayedAnimation?: boolean
  direction: number
}

export default function GameTable({
  topCard,
  forcedColor,
  pendingDraw,
  deckCount,
  onDrawClick,
  isMyTurn,
  lastPlayedAnimation = false,
  direction
}: GameTableProps) {
  const [showEffect, setShowEffect] = React.useState(false)

  React.useEffect(() => {
    if (lastPlayedAnimation) {
      setShowEffect(true)
      const timer = setTimeout(() => setShowEffect(false), 800)
      return () => clearTimeout(timer)
    }
  }, [lastPlayedAnimation])

  return (
    <div className="relative w-full max-w-lg mx-auto py-4">
      {/* Space nebula container - no green felt */}
      <div className="relative rounded-3xl p-6 sm:p-8">
        <div className="flex items-center justify-center gap-6 sm:gap-10">
          {/* Draw pile - Space themed */}
          <button
            onClick={onDrawClick}
            disabled={!isMyTurn}
            className={`
              relative group transition-all duration-300
              ${isMyTurn ? 'hover:scale-110 hover:-translate-y-3 cursor-pointer' : 'opacity-70 cursor-not-allowed'}
            `}
          >
            {/* Glow effect behind deck */}
            <div className="absolute inset-0 bg-purple-500/30 rounded-2xl blur-xl scale-110 group-hover:bg-purple-400/50 transition-all" />
            
            {/* Stack effect - 3D depth */}
            {[...Array(Math.min(4, Math.floor(deckCount / 15)))].map((_, i) => (
              <div
                key={i}
                className="absolute w-20 h-28 sm:w-24 sm:h-32 rounded-2xl"
                style={{
                  transform: `translateY(${-i * 3}px) translateX(${i * 1}px) rotate(${i * 0.5}deg)`,
                  zIndex: i,
                  background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)',
                  border: '2px solid rgba(168, 85, 247, 0.3)',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)'
                }}
              />
            ))}

            {/* Top card of deck - Space design */}
            <div className="relative w-20 h-28 sm:w-24 sm:h-32 rounded-2xl overflow-hidden shadow-2xl border-2 border-purple-500/50"
              style={{
                background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)',
              }}
            >
              {/* Star pattern background */}
              <div className="absolute inset-0 opacity-30">
                {[...Array(15)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-1 h-1 bg-white rounded-full"
                    style={{
                      top: `${(i * 7 + 5) % 100}%`,
                      left: `${(i * 11 + 8) % 100}%`,
                      opacity: 0.4 + (i % 3) * 0.2
                    }}
                  />
                ))}
              </div>

              {/* Nebula swirl */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-purple-600/40 via-pink-500/30 to-blue-500/40 blur-md animate-spin-slow" />
              </div>

              {/* UNO logo */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl px-3 py-1.5 transform -rotate-12 shadow-lg"
                  style={{ boxShadow: '0 0 20px rgba(168, 85, 247, 0.5)' }}
                >
                  <span className="text-lg sm:text-xl font-black text-white italic tracking-tight">UNO</span>
                </div>
              </div>

              {/* Count badge */}
              <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg border border-white/20">
                {deckCount}
              </div>
            </div>

            {/* Draw indicator */}
            {isMyTurn && (
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <span className="text-xs text-cyan-400 font-medium px-3 py-1 bg-black/50 rounded-full border border-cyan-500/30 animate-pulse">
                  ✨ Cliquez pour piocher
                </span>
              </div>
            )}
          </button>

          {/* Discard pile */}
          <div className="relative">
            {/* Card glow effect - only when card is played */}
            {showEffect && topCard && (
              <>
                <div 
                  className={`absolute inset-0 rounded-2xl blur-xl scale-110 transition-all ${getGlowColor(topCard)}`}
                  style={{ opacity: 0.7 }}
                />
                <div className="absolute inset-0 bg-white/40 rounded-2xl animate-ping" />
              </>
            )}

            {topCard ? (
              <div
                className={`
                  relative w-20 h-28 sm:w-24 sm:h-32 rounded-2xl shadow-2xl overflow-hidden
                  ${getCardGradient(topCard)}
                  ${lastPlayedAnimation ? 'animate-card-play' : ''}
                  border-3 border-white/40
                `}
              >
                {/* Central ellipse */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-20 sm:w-16 sm:h-24 bg-white/95 rounded-[50%] transform rotate-12 flex items-center justify-center shadow-inner">
                    <span
                      className={`text-2xl sm:text-3xl font-black transform -rotate-12 ${getCardTextColor(topCard)}`}
                    >
                      {getCardDisplay(topCard)}
                    </span>
                  </div>
                </div>

                {/* Corner values */}
                <span className="absolute top-2 left-2 text-xs sm:text-sm font-bold text-white drop-shadow-lg">
                  {getCardDisplay(topCard)}
                </span>
                <span className="absolute bottom-2 right-2 text-xs sm:text-sm font-bold text-white drop-shadow-lg rotate-180">
                  {getCardDisplay(topCard)}
                </span>

                {/* Forced color indicator */}
                {forcedColor && topCard.type === 'wild' && (
                  <div
                    className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full border-3 border-white shadow-lg ${getColorClass(forcedColor)}`}
                    style={{ boxShadow: `0 0 10px ${getColorHex(forcedColor)}` }}
                  />
                )}
              </div>
            ) : (
              <div className="w-20 h-28 sm:w-24 sm:h-32 rounded-2xl border-2 border-dashed border-white/30 flex items-center justify-center bg-white/5 backdrop-blur-sm">
                <span className="text-white/50 text-xs">Défausse</span>
              </div>
            )}

            {/* Pending draw indicator */}
            {pendingDraw > 0 && (
              <div 
                className="absolute -top-4 -right-4 bg-gradient-to-r from-red-500 to-orange-500 text-white text-lg font-black px-3 py-1.5 rounded-full shadow-lg animate-bounce border-2 border-white/50"
                style={{ boxShadow: '0 0 20px rgba(239, 68, 68, 0.6)' }}
              >
                +{pendingDraw}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function getCardGradient(card: CardType): string {
  if (card.type === 'wild') {
    return 'bg-gradient-to-br from-red-500 via-yellow-500 via-green-500 to-blue-500'
  }
  switch (card.color) {
    case 'R': return 'bg-gradient-to-br from-red-400 via-red-500 to-red-700'
    case 'G': return 'bg-gradient-to-br from-emerald-400 via-green-500 to-green-700'
    case 'B': return 'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-700'
    case 'Y': return 'bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-500'
    default: return 'bg-gradient-to-br from-gray-600 to-gray-800'
  }
}

function getGlowColor(card: CardType): string {
  if (card.type === 'wild') return 'bg-purple-500'
  switch (card.color) {
    case 'R': return 'bg-red-500'
    case 'G': return 'bg-green-500'
    case 'B': return 'bg-blue-500'
    case 'Y': return 'bg-yellow-400'
    default: return 'bg-gray-500'
  }
}

function getGlowHex(card: CardType): string {
  if (card.type === 'wild') return 'rgba(168, 85, 247, 0.5)'
  switch (card.color) {
    case 'R': return 'rgba(239, 68, 68, 0.5)'
    case 'G': return 'rgba(34, 197, 94, 0.5)'
    case 'B': return 'rgba(59, 130, 246, 0.5)'
    case 'Y': return 'rgba(250, 204, 21, 0.5)'
    default: return 'rgba(107, 114, 128, 0.5)'
  }
}

function getCardTextColor(card: CardType): string {
  if (card.type === 'wild') return 'text-transparent bg-clip-text bg-gradient-to-br from-red-500 via-green-500 to-blue-500'
  switch (card.color) {
    case 'R': return 'text-red-600'
    case 'G': return 'text-green-600'
    case 'B': return 'text-blue-600'
    case 'Y': return 'text-yellow-600'
    default: return 'text-gray-600'
  }
}

function getColorClass(color: Color): string {
  switch (color) {
    case 'R': return 'bg-red-500'
    case 'G': return 'bg-green-500'
    case 'B': return 'bg-blue-500'
    case 'Y': return 'bg-yellow-400'
    default: return 'bg-gray-500'
  }
}

function getColorHex(color: Color): string {
  switch (color) {
    case 'R': return 'rgba(239, 68, 68, 0.8)'
    case 'G': return 'rgba(34, 197, 94, 0.8)'
    case 'B': return 'rgba(59, 130, 246, 0.8)'
    case 'Y': return 'rgba(250, 204, 21, 0.8)'
    default: return 'rgba(107, 114, 128, 0.8)'
  }
}

function getCardDisplay(card: CardType): string {
  const actionIcons: Record<string, string> = {
    S: '⊘',
    R: '↺',
    D2: '+2',
    SE: '⊘∀',
    DA: '∀',
    W: '🎨',
    W4: '+4',
    W6: '+6',
    W10: '+10',
    WR4: '↺+4',
    WR: '🎰'
  }
  return actionIcons[card.value] || card.value
}

import React from 'react'
import { Card as CardType, Color } from '../engine'

type UnoCard3DProps = {
  card: CardType
  onClick?: () => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  flipped?: boolean
  highlighted?: boolean
  animationDelay?: number
  isNew?: boolean
}

const CARD_DESIGNS: Record<string, { gradient: string; pattern: string; textColor: string }> = {
  R: {
    gradient: 'from-red-500 via-red-600 to-red-700',
    pattern: 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.15) 0%, transparent 50%)',
    textColor: 'text-white'
  },
  G: {
    gradient: 'from-emerald-400 via-green-500 to-green-700',
    pattern: 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.15) 0%, transparent 50%)',
    textColor: 'text-white'
  },
  B: {
    gradient: 'from-blue-400 via-blue-500 to-blue-700',
    pattern: 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.15) 0%, transparent 50%)',
    textColor: 'text-white'
  },
  Y: {
    gradient: 'from-yellow-300 via-yellow-400 to-amber-500',
    pattern: 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.2) 0%, transparent 50%)',
    textColor: 'text-gray-900'
  },
  wild: {
    gradient: 'from-purple-500 via-pink-500 to-orange-500',
    pattern: 'conic-gradient(from 0deg, #ef4444, #22c55e, #3b82f6, #eab308, #ef4444)',
    textColor: 'text-white'
  }
}

const ACTION_ICONS: Record<string, string> = {
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

const SIZE_CLASSES = {
  sm: 'w-16 h-24',
  md: 'w-24 h-36',
  lg: 'w-32 h-48'
}

const FONT_SIZES = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-4xl'
}

export default function UnoCard3D({
  card,
  onClick,
  disabled = false,
  size = 'md',
  flipped = false,
  highlighted = false,
  animationDelay = 0,
  isNew = false
}: UnoCard3DProps) {
  const [isFlipping, setIsFlipping] = React.useState(flipped)
  const [showFront, setShowFront] = React.useState(!flipped)

  React.useEffect(() => {
    if (!flipped && isFlipping) {
      const timer = setTimeout(() => {
        setShowFront(true)
        setIsFlipping(false)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [flipped, isFlipping])

  const design = card.type === 'wild' ? CARD_DESIGNS.wild : CARD_DESIGNS[card.color ?? 'wild']
  const displayValue = ACTION_ICONS[card.value] || card.value
  const isAction = card.type === 'action' || card.type === 'wild'

  return (
    <div
      className={`group relative ${SIZE_CLASSES[size]} perspective-1000`}
      style={{
        animationDelay: `${animationDelay}ms`
      }}
    >
      <button
        onClick={onClick}
        disabled={disabled}
        className={`
          relative w-full h-full transition-all duration-500 transform-style-3d cursor-pointer
          ${isFlipping ? 'animate-card-flip' : ''}
          ${isNew ? 'animate-card-deal' : ''}
          ${!disabled && !flipped ? 'hover:scale-110 hover:-translate-y-4 hover:rotate-2 hover:shadow-2xl' : ''}
          ${highlighted ? 'ring-4 ring-yellow-400 ring-opacity-75 animate-pulse-subtle' : ''}
          ${disabled ? 'cursor-not-allowed opacity-60' : ''}
          focus:outline-none focus:ring-4 focus:ring-primary/50
        `}
        aria-label={`Carte ${card.type === 'wild' ? 'Joker' : card.color} ${card.value}`}
      >
        {/* Face avant */}
        <div
          className={`
            absolute inset-0 w-full h-full rounded-2xl shadow-lg backface-hidden
            bg-gradient-to-br ${design.gradient}
            border-4 border-white/30
            flex flex-col items-center justify-center
            overflow-hidden
            ${showFront ? 'block' : 'hidden'}
          `}
          style={{
            backgroundImage: card.type === 'wild' ? design.pattern : undefined
          }}
        >
          {/* Effet de brillance */}
          <div
            className="absolute inset-0 opacity-30"
            style={{ backgroundImage: design.pattern }}
          />

          {/* Cercle central UNO */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className={`
                w-3/4 h-2/3 rounded-full bg-white/90 shadow-inner
                flex items-center justify-center transform rotate-12
                border-4 ${card.type === 'wild' ? 'border-transparent bg-gradient-to-br from-white to-gray-100' : 'border-current opacity-95'}
              `}
              style={{
                boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.1)'
              }}
            >
              <span
                className={`
                  ${FONT_SIZES[size]} font-black transform -rotate-12
                  ${card.type === 'wild' ? 'bg-gradient-to-br from-red-500 via-green-500 to-blue-500 bg-clip-text text-transparent' : ''}
                  ${card.type !== 'wild' ? (card.color === 'Y' ? 'text-yellow-600' : design.textColor.replace('text-', 'text-')) : ''}
                  drop-shadow-sm
                `}
                style={{
                  color: card.type !== 'wild' ? getColorValue(card.color) : undefined
                }}
              >
                {displayValue}
              </span>
            </div>
          </div>

          {/* Coins avec la valeur */}
          <span
            className={`absolute top-2 left-2 ${size === 'sm' ? 'text-xs' : 'text-sm'} font-bold ${design.textColor} drop-shadow-md`}
          >
            {displayValue}
          </span>
          <span
            className={`absolute bottom-2 right-2 ${size === 'sm' ? 'text-xs' : 'text-sm'} font-bold ${design.textColor} drop-shadow-md transform rotate-180`}
          >
            {displayValue}
          </span>

          {/* Logo UNO en filigrane */}
          <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 ${size === 'sm' ? 'text-[6px]' : 'text-[8px]'} font-black ${design.textColor} opacity-50 tracking-widest`}>
            UNO
          </span>
        </div>

        {/* Face arrière */}
        <div
          className={`
            absolute inset-0 w-full h-full rounded-2xl shadow-lg backface-hidden rotate-y-180
            bg-gradient-to-br from-gray-900 via-gray-800 to-black
            border-4 border-red-600
            flex items-center justify-center overflow-hidden
            ${!showFront ? 'block' : 'hidden'}
          `}
        >
          {/* Pattern de fond */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,0,0,0.1) 10px, rgba(255,0,0,0.1) 20px),
                repeating-linear-gradient(-45deg, transparent, transparent 10px, rgba(255,0,0,0.1) 10px, rgba(255,0,0,0.1) 20px)
              `
            }}
          />
          {/* Logo central */}
          <div className="relative z-10 bg-red-600 rounded-2xl px-3 py-2 transform -rotate-12 shadow-lg">
            <span className={`${FONT_SIZES[size]} font-black text-yellow-400 italic tracking-tight`}>
              UNO
            </span>
          </div>
        </div>
      </button>

      {/* Effet de brillance au survol */}
      {!disabled && (
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        </div>
      )}
    </div>
  )
}

function getColorValue(color?: Color): string {
  switch (color) {
    case 'R': return '#dc2626'
    case 'G': return '#16a34a'
    case 'B': return '#2563eb'
    case 'Y': return '#ca8a04'
    default: return '#6b7280'
  }
}

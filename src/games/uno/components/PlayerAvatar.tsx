import React from 'react'
import { Crown, Bot, Clock, AlertTriangle } from 'lucide-react'

type PlayerAvatarProps = {
  id: string
  name: string
  avatar: string
  cardsCount: number
  isCurrentTurn: boolean
  isLocal: boolean
  isHost?: boolean
  isBot?: boolean
  hasCalledUno: boolean
  status: 'playing' | 'waiting' | 'eliminated' | 'finished'
  position: 'top' | 'left' | 'right' | 'bottom'
  timerProgress?: number // 0-100
  profilePicture?: string
  onClick?: () => void
}

const POSITION_CLASSES = {
  top: 'flex-col',
  bottom: 'flex-col-reverse',
  left: 'flex-row',
  right: 'flex-row-reverse'
}

const AVATAR_SIZES = {
  top: 'w-16 h-16 sm:w-20 sm:h-20',
  bottom: 'w-16 h-16 sm:w-20 sm:h-20',
  left: 'w-14 h-14 sm:w-16 sm:h-16',
  right: 'w-14 h-14 sm:w-16 sm:h-16'
}

export default function PlayerAvatar({
  id,
  name,
  avatar,
  cardsCount,
  isCurrentTurn,
  isLocal,
  isHost = false,
  isBot = false,
  hasCalledUno,
  status,
  position,
  timerProgress,
  profilePicture,
  onClick
}: PlayerAvatarProps) {
  const isEliminated = status === 'eliminated'
  const showUnoWarning = cardsCount === 1 && !hasCalledUno && !isEliminated

  return (
    <div
      className={`
        flex items-center gap-2 ${POSITION_CLASSES[position]}
        ${onClick ? 'cursor-pointer' : ''}
        transition-all duration-300
        ${isCurrentTurn ? 'scale-110' : ''}
        ${isEliminated ? 'opacity-50 grayscale' : ''}
      `}
      onClick={onClick}
    >
      {/* Avatar avec indicateurs */}
      <div className="relative">
        {/* Anneau de progression du timer */}
        {isCurrentTurn && timerProgress !== undefined && (
          <svg
            className="absolute -inset-1 w-[calc(100%+8px)] h-[calc(100%+8px)] -rotate-90"
            viewBox="0 0 100 100"
          >
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="4"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={timerProgress > 30 ? '#22c55e' : timerProgress > 10 ? '#eab308' : '#ef4444'}
              strokeWidth="4"
              strokeDasharray={`${timerProgress * 2.83} 283`}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
        )}

        {/* Avatar principal */}
        <div
          className={`
            relative ${AVATAR_SIZES[position]} rounded-full overflow-hidden
            ${isCurrentTurn ? 'ring-4 ring-primary ring-offset-2 ring-offset-bg animate-pulse-subtle' : ''}
            ${isLocal ? 'ring-2 ring-accent' : ''}
            shadow-lg transition-all duration-300
          `}
        >
          {profilePicture ? (
            <img
              src={profilePicture}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className={`
                w-full h-full flex items-center justify-center
                bg-gradient-to-br from-primary/80 to-primary text-white
                text-lg sm:text-xl font-bold
              `}
            >
              {avatar}
            </div>
          )}

          {/* Overlay pour éliminé */}
          {isEliminated && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-2xl">💀</span>
            </div>
          )}
        </div>

        {/* Badge host/bot */}
        {(isHost || isBot) && (
          <div
            className={`
              absolute -top-1 -right-1 w-6 h-6 rounded-full
              flex items-center justify-center shadow-md
              ${isHost ? 'bg-yellow-500' : 'bg-gray-600'}
            `}
          >
            {isHost ? (
              <Crown className="w-3 h-3 text-white" />
            ) : (
              <Bot className="w-3 h-3 text-white" />
            )}
          </div>
        )}

        {/* Indicateur UNO */}
        {showUnoWarning && (
          <div className="absolute -bottom-1 -right-1 animate-bounce">
            <div className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg">
              UNO!
            </div>
          </div>
        )}
      </div>

      {/* Infos joueur */}
      <div className={`text-center ${position === 'left' || position === 'right' ? 'text-left' : ''}`}>
        <p
          className={`
            text-sm font-semibold truncate max-w-[100px]
            ${isLocal ? 'text-accent' : 'text-txt'}
            ${isCurrentTurn ? 'text-primary' : ''}
          `}
        >
          {name}
          {isLocal && ' (Vous)'}
        </p>

        {/* Compteur de cartes */}
        {!isEliminated && (
          <div className="flex items-center justify-center gap-1 mt-1">
            <div className="flex -space-x-1">
              {Array.from({ length: Math.min(cardsCount, 5) }).map((_, i) => (
                <div
                  key={i}
                  className="w-3 h-4 bg-gradient-to-br from-gray-700 to-gray-900 rounded-sm border border-red-600/50 shadow-sm"
                  style={{
                    transform: `rotate(${(i - 2) * 5}deg)`,
                    zIndex: i
                  }}
                />
              ))}
            </div>
            <span className="text-xs text-muted ml-1">
              {cardsCount}
            </span>
          </div>
        )}

        {/* Status */}
        {isEliminated && (
          <span className="text-xs text-red-500 font-medium">Éliminé</span>
        )}
        {status === 'finished' && (
          <span className="text-xs text-green-500 font-medium">Terminé</span>
        )}
      </div>

      {/* Indicateur de tour actif */}
      {isCurrentTurn && !isEliminated && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-primary/90 text-white text-xs px-2 py-1 rounded-full shadow-lg animate-bounce">
          <Clock className="w-3 h-3" />
          <span>À toi!</span>
        </div>
      )}
    </div>
  )
}

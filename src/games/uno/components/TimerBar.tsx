import React from 'react'

type TimerBarProps = {
  timeLeft: number
  maxTime: number
  isActive: boolean
}

export default function TimerBar({ timeLeft, maxTime, isActive }: TimerBarProps) {
  const percentage = maxTime > 0 ? (timeLeft / maxTime) * 100 : 100
  
  const getColor = () => {
    if (percentage > 50) return 'from-green-400 to-green-500'
    if (percentage > 25) return 'from-yellow-400 to-orange-500'
    return 'from-red-400 to-red-600'
  }

  if (!isActive || maxTime === 0) return null

  return (
    <div className="w-full max-w-md mx-auto px-4">
      <div className="relative">
        {/* Background bar */}
        <div className="h-2 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
          {/* Progress bar */}
          <div
            className={`h-full bg-gradient-to-r ${getColor()} rounded-full transition-all duration-1000 ease-linear relative`}
            style={{ width: `${percentage}%` }}
          >
            {/* Glow effect */}
            <div className="absolute inset-0 bg-white/30 animate-pulse rounded-full" />
          </div>
        </div>
        
        {/* Time display */}
        <div className="flex justify-between mt-1">
          <span className="text-xs text-white/50">Temps restant</span>
          <span className={`text-xs font-bold ${percentage <= 25 ? 'text-red-400 animate-pulse' : 'text-white/70'}`}>
            {timeLeft}s
          </span>
        </div>

        {/* Warning animation when low */}
        {percentage <= 25 && (
          <div className="absolute -inset-1 bg-red-500/20 rounded-lg animate-pulse pointer-events-none" />
        )}
      </div>
    </div>
  )
}

import React from 'react'
import { X, UserPlus, Flag, MessageCircle, Trophy, Gamepad2, Calendar, Star } from 'lucide-react'

type PlayerProfileCardProps = {
  player: {
    id: string
    name: string
    avatar: string
    bio?: string
    gamesPlayed?: number
    gamesWon?: number
    joinDate?: string
    level?: number
    isFriend?: boolean
  }
  isOpen: boolean
  onClose: () => void
  onAddFriend?: () => void
  onReport?: () => void
  onMessage?: () => void
}

export default function PlayerProfileCard({
  player,
  isOpen,
  onClose,
  onAddFriend,
  onReport,
  onMessage
}: PlayerProfileCardProps) {
  if (!isOpen) return null

  const winRate = player.gamesPlayed && player.gamesPlayed > 0
    ? Math.round((player.gamesWon ?? 0) / player.gamesPlayed * 100)
    : 0

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm bg-gradient-to-br from-gray-900/95 via-purple-900/90 to-gray-900/95 rounded-3xl border border-white/20 shadow-2xl overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white/80"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with avatar */}
        <div className="relative pt-8 pb-6 px-6 text-center">
          {/* Avatar */}
          <div className="relative inline-block mb-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary via-accent to-purple-500 p-1 shadow-lg shadow-purple-500/30">
              <div className="w-full h-full rounded-full bg-gray-800 flex items-center justify-center text-3xl font-bold text-white">
                {player.avatar}
              </div>
            </div>
            {/* Level badge */}
            {player.level && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                Niv. {player.level}
              </div>
            )}
          </div>

          {/* Name */}
          <h2 className="text-2xl font-bold text-white mb-1">{player.name}</h2>
          
          {/* Status */}
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-green-400">En ligne</span>
          </div>
        </div>

        {/* Bio */}
        {player.bio && (
          <div className="px-6 pb-4">
            <p className="text-white/70 text-sm text-center italic bg-white/5 rounded-2xl px-4 py-3">
              "{player.bio}"
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="px-6 pb-6">
          <div className="grid grid-cols-3 gap-3">
            <StatBox
              icon={<Gamepad2 className="w-4 h-4" />}
              label="Parties"
              value={player.gamesPlayed ?? 0}
            />
            <StatBox
              icon={<Trophy className="w-4 h-4" />}
              label="Victoires"
              value={player.gamesWon ?? 0}
            />
            <StatBox
              icon={<Star className="w-4 h-4" />}
              label="Win Rate"
              value={`${winRate}%`}
            />
          </div>

          {/* Join date */}
          {player.joinDate && (
            <div className="flex items-center justify-center gap-2 mt-4 text-white/50 text-xs">
              <Calendar className="w-3 h-3" />
              <span>Membre depuis {player.joinDate}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 space-y-3">
          <div className="flex gap-3">
            {onAddFriend && (
              <button
                onClick={onAddFriend}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold transition-all
                  ${player.isFriend
                    ? 'bg-white/10 text-white/60'
                    : 'bg-gradient-to-r from-primary to-accent text-white hover:shadow-lg hover:shadow-primary/30'
                  }
                `}
              >
                <UserPlus className="w-5 h-5" />
                {player.isFriend ? 'Ami' : 'Ajouter'}
              </button>
            )}
            {onMessage && (
              <button
                onClick={onMessage}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold bg-white/10 text-white hover:bg-white/20 transition-all"
              >
                <MessageCircle className="w-5 h-5" />
                Message
              </button>
            )}
          </div>

          {onReport && (
            <button
              onClick={onReport}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
            >
              <Flag className="w-4 h-4" />
              Signaler ce joueur
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function StatBox({
  icon,
  label,
  value
}: {
  icon: React.ReactNode
  label: string
  value: string | number
}) {
  return (
    <div className="bg-white/5 rounded-2xl p-3 text-center border border-white/10">
      <div className="flex items-center justify-center gap-1 text-primary mb-1">
        {icon}
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-xs text-white/50">{label}</p>
    </div>
  )
}

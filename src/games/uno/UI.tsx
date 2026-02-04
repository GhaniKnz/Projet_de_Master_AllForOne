import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Volume2, VolumeX, Settings, Zap, Trophy } from 'lucide-react'
import { useUnoStore, UnoPlayer } from '../../store/uno'
import { useGamesStore } from '../../store/games'
import { getSocket } from '../../lib/socket'
import { Color, Card } from './engine'
import { UnoCard3D, PlayerAvatar, GameChat, GameTable, PlayerProfileCard, TimerBar } from './components'

// Types
type ChatMessage = {
  id: string
  senderId: string
  senderName: string
  senderAvatar: string
  content: string
  timestamp: Date
  type: 'text' | 'system' | 'emoji'
}

type PlayerProfile = {
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

// Extended player type with local flag
type OrderedPlayer = UnoPlayer & { isLocal: boolean }

// Position types for player placement
type PlayerPosition = 'bottom' | 'top' | 'left' | 'right'

const WILD_COLORS = [
  { key: 'R', label: 'Rouge', className: 'bg-red-500 hover:bg-red-600', icon: '🔴' },
  { key: 'G', label: 'Vert', className: 'bg-green-500 hover:bg-green-600', icon: '🟢' },
  { key: 'B', label: 'Bleu', className: 'bg-blue-500 hover:bg-blue-600', icon: '🔵' },
  { key: 'Y', label: 'Jaune', className: 'bg-yellow-400 hover:bg-yellow-500 text-black', icon: '🟡' }
] as const

// Sort cards by color then by value
function sortHand(hand: Card[]): Card[] {
  const colorOrder: Record<string, number> = { 'R': 0, 'G': 1, 'B': 2, 'Y': 3, 'W': 4 }
  const valueOrder: Record<string, number> = {
    '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    'S': 10, 'R': 11, 'D2': 12, 'SE': 13, 'DA': 14,
    'W': 15, 'W4': 16, 'W6': 17, 'W10': 18, 'WR4': 19, 'WR': 20
  }
  
  return [...hand].sort((a, b) => {
    const colorA = colorOrder[a.color ?? 'W'] ?? 4
    const colorB = colorOrder[b.color ?? 'W'] ?? 4
    if (colorA !== colorB) return colorA - colorB
    const valueA = valueOrder[a.value] ?? 99
    const valueB = valueOrder[b.value] ?? 99
    return valueA - valueB
  })
}

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
    deck,
    discard,
    turn,
    dir,
    pendingDraw,
    forcedColor,
    rouletteColor,
    started,
    playCard,
    drawCard,
    callUno,
    eliminatePlayer
  } = useUnoStore((state) => ({
    sessionId: state.sessionId,
    variant: state.variant,
    rules: state.rules,
    players: state.players,
    deck: state.deck,
    discard: state.discard,
    turn: state.turn,
    dir: state.dir,
    pendingDraw: state.pendingDraw,
    forcedColor: state.forcedColor,
    rouletteColor: state.rouletteColor,
    started: state.started,
    playCard: state.playCard,
    drawCard: state.drawCard,
    callUno: state.callUno,
    eliminatePlayer: state.eliminatePlayer
  }))

  // Local state
  const [colorPickerIndex, setColorPickerIndex] = React.useState<number | null>(null)
  const [chatMessages, setChatMessages] = React.useState<ChatMessage[]>([])
  const [isChatMinimized, setIsChatMinimized] = React.useState(true)
  const [soundEnabled, setSoundEnabled] = React.useState(true)
  const [lastPlayedCard, setLastPlayedCard] = React.useState(false)
  const [showUnoButton, setShowUnoButton] = React.useState(false)
  const [timer, setTimer] = React.useState(rules.timer)
  const [showEffect, setShowEffect] = React.useState<string | null>(null)
  const [selectedProfile, setSelectedProfile] = React.useState<PlayerProfile | null>(null)
  const [inactivityTimer, setInactivityTimer] = React.useState(40) // 40 seconds inactivity timer
  const [kickedMessage, setKickedMessage] = React.useState<string | null>(null)
  const [gameEndChecked, setGameEndChecked] = React.useState(false)

  // Navigation effect
  React.useEffect(() => {
    if (sessionIdFromUrl && sessionId && sessionIdFromUrl !== sessionId) {
      navigate(`/uno/lobby?session=${sessionId}`, { replace: true })
    }
  }, [sessionIdFromUrl, sessionId, navigate])

  // Detect winner and redirect to results
  React.useEffect(() => {
    if (!started && players.length > 0 && !gameEndChecked) {
      // Check if someone won (hand is empty)
      const winner = players.find(p => p.hand.length === 0 && p.status !== 'eliminated')
      if (winner) {
        setGameEndChecked(true)
        // Navigate to results page
        navigate(`/uno/results?session=${sessionId}`, { replace: true })
      }
    }
  }, [started, players, navigate, sessionId, gameEndChecked])

  // Socket connection for chat
  React.useEffect(() => {
    const socket = getSocket()
    if (!socket || !sessionId) return

    socket.emit('join_game_chat', sessionId)

    socket.on('game_chat_message', (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev, msg])
    })

    return () => {
      socket.off('game_chat_message')
      socket.emit('leave_game_chat', sessionId)
    }
  }, [sessionId])

  // Timer effect
  React.useEffect(() => {
    if (!started || !rules.timer) return

    setTimer(rules.timer)
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 0) return rules.timer
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [turn, started, rules.timer])

  // Inactivity kick effect - kick player after 40 seconds if 3+ players remain
  React.useEffect(() => {
    if (!started) return
    
    const activePlayers = players.filter(p => p.status !== 'eliminated')
    if (activePlayers.length < 3) return // Only kick if at least 3 players
    
    const currentPlayer = players[turn]
    if (!currentPlayer || currentPlayer.status === 'eliminated') return
    
    // Reset inactivity timer when turn changes
    setInactivityTimer(40)
    
    const interval = setInterval(() => {
      setInactivityTimer((prev) => {
        if (prev <= 1) {
          // Time's up - kick the inactive player
          const stillActivePlayers = players.filter(p => p.status !== 'eliminated')
          if (stillActivePlayers.length >= 3 && currentPlayer) {
            eliminatePlayer(currentPlayer.id)
            setKickedMessage(`${currentPlayer.name} a été expulsé pour inactivité`)
            setTimeout(() => setKickedMessage(null), 3000)
          }
          return 40
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [turn, started, players, eliminatePlayer])

  // Show effect on special cards
  React.useEffect(() => {
    const topCard = discard[discard.length - 1]
    if (!topCard) return

    if (topCard.type === 'action' || topCard.type === 'wild') {
      setShowEffect(topCard.value)
      const t = setTimeout(() => setShowEffect(null), 1500)
      return () => clearTimeout(t)
    }
  }, [discard.length])

  // Ordered players for display
  const orderedPlayers = orderPlayers(players, localPlayerId)
  const myPlayer = orderedPlayers.find((player) => player.isLocal) ?? orderedPlayers[0]
  const myIndex = players.findIndex((player) => player.id === myPlayer?.id)
  const opponents = orderedPlayers.filter((player) => !player.isLocal)
  const topCard = discard.length > 0 ? discard[discard.length - 1] : null

  const isMyTurn = started && myIndex === turn && myPlayer?.status !== 'eliminated'

  // Auto UNO reminder
  React.useEffect(() => {
    if (myPlayer && myPlayer.hand.length === 2 && isMyTurn) {
      setShowUnoButton(true)
    } else {
      setShowUnoButton(false)
    }
  }, [myPlayer?.hand.length, isMyTurn])

  const handlePlay = (index: number) => {
    if (!myPlayer || myPlayer.status === 'eliminated') return
    const sortedHand = sortHand(myPlayer.hand)
    const card = sortedHand[index]
    if (!card) return

    // Find original index in unsorted hand
    const originalIndex = myPlayer.hand.findIndex(
      (c) => c.color === card.color && c.value === card.value && c.type === card.type
    )

    if (card.type === 'wild') {
      setColorPickerIndex(originalIndex)
      return
    }

    playCard(originalIndex)
    setLastPlayedCard(true)
    setTimeout(() => setLastPlayedCard(false), 500)
  }

  const handleColorSelect = (color: string) => {
    if (colorPickerIndex === null) return
    playCard(colorPickerIndex, color as Color)
    setColorPickerIndex(null)
    setLastPlayedCard(true)
    setTimeout(() => setLastPlayedCard(false), 500)
  }

  const handleDraw = () => {
    if (!isMyTurn) return
    drawCard()
  }

  const handleCallUno = () => {
    if (!myPlayer) return
    callUno(myPlayer.id)
  }

  const handleSendChatMessage = (content: string) => {
    const socket = getSocket()
    if (!socket || !sessionId || !myPlayer) return

    const message: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: myPlayer.id,
      senderName: myPlayer.name,
      senderAvatar: myPlayer.avatar,
      content,
      timestamp: new Date(),
      type: 'text'
    }

    socket.emit('game_chat_message', { sessionId, message })
    setChatMessages((prev) => [...prev, message])
  }

  const handlePlayerClick = (player: OrderedPlayer) => {
    if (player.isLocal) return
    setSelectedProfile({
      id: player.id,
      name: player.name,
      avatar: player.avatar,
      bio: 'Joueur passionné de UNO 🎮',
      gamesPlayed: Math.floor(Math.random() * 100) + 10,
      gamesWon: Math.floor(Math.random() * 50),
      joinDate: 'Janvier 2025',
      level: Math.floor(Math.random() * 50) + 1,
      isFriend: false
    })
  }

  // Get player positions based on number of opponents
  const getPlayerPositions = (): { player: OrderedPlayer; position: PlayerPosition }[] => {
    const positions: PlayerPosition[] = []
    
    if (opponents.length === 1) {
      positions.push('top')
    } else if (opponents.length === 2) {
      positions.push('left', 'right')
    } else if (opponents.length === 3) {
      positions.push('left', 'top', 'right')
    } else if (opponents.length >= 4) {
      positions.push('left', 'top', 'top', 'right')
    }
    
    return opponents.slice(0, 4).map((player, idx) => ({
      player,
      position: positions[idx] || 'top'
    }))
  }

  const playerPositions = getPlayerPositions()

  // Render opponent at specific position
  const renderOpponent = (player: OrderedPlayer, position: PlayerPosition) => {
    const isCurrentTurn = players[turn]?.id === player.id
    const baseClasses = 'absolute flex items-center gap-2 cursor-pointer transition-all duration-300 hover:scale-105'
    
    const positionStyles: Record<PlayerPosition, string> = {
      top: 'top-4 left-1/2 -translate-x-1/2 flex-col',
      bottom: 'bottom-4 left-1/2 -translate-x-1/2 flex-col',
      left: 'left-4 top-1/2 -translate-y-1/2 flex-row',
      right: 'right-4 top-1/2 -translate-y-1/2 flex-row-reverse'
    }
    
    const cardLayout = position === 'left' || position === 'right' ? 'flex-col -space-y-6' : 'flex-row -space-x-4'
    
    return (
      <div
        key={player.id}
        className={`${baseClasses} ${positionStyles[position]}`}
        onClick={() => handlePlayerClick(player)}
      >
        {/* Player info */}
        <div className={`flex items-center gap-2 ${position === 'left' ? 'flex-row' : position === 'right' ? 'flex-row-reverse' : 'flex-col'}`}>
          <div className={`
            relative p-0.5 rounded-full
            ${isCurrentTurn ? 'ring-2 ring-cyan-400 ring-offset-1 ring-offset-transparent animate-pulse' : ''}
          `}>
            <div 
              className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-lg font-bold text-white shadow-lg"
              style={{ boxShadow: isCurrentTurn ? '0 0 20px rgba(34, 211, 238, 0.6)' : '0 0 10px rgba(168, 85, 247, 0.3)' }}
            >
              {player.avatar}
            </div>
            {/* Card count badge */}
            <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-white/30">
              {player.hand.length}
            </div>
            {/* Turn indicator */}
            {isCurrentTurn && (
              <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                <span className="text-sm animate-bounce">👆</span>
              </div>
            )}
          </div>
          <span className="text-white/90 text-xs font-medium truncate max-w-[70px] bg-black/30 px-2 py-0.5 rounded-full">
            {player.name}
          </span>
        </div>

        {/* Opponent's cards */}
        <div className={`flex ${cardLayout}`}>
          {player.hand.slice(0, Math.min(5, player.hand.length)).map((_, cardIndex) => (
            <div
              key={cardIndex}
              className="w-7 h-10 rounded-md shadow-md transition-transform overflow-hidden"
              style={{
                background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)',
                border: '1px solid rgba(168, 85, 247, 0.4)',
                transform: position === 'left' || position === 'right' 
                  ? `translateX(${(cardIndex - 2) * 2}px)` 
                  : `rotate(${(cardIndex - 2) * 8}deg)`,
                boxShadow: '0 2px 6px rgba(0,0,0,0.4)'
              }}
            >
              {/* Card back with UNO logo */}
              <div className="w-full h-full flex items-center justify-center relative">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500 via-yellow-500 to-green-500 opacity-20" />
                <div className="bg-gradient-to-br from-red-500 to-yellow-500 rounded px-1 py-0.5 transform -rotate-12">
                  <span className="text-[6px] font-black text-white italic">UNO</span>
                </div>
              </div>
            </div>
          ))}
          {player.hand.length > 5 && (
            <div className="w-7 h-10 rounded-md bg-black/50 flex items-center justify-center text-white/60 text-[8px] font-bold border border-white/20">
              +{player.hand.length - 5}
            </div>
          )}
        </div>

        {/* UNO warning */}
        {player.hand.length === 1 && !player.hasCalledUno && (
          <div className="animate-bounce absolute -top-6 left-1/2 -translate-x-1/2">
            <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-bold shadow-lg">UNO!</span>
          </div>
        )}
      </div>
    )
  }

  // Sorted hand for display
  const sortedHand = myPlayer ? sortHand(myPlayer.hand) : []

  return (
    <div className="fixed inset-0 overflow-hidden bg-gradient-to-b from-[#0a0a1a] via-[#0f0f2d] to-[#1a1a3a]">
      {/* Smooth space background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-radial from-purple-900/20 via-transparent to-transparent" />
        
        {/* Twinkling stars - fewer, smoother */}
        {[...Array(50)].map((_, i) => (
          <div
            key={`star-${i}`}
            className="absolute rounded-full bg-white animate-twinkle"
            style={{
              width: `${Math.random() * 2 + 1}px`,
              height: `${Math.random() * 2 + 1}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.5 + 0.2,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${Math.random() * 3 + 3}s`
            }}
          />
        ))}
        
        {/* Shooting stars / Comets */}
        <div className="absolute top-10 left-10 w-1 h-1 bg-white rounded-full animate-comet" style={{ animationDelay: '0s' }} />
        <div className="absolute top-20 right-20 w-1 h-1 bg-white rounded-full animate-comet" style={{ animationDelay: '3s' }} />
        <div className="absolute top-1/3 left-1/4 w-0.5 h-0.5 bg-white rounded-full animate-comet" style={{ animationDelay: '6s' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Header */}
        <header className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-black/40 backdrop-blur-sm border-b border-white/10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
            >
              ←
            </button>
            <div>
              <h1 className="text-base font-bold text-white flex items-center gap-2">
                <span className="text-xl">🃏</span> UNO
                {variant === 'no-mercy' && (
                  <span className="text-[10px] bg-gradient-to-r from-red-500 to-orange-500 px-2 py-0.5 rounded-full">No Mercy</span>
                )}
              </h1>
              <p className="text-[10px] text-white/60">
                Tour {turn + 1} • {players.filter(p => p.status !== 'eliminated').length} joueurs • {dir === 1 ? '→' : '←'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Timer bar */}
        {isMyTurn && rules.timer > 0 && (
          <div className="flex-shrink-0 px-4 py-2">
            <TimerBar timeLeft={timer} maxTime={rules.timer} isActive={isMyTurn} />
          </div>
        )}

        {/* Effect overlay */}
        {showEffect && (
          <div className="fixed inset-0 z-30 flex items-center justify-center pointer-events-none">
            <div className="animate-effect-pop text-5xl sm:text-7xl font-black text-white drop-shadow-2xl"
              style={{ textShadow: '0 0 40px rgba(168, 85, 247, 0.8)' }}
            >
              {getEffectDisplay(showEffect)}
            </div>
          </div>
        )}

        {/* Main game area - with positioned opponents */}
        <main className="flex-1 relative min-h-0">
          {/* Opponents positioned around the table */}
          {playerPositions.map(({ player, position }) => renderOpponent(player, position))}

          {/* Game table (center) */}
          <div className="absolute inset-0 flex items-center justify-center p-16">
            <GameTable
              topCard={topCard}
              forcedColor={forcedColor}
              pendingDraw={pendingDraw}
              deckCount={deck.length}
              onDrawClick={handleDraw}
              isMyTurn={isMyTurn}
              lastPlayedAnimation={lastPlayedCard}
              direction={dir}
            />
          </div>

          {/* Roulette color indicator */}
          {rouletteColor && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
              <div className="bg-black/80 backdrop-blur-md text-white px-4 py-2 rounded-xl flex items-center gap-2 animate-bounce border border-purple-500/50 text-sm"
                style={{ boxShadow: '0 0 20px rgba(168, 85, 247, 0.5)' }}
              >
                <span className="text-xl">🎰</span>
                <span>Roulette: {renderColor(rouletteColor)}</span>
              </div>
            </div>
          )}
        </main>

        {/* Player info & controls */}
        <div className="flex-shrink-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent pt-3 pb-4 px-3">
          {/* Current player indicator */}
          {myPlayer && (
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-2">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg text-sm ${isMyTurn ? 'ring-2 ring-yellow-400 animate-pulse' : ''}`}
                  style={{ boxShadow: isMyTurn ? '0 0 15px rgba(250, 204, 21, 0.5)' : '0 0 10px rgba(34, 211, 238, 0.3)' }}
                >
                  {myPlayer.avatar}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{myPlayer.name}</p>
                  <p className="text-white/60 text-xs">{myPlayer.hand.length} cartes</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* UNO Button */}
                {(showUnoButton || (myPlayer.hand.length === 1 && !myPlayer.hasCalledUno)) && (
                  <button
                    onClick={handleCallUno}
                    disabled={myPlayer.hasCalledUno}
                    className={`
                      relative px-4 py-2 rounded-xl font-black text-base
                      ${myPlayer.hasCalledUno
                        ? 'bg-gray-600 text-gray-400'
                        : 'bg-gradient-to-r from-red-500 via-yellow-500 to-red-500 text-white animate-pulse shadow-lg'
                      }
                      transition-all hover:scale-105 active:scale-95
                    `}
                    style={{ boxShadow: myPlayer.hasCalledUno ? 'none' : '0 0 20px rgba(239, 68, 68, 0.6)' }}
                  >
                    UNO!
                  </button>
                )}

                {/* Draw button */}
                <button
                  onClick={handleDraw}
                  disabled={!isMyTurn}
                  className={`
                    px-3 py-2 rounded-xl font-semibold transition-all text-sm
                    ${isMyTurn
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-lg shadow-cyan-500/30'
                      : 'bg-gray-700/50 text-gray-400 cursor-not-allowed'
                    }
                  `}
                >
                  {pendingDraw > 0 ? `+${pendingDraw}` : 'Piocher'}
                </button>
              </div>
            </div>
          )}

          {/* Sorted hand */}
          <div className="relative overflow-x-auto pb-1 -mx-3 px-3 scrollbar-thin">
            <div 
              className="flex justify-center items-end gap-0.5 sm:gap-1 min-w-min py-1"
              style={{ 
                paddingLeft: 'max(0.5rem, calc((100vw - 500px) / 2))',
                paddingRight: 'max(0.5rem, calc((100vw - 500px) / 2))'
              }}
            >
              {sortedHand.map((card, index) => {
                const totalCards = sortedHand.length
                const middleIndex = (totalCards - 1) / 2
                const offset = index - middleIndex
                const rotation = offset * (totalCards > 10 ? 2 : totalCards > 7 ? 3 : 5)
                const translateY = Math.abs(offset) * (totalCards > 10 ? 1 : totalCards > 7 ? 2 : 3)
                
                return (
                  <div
                    key={`${card.value}-${card.color}-${index}`}
                    className="flex-shrink-0 transition-all duration-300 hover:!translate-y-[-15px] hover:!rotate-0 hover:z-50"
                    style={{
                      transform: `translateY(${translateY}px) rotate(${rotation}deg) ${colorPickerIndex !== null && myPlayer?.hand.findIndex(c => c.color === card.color && c.value === card.value) === colorPickerIndex ? 'translateY(-10px) scale(1.05)' : ''}`,
                      zIndex: colorPickerIndex !== null && myPlayer?.hand.findIndex(c => c.color === card.color && c.value === card.value) === colorPickerIndex ? 50 : index
                    }}
                  >
                    <UnoCard3D
                      card={card}
                      onClick={() => handlePlay(index)}
                      disabled={!isMyTurn}
                      size="sm"
                      highlighted={colorPickerIndex !== null && myPlayer?.hand.findIndex(c => c.color === card.color && c.value === card.value) === colorPickerIndex}
                    />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Color picker modal */}
          {colorPickerIndex !== null && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in">
              <div className="bg-gradient-to-br from-gray-900/95 via-purple-900/90 to-gray-900/95 rounded-2xl p-5 shadow-2xl max-w-xs w-full mx-4 animate-scale-in border border-white/20">
                <h3 className="text-lg font-bold text-white mb-3 text-center flex items-center justify-center gap-2">
                  <span className="text-xl">🎨</span>
                  Choisir une couleur
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {WILD_COLORS.map((color) => (
                    <button
                      key={color.key}
                      onClick={() => handleColorSelect(color.key)}
                      className={`
                        ${color.className}
                        px-4 py-3 rounded-xl font-bold text-white
                        flex items-center justify-center gap-2
                        transition-all hover:scale-105 active:scale-95
                        shadow-lg text-sm
                      `}
                    >
                      <span className="text-xl">{color.icon}</span>
                      <span>{color.label}</span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setColorPickerIndex(null)}
                  className="w-full mt-3 py-2 rounded-xl border border-white/30 text-white/70 hover:text-white hover:border-white/50 transition-colors text-sm"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat */}
      <GameChat
        messages={chatMessages}
        onSendMessage={handleSendChatMessage}
        currentUserId={localPlayerId ?? ''}
        isMinimized={isChatMinimized}
        onToggleMinimize={() => setIsChatMinimized(!isChatMinimized)}
      />

      {/* Turn indicator toast */}
      {isMyTurn && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-1.5 rounded-full shadow-lg animate-slide-down flex items-center gap-2 border border-white/30 text-sm"
          style={{ boxShadow: '0 0 20px rgba(34, 211, 238, 0.5)' }}
        >
          <Zap className="w-4 h-4" />
          <span className="font-semibold">C'est votre tour !</span>
        </div>
      )}

      {/* Kicked player message */}
      {kickedMessage && (
        <div className="fixed top-32 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-red-500 to-orange-500 text-white px-6 py-2 rounded-full shadow-lg animate-slide-down flex items-center gap-2 border border-white/30 text-sm"
          style={{ boxShadow: '0 0 20px rgba(239, 68, 68, 0.6)' }}
        >
          <span>⚠️</span>
          <span className="font-semibold">{kickedMessage}</span>
        </div>
      )}

      {/* No Mercy rules indicator */}
      {variant === 'no-mercy' && rules.eliminationThreshold && (
        <div className="fixed bottom-24 left-4 z-30 bg-red-900/80 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-lg flex items-center gap-1 border border-red-500/30">
          <Trophy className="w-3 h-3" />
          <span>Élimination à {rules.eliminationThreshold} cartes</span>
        </div>
      )}

      {/* Player Profile Card */}
      <PlayerProfileCard
        player={selectedProfile ?? { id: '', name: '', avatar: '' }}
        isOpen={selectedProfile !== null}
        onClose={() => setSelectedProfile(null)}
        onAddFriend={() => {
          console.log('Add friend:', selectedProfile?.id)
          setSelectedProfile(null)
        }}
        onReport={() => {
          console.log('Report player:', selectedProfile?.id)
          setSelectedProfile(null)
        }}
        onMessage={() => {
          console.log('Message player:', selectedProfile?.id)
          navigate(`/messages/${selectedProfile?.id}`)
        }}
      />
    </div>
  )
}

// Helper functions
function orderPlayers(players: UnoPlayer[], localPlayerId: string | null): OrderedPlayer[] {
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
    case 'R': return '🔴 Rouge'
    case 'G': return '🟢 Vert'
    case 'B': return '🔵 Bleu'
    case 'Y': return '🟡 Jaune'
    default: return color
  }
}

function getEffectDisplay(effect: string): string {
  const effects: Record<string, string> = {
    'S': '⊘ SKIP!',
    'R': '↺ REVERSE!',
    'D2': '+2!',
    'SE': '⊘ SKIP ALL!',
    'DA': '∀ DISCARD ALL!',
    'W': '🎨 WILD!',
    'W4': '+4!',
    'W6': '+6!',
    'W10': '+10!',
    'WR4': '↺ +4!',
    'WR': '🎰 ROULETTE!'
  }
  return effects[effect] || effect
}

import { create } from 'zustand'
import { nanoid } from '../utils/nanoid'

export type GameId = 'uno' | 'uno-no-mercy' | 'derocher'

export type SessionMode = 'realtime' | 'turn-based'
export type SessionType = 'public' | 'private' | 'ranked'
export type SessionStatus = 'waiting' | 'ready' | 'in-game' | 'completed'

export type GameDefinition = {
  id: GameId
  name: string
  summary: string
  description: string
  categories: string[]
  tags: string[]
  playerRange: [number, number]
  durationHint: string
  highlight?: string
  modes: SessionMode[]
  supportsTeams?: boolean
  defaultOptions: Partial<SessionOptions>
  imageUrl?: string
}

export type SessionOptions = {
  allowStacking: boolean
  allowWildChallenge: boolean
  timerPerTurn: number
  eliminationThreshold?: number
  allowBots: boolean
  visibility: SessionType
  mode: SessionMode
}

export type SessionPlayer = {
  id: string
  name: string
  avatar: string
  isHost: boolean
  isBot?: boolean
  status: 'waiting' | 'ready' | 'playing' | 'eliminated'
  rating?: number
}

export type GameSession = {
  id: string
  gameId: GameId
  title: string
  type: SessionType
  status: SessionStatus
  mode: SessionMode
  maxPlayers: number
  createdAt: number
  hostId: string
  players: SessionPlayer[]
  options: SessionOptions
  accessCode?: string
}

export type QuickPlayRequest = {
  gameId: GameId
  mode?: SessionMode
  sessionType?: SessionType
  player: SessionPlayer
}

export type CreateSessionRequest = {
  gameId: GameId
  sessionType: SessionType
  mode: SessionMode
  title?: string
  maxPlayers?: number
  options?: Partial<SessionOptions>
  host: SessionPlayer
}

type GamesStore = {
  catalog: GameDefinition[]
  sessions: GameSession[]
  favorites: GameId[]
  recentGameIds: GameId[]
  activeSessionId: string | null
  localPlayerId: string | null
  quickPlay: (request: QuickPlayRequest) => GameSession
  createSession: (request: CreateSessionRequest) => GameSession
  joinSession: (sessionId: string, player: SessionPlayer) => GameSession | undefined
  leaveSession: (sessionId: string, playerId: string) => void
  toggleReady: (sessionId: string, playerId: string) => void
  startSession: (sessionId: string) => void
  completeSession: (sessionId: string) => void
  updateOptions: (sessionId: string, options: Partial<SessionOptions>) => void
  markFavorite: (gameId: GameId) => void
  unmarkFavorite: (gameId: GameId) => void
  getSessionsByGame: (gameId: GameId) => GameSession[]
  setActiveSession: (sessionId: string | null) => void
  addBotToSession: (sessionId: string) => void
  setLocalPlayerId: (id: string | null) => void
}

const MIN_WAITING_PLAYERS = 2

const catalog: GameDefinition[] = [
  {
    id: 'uno',
    name: 'UNO Classique',
    summary: 'Le jeu de cartes incontournable pour des parties rapides entre amis.',
    description:
      'Jouez au UNO classique avec les regles officielles : associez les couleurs ou les symboles, gelez vos adversaires avec les cartes Skip et Reverse, et annoncez UNO avant de remporter la manche.',
    categories: ['cards', 'casual', 'family'],
    tags: ['classique', 'rapide', 'multijoueur'],
    playerRange: [2, 6],
    durationHint: '5-8 min',
    highlight: 'Matchs rapides en temps reel',
    modes: ['realtime'],
    imageUrl: '/uno_card.png',
    defaultOptions: {
      allowStacking: true,
      allowWildChallenge: true,
      timerPerTurn: 20,
      allowBots: true,
      visibility: 'public',
      mode: 'realtime'
    }
  },
  {
    id: 'uno-no-mercy',
    name: 'UNO No Mercy',
    summary: 'Variante survitaminee avec nouvelles cartes +6/+10 et regle 7-0.',
    description:
      'Affrontez vos amis sur la version sans pitié de UNO. Cumulez les penalites, defiez vos adversaires avec les cartes Wild Draw 10 et eliminez-les s ils accumulent trop de cartes.',
    categories: ['cards', 'competitive', 'ranked'],
    tags: ['combo', 'ranked', 'challenge'],
    playerRange: [2, 6],
    durationHint: '8-12 min',
    modes: ['realtime'],
    imageUrl: '/uno_no_mercy_card.png',
    defaultOptions: {
      allowStacking: true,
      allowWildChallenge: true,
      timerPerTurn: 15,
      eliminationThreshold: 25,
      allowBots: false,
      visibility: 'ranked',
      mode: 'realtime'
    }
  },
  {
    id: 'derocher',
    name: 'Derocher',
    summary: 'Jeu original d adresse : retirez des blocs sans faire tomber la structure.',
    description:
      'Analysez la structure, choisissez les blocs a retirer et marquez des points sans tout faire tomber. Disponible en mode temps reel ou tour par tour pour s adapter a votre rythme.',
    categories: ['strategy', 'casual'],
    tags: ['tour par tour', 'original', 'precision'],
    playerRange: [2, 4],
    durationHint: '10-15 min',
    modes: ['realtime', 'turn-based'],
    supportsTeams: false,
    imageUrl: 'https://images.unsplash.com/photo-1611996575749-79a3a250f948?w=400&h=300&fit=crop',
    defaultOptions: {
      allowStacking: false,
      allowWildChallenge: false,
      timerPerTurn: 30,
      allowBots: false,
      visibility: 'public',
      mode: 'turn-based'
    }
  }
]

const initialSessions = (): GameSession[] => {
  // Return empty array - sessions should only come from backend or be created by users
  return []
}

const mergeOptions = (base: SessionOptions, override?: Partial<SessionOptions>): SessionOptions => ({
  ...base,
  ...override
})

const ensureReadyStatus = (players: SessionPlayer[]): SessionPlayer[] =>
  players.map((player, index) => ({
    ...player,
    status: index < MIN_WAITING_PLAYERS ? 'ready' : player.status
  }))

export const useGamesStore = create<GamesStore>((set, get) => ({
  catalog,
  sessions: initialSessions(),
  favorites: [],
  recentGameIds: ['uno', 'uno-no-mercy'],
  activeSessionId: null,
  localPlayerId: null,
  quickPlay: ({ gameId, mode, sessionType = 'public', player }) => {
    set({ localPlayerId: player.id })
    const state = get()
    const targetMode = mode ?? state.catalog.find((g) => g.id === gameId)?.defaultOptions.mode ?? 'realtime'
    const found = state.sessions.find(
      (session) =>
        session.gameId === gameId &&
        session.status === 'waiting' &&
        session.mode === targetMode &&
        session.type === sessionType &&
        session.players.length < session.maxPlayers
    )

    if (found) {
      const joined = get().joinSession(found.id, player)
      if (joined) {
        get().setActiveSession(joined.id)
        return joined
      }
    }

    const host = { ...player, isHost: true, status: 'ready' as const }
    const gameDef = state.catalog.find((g) => g.id === gameId)
    const newSession = get().createSession({
      gameId,
      sessionType,
      mode: targetMode,
      host,
      title: `${gameDef?.name ?? 'Partie'} - rapide`,
      maxPlayers: gameDef?.playerRange[1] ?? 4
    })
    get().setActiveSession(newSession.id)
    return newSession
  },
  createSession: ({ gameId, sessionType, mode, host, maxPlayers, options, title }) => {
    const state = get()
    const gameDef = state.catalog.find((g) => g.id === gameId)
    if (!gameDef) {
      throw new Error(`Unknown game id ${gameId}`)
    }
    const baseOptions = mergeOptions(
      {
        allowStacking: false,
        allowWildChallenge: false,
        timerPerTurn: 20,
        allowBots: false,
        visibility: sessionType,
        mode
      },
      gameDef.defaultOptions
    )

    const newSession: GameSession = {
      id: nanoid(),
      gameId,
      title: title ?? `${gameDef.name} entre amis`,
      type: sessionType,
      status: 'waiting',
      mode,
      maxPlayers: maxPlayers ?? gameDef.playerRange[1],
      createdAt: Date.now(),
      hostId: host.id,
      players: ensureReadyStatus([{ ...host, isHost: true }]),
      options: mergeOptions(baseOptions, options),
      accessCode: sessionType === 'private' ? generateAccessCode() : undefined
    }

    set((slice) => ({
      sessions: [newSession, ...slice.sessions],
      recentGameIds: Array.from(new Set([gameId, ...slice.recentGameIds])).slice(0, 5)
    }))

    set({ activeSessionId: newSession.id, localPlayerId: host.id })
    return newSession
  },
  joinSession: (sessionId, player) => {
    let joined: GameSession | undefined
    let joinedId: string | null = null
    set((state) => {
      const sessions = state.sessions.map((session) => {
        if (session.id !== sessionId) return session
        if (session.players.some((p) => p.id === player.id)) {
          joined = session
          joinedId = session.id
          return session
        }
        if (session.players.length >= session.maxPlayers || session.status !== 'waiting') {
          joined = session
          joinedId = session.id
          return session
        }
        const updated: GameSession = {
          ...session,
          players: ensureReadyStatus([
            ...session.players,
            { ...player, isHost: false, status: 'waiting' }
          ])
        }
        joined = updated
        joinedId = updated.id
        return updated
      })
      return { sessions }
    })
    if (joinedId) {
      set({ activeSessionId: joinedId, localPlayerId: player.id })
    }
    return joined
  },
  leaveSession: (sessionId, playerId) => {
    set((state) => ({
      sessions: state.sessions
        .map((session) => {
          if (session.id !== sessionId) return session
          const players = session.players.filter((p) => p.id !== playerId)
          if (players.length === 0) {
            return null
          }
          return {
            ...session,
            players: ensureReadyStatus(
              players.map((p, index) => ({
                ...p,
                isHost: index === 0
              }))
            ),
            hostId: players[0].id
          }
        })
        .filter(Boolean) as GameSession[]
    }))
  },
  toggleReady: (sessionId, playerId) => {
    set((state) => ({
      sessions: state.sessions.map((session) => {
        if (session.id !== sessionId) return session
        return {
          ...session,
          players: session.players.map((player) =>
            player.id === playerId
              ? {
                  ...player,
                  status: player.status === 'ready' ? 'waiting' : 'ready'
                }
              : player
          )
        }
      })
    }))
  },
  startSession: (sessionId) => {
    set((state) => ({
      sessions: state.sessions.map((session) => {
        if (session.id !== sessionId) return session
        return {
          ...session,
          status: 'in-game',
          players: session.players.map((player) => ({
            ...player,
            status: 'playing'
          }))
        }
      })
    }))
  },
  completeSession: (sessionId) => {
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              status: 'completed',
              players: session.players.map((player) => ({
                ...player,
                status: 'waiting'
              }))
            }
          : session
      )
    }))
  },
  updateOptions: (sessionId, options) => {
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              options: {
                ...session.options,
                ...options
              }
            }
          : session
      )
    }))
  },
  markFavorite: (gameId) => {
    set((state) => ({
      favorites: state.favorites.includes(gameId) ? state.favorites : [...state.favorites, gameId]
    }))
  },
  unmarkFavorite: (gameId) => {
    set((state) => ({
      favorites: state.favorites.filter((id) => id !== gameId)
    }))
  },
  getSessionsByGame: (gameId) => get().sessions.filter((session) => session.gameId === gameId),
  setActiveSession: (sessionId) => set({ activeSessionId: sessionId }),
  addBotToSession: (sessionId) => {
    set((state) => ({
      sessions: state.sessions.map((session) => {
        if (session.id !== sessionId) return session
        if (!session.options.allowBots || session.players.length >= session.maxPlayers || session.status !== 'waiting') {
          return session
        }
        const botCount = session.players.filter((p) => p.isBot).length + 1
        const bot: SessionPlayer = {
          id: `bot-${session.gameId}-${nanoid(4)}`,
          name: `Bot ${botCount}`,
          avatar: `B${botCount}`,
          isHost: false,
          isBot: true,
          status: 'waiting'
        }
        return {
          ...session,
          players: ensureReadyStatus([...session.players, bot])
        }
      })
    }))
  },
  setLocalPlayerId: (id) => set({ localPlayerId: id })
}))

function generateAccessCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'AFO-'
  for (let i = 0; i < 4; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return code
}

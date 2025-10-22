import { create } from 'zustand'
import { GameSession, SessionPlayer } from './games'
import { nanoid } from '../utils/nanoid'

export type DerocherPlayer = {
  id: string
  name: string
  avatar: string
  points: number
  status: 'waiting' | 'playing' | 'eliminated'
}

export type DerocherBlock = {
  id: string
  label: string
  stability: number
  points: number
}

type DerocherState = {
  sessionId: string | null
  players: DerocherPlayer[]
  structure: DerocherBlock[]
  currentPlayerIndex: number
  turnMode: 'realtime' | 'turn-based'
  activityLog: string[]
  initializeFromSession: (session: GameSession, players: SessionPlayer[]) => void
  takeBlock: (blockId: string) => void
  nextPlayer: () => void
  reset: () => void
}

export const useDerocherStore = create<DerocherState>((set, get) => ({
  sessionId: null,
  players: [],
  structure: [],
  currentPlayerIndex: 0,
  turnMode: 'turn-based',
  activityLog: [],
  initializeFromSession: (session, sessionPlayers) => {
    const players: DerocherPlayer[] = sessionPlayers.map((player) => ({
      id: player.id,
      name: player.name,
      avatar: player.avatar ?? player.name.slice(0, 2).toUpperCase(),
      points: 0,
      status: 'waiting'
    }))

    const structure = createStructure()

    set({
      sessionId: session.id,
      players,
      structure,
      currentPlayerIndex: 0,
      turnMode: session.mode,
      activityLog: [`Structure preparee (${structure.length} blocs).`]
    })
  },
  takeBlock: (blockId) => {
    const state = get()
    const blockIndex = state.structure.findIndex((block) => block.id === blockId)
    if (blockIndex === -1) return

    const block = state.structure[blockIndex]
    const players = state.players.map((player, index) => {
      if (index !== state.currentPlayerIndex) return player
      const success = Math.random() * 100 <= block.stability
      if (success) {
        return {
          ...player,
          points: player.points + block.points
        }
      }
      return {
        ...player,
        status: 'eliminated'
      }
    })

    const success = players[state.currentPlayerIndex].status !== 'eliminated'
    const logEntry = success
      ? `${players[state.currentPlayerIndex].name} retire ${block.label} (+${block.points} pts).`
      : `${players[state.currentPlayerIndex].name} fait tomber la structure.`

    const structure = state.structure.filter((item) => item.id !== blockId)

    set({
      players,
      structure,
      activityLog: [...state.activityLog, logEntry]
    })

    get().nextPlayer()
  },
  nextPlayer: () => {
    const state = get()
    const activePlayers = state.players.filter((player) => player.status !== 'eliminated')
    if (activePlayers.length <= 1) {
      set({
        activityLog: [...state.activityLog, 'Fin de partie.']
      })
      return
    }
    let nextIndex = state.currentPlayerIndex
    for (let i = 0; i < state.players.length; i++) {
      nextIndex = (nextIndex + 1) % state.players.length
      if (state.players[nextIndex].status !== 'eliminated') break
    }
    set({ currentPlayerIndex: nextIndex })
  },
  reset: () =>
    set({
      sessionId: null,
      players: [],
      structure: [],
      currentPlayerIndex: 0,
      activityLog: []
    })
}))

function createStructure(): DerocherBlock[] {
  const blocks: DerocherBlock[] = []
  for (let level = 1; level <= 12; level++) {
    blocks.push({
      id: nanoid(),
      label: `Bloc ${level}`,
      stability: Math.max(30, 100 - level * 5),
      points: 5 + level * 2
    })
  }
  return blocks
}

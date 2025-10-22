import { beforeEach, describe, expect, test } from 'vitest'
import { useUnoStore } from './uno'

const baseState = () => {
  useUnoStore.getState().reset()
}

describe('uno store', () => {
  beforeEach(() => {
    baseState()
  })

  test('initializeFromSession configure les joueurs et le variant classique', () => {
    const session = {
      id: 'session-1',
      gameId: 'uno',
      title: 'Partie test',
      type: 'public',
      status: 'waiting',
      mode: 'realtime',
      maxPlayers: 4,
      createdAt: Date.now(),
      hostId: 'host',
      players: [
        { id: 'host', name: 'Host', avatar: 'HO', isHost: true, status: 'ready' },
        { id: 'guest', name: 'Guest', avatar: 'GU', isHost: false, status: 'ready' }
      ],
      options: {
        allowStacking: true,
        allowWildChallenge: true,
        timerPerTurn: 20,
        allowBots: false,
        visibility: 'public',
        mode: 'realtime'
      }
    }

    useUnoStore.getState().initializeFromSession(session as any, session.players as any)
    const state = useUnoStore.getState()

    expect(state.sessionId).toBe('session-1')
    expect(state.variant).toBe('classic')
    expect(state.players.length).toBe(2)
    expect(state.started).toBe(true)
    expect(state.discard.length).toBeGreaterThan(0)
  })
})

import { beforeEach, describe, expect, test } from 'vitest'
import { useGamesStore } from './games'
import { buildSessionPlayer } from '../utils/sessionPlayer'

const catalogSnapshot = useGamesStore.getState().catalog.map((game) => ({ ...game }))

describe('games store', () => {
  beforeEach(() => {
    useGamesStore.setState({
      catalog: catalogSnapshot,
      sessions: [],
      favorites: [],
      recentGameIds: ['uno', 'uno-no-mercy'],
      activeSessionId: null,
      localPlayerId: null
    })
  })

  test('quickPlay crée une session et définit le joueur local', () => {
    const player = buildSessionPlayer(
      { name: 'Alice', avatar: 'AL', xp: 0, level: 1 },
      { id: 'alice', isHost: false, status: 'waiting' }
    )

    const session = useGamesStore.getState().quickPlay({ gameId: 'uno', player })

    expect(session.players[0].id).toBe('alice')
    expect(session.players[0].isHost).toBe(true)
    expect(useGamesStore.getState().sessions.length).toBe(1)
    expect(useGamesStore.getState().localPlayerId).toBe('alice')
  })

  test('joinSession ajoute un joueur en attente', () => {
    const host = buildSessionPlayer(
      { name: 'Hôte', avatar: 'HO', xp: 0, level: 1 },
      { id: 'host', isHost: true, status: 'ready' }
    )
    const session = useGamesStore.getState().createSession({
      gameId: 'uno',
      sessionType: 'public',
      mode: 'realtime',
      host,
      title: 'Test',
      maxPlayers: 4
    })

    const guest = buildSessionPlayer(null, { id: 'guest', name: 'Invité', avatar: 'IN', status: 'waiting' })
    const updated = useGamesStore.getState().joinSession(session.id, guest)

    expect(updated?.players.length).toBe(2)
    expect(updated?.players[1].id).toBe('guest')
    expect(useGamesStore.getState().localPlayerId).toBe('guest')
  })
})

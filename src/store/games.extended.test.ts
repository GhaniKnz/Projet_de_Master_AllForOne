import { describe, test, expect, beforeEach } from 'vitest'
import { useGamesStore } from './games'
import { buildSessionPlayer } from '../utils/sessionPlayer'
import type { User } from './app'

const catalogSnapshot = useGamesStore.getState().catalog.map((game) => ({ ...game }))

// Mock User for tests
const mockUser: User = {
  id: 'user-123',
  handle: '@testhost',
  displayName: 'Test Host',
  avatarUrl: 'https://example.com/host.jpg',
  level: 5,
  xp: 1000,
  rating: 1500
}

describe('Games Store - Extended Tests', () => {
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

  describe('Catalog', () => {
    test('has multiple games', () => {
      const { catalog } = useGamesStore.getState()
      expect(catalog.length).toBeGreaterThan(0)
    })

    test('each game has required properties', () => {
      const { catalog } = useGamesStore.getState()
      catalog.forEach(game => {
        expect(game).toHaveProperty('id')
        expect(game).toHaveProperty('name')
        expect(game).toHaveProperty('playerRange')
        expect(game.playerRange).toHaveLength(2)
      })
    })

    test('UNO exists in catalog', () => {
      const { catalog } = useGamesStore.getState()
      const uno = catalog.find(g => g.id === 'uno')
      expect(uno).toBeDefined()
      expect(uno?.name).toContain('UNO')
    })

    test('games have valid player counts', () => {
      const { catalog } = useGamesStore.getState()
      catalog.forEach(game => {
        const [minPlayers, maxPlayers] = game.playerRange
        expect(minPlayers).toBeGreaterThan(0)
        expect(maxPlayers).toBeGreaterThanOrEqual(minPlayers)
      })
    })

    test('games have categories', () => {
      const { catalog } = useGamesStore.getState()
      catalog.forEach(game => {
        expect(game).toHaveProperty('categories')
        expect(Array.isArray(game.categories)).toBe(true)
      })
    })

    test('can find game by id', () => {
      const { catalog } = useGamesStore.getState()
      const game = catalog.find(g => g.id === 'uno')
      expect(game).toBeDefined()
      expect(game?.id).toBe('uno')
    })
  })

  describe('Session Creation', () => {
    test('createSession generates unique IDs', () => {
      const host = buildSessionPlayer(mockUser, { isHost: true })
      
      const session1 = useGamesStore.getState().createSession({
        gameId: 'uno',
        sessionType: 'public',
        mode: 'realtime',
        host,
        title: 'Session 1',
        maxPlayers: 4
      })

      const session2 = useGamesStore.getState().createSession({
        gameId: 'uno',
        sessionType: 'public',
        mode: 'realtime',
        host,
        title: 'Session 2',
        maxPlayers: 4
      })

      expect(session1.id).not.toBe(session2.id)
    })

    test('private session has access code', () => {
      const host = buildSessionPlayer(mockUser, { isHost: true })
      
      const session = useGamesStore.getState().createSession({
        gameId: 'uno',
        sessionType: 'private',
        mode: 'realtime',
        host,
        title: 'Private Game',
        maxPlayers: 4
      })

      expect(session.accessCode).toBeDefined()
      expect(session.accessCode!.length).toBeGreaterThan(0)
    })

    test('public session has no access code', () => {
      const host = buildSessionPlayer(mockUser, { isHost: true })
      
      const session = useGamesStore.getState().createSession({
        gameId: 'uno',
        sessionType: 'public',
        mode: 'realtime',
        host,
        title: 'Public Game',
        maxPlayers: 4
      })

      expect(session.accessCode).toBeUndefined()
    })

    test('session status starts as waiting', () => {
      const host = buildSessionPlayer(mockUser, { isHost: true })
      
      const session = useGamesStore.getState().createSession({
        gameId: 'uno',
        sessionType: 'public',
        mode: 'realtime',
        host,
        title: 'Test',
        maxPlayers: 4
      })

      expect(session.status).toBe('waiting')
    })

    test('session respects maxPlayers', () => {
      const host = buildSessionPlayer(mockUser, { isHost: true })
      
      const session = useGamesStore.getState().createSession({
        gameId: 'uno',
        sessionType: 'public',
        mode: 'realtime',
        host,
        title: 'Test',
        maxPlayers: 6
      })

      expect(session.maxPlayers).toBe(6)
    })
  })

  describe('Session Join', () => {
    test('joining full session does not add player', () => {
      const host = buildSessionPlayer(mockUser, { isHost: true })
      
      const session = useGamesStore.getState().createSession({
        gameId: 'uno',
        sessionType: 'public',
        mode: 'realtime',
        host,
        title: 'Full Game',
        maxPlayers: 2
      })

      // First guest joins
      const guest1 = buildSessionPlayer(null, { id: 'guest-1', name: 'Guest 1' })
      useGamesStore.getState().joinSession(session.id, guest1)

      // Second guest tries to join
      const guest2 = buildSessionPlayer(null, { id: 'guest-2', name: 'Guest 2' })
      const result = useGamesStore.getState().joinSession(session.id, guest2)

      // Should fail or not add
      const updatedSession = useGamesStore.getState().sessions.find(s => s.id === session.id)
      expect(updatedSession?.players.length).toBeLessThanOrEqual(2)
    })

    test('cannot join same session twice', () => {
      const host = buildSessionPlayer(mockUser, { isHost: true })
      
      const session = useGamesStore.getState().createSession({
        gameId: 'uno',
        sessionType: 'public',
        mode: 'realtime',
        host,
        title: 'Test',
        maxPlayers: 4
      })

      const guest = buildSessionPlayer(null, { id: 'guest-1', name: 'Guest' })
      useGamesStore.getState().joinSession(session.id, guest)
      useGamesStore.getState().joinSession(session.id, guest)

      const updatedSession = useGamesStore.getState().sessions.find(s => s.id === session.id)
      const guestCount = updatedSession?.players.filter(p => p.id === 'guest-1').length
      expect(guestCount).toBe(1)
    })
  })

  describe('Ready Toggle', () => {
    test('toggleReady changes player status', () => {
      const host = buildSessionPlayer(mockUser, { isHost: true })
      
      const session = useGamesStore.getState().createSession({
        gameId: 'uno',
        sessionType: 'public',
        mode: 'realtime',
        host,
        title: 'Test',
        maxPlayers: 4
      })

      const guest = buildSessionPlayer(null, { id: 'guest-1', name: 'Guest', status: 'waiting' })
      useGamesStore.getState().joinSession(session.id, guest)

      // Get initial status
      let updatedSession = useGamesStore.getState().sessions.find(s => s.id === session.id)
      let guestPlayer = updatedSession?.players.find(p => p.id === 'guest-1')
      const initialStatus = guestPlayer?.status

      // Toggle ready
      useGamesStore.getState().toggleReady(session.id, 'guest-1')

      updatedSession = useGamesStore.getState().sessions.find(s => s.id === session.id)
      guestPlayer = updatedSession?.players.find(p => p.id === 'guest-1')
      
      // Status should have changed
      expect(guestPlayer?.status).not.toBe(initialStatus)
    })
  })

  describe('Start Session', () => {
    test('startSession changes status to in-game', () => {
      const host = buildSessionPlayer(mockUser, { isHost: true, status: 'ready' })
      
      const session = useGamesStore.getState().createSession({
        gameId: 'uno',
        sessionType: 'public',
        mode: 'realtime',
        host,
        title: 'Test',
        maxPlayers: 4
      })

      const guest = buildSessionPlayer(null, { id: 'guest-1', name: 'Guest', status: 'ready' })
      useGamesStore.getState().joinSession(session.id, guest)

      useGamesStore.getState().startSession(session.id)

      const updatedSession = useGamesStore.getState().sessions.find(s => s.id === session.id)
      expect(updatedSession?.status).toBe('in-game')
    })
  })

  describe('Favorites', () => {
    test('can add game to favorites', () => {
      useGamesStore.getState().markFavorite('uno')
      expect(useGamesStore.getState().favorites).toContain('uno')
    })

    test('can remove game from favorites', () => {
      useGamesStore.getState().markFavorite('uno')
      useGamesStore.getState().unmarkFavorite('uno')
      expect(useGamesStore.getState().favorites).not.toContain('uno')
    })
  })

  describe('getSessionsByGame', () => {
    test('filters sessions by game ID', () => {
      const host = buildSessionPlayer(mockUser, { isHost: true })
      
      useGamesStore.getState().createSession({
        gameId: 'uno',
        sessionType: 'public',
        mode: 'realtime',
        host,
        title: 'UNO Game',
        maxPlayers: 4
      })

      useGamesStore.getState().createSession({
        gameId: 'derocher',
        sessionType: 'public',
        mode: 'realtime',
        host,
        title: 'Derocher Game',
        maxPlayers: 4
      })

      const unoSessions = useGamesStore.getState().getSessionsByGame('uno')
      expect(unoSessions.length).toBe(1)
      expect(unoSessions[0].gameId).toBe('uno')
    })
  })

  describe('Active Session', () => {
    test('setActiveSession updates activeSessionId', () => {
      const host = buildSessionPlayer(mockUser, { isHost: true })
      
      const session = useGamesStore.getState().createSession({
        gameId: 'uno',
        sessionType: 'public',
        mode: 'realtime',
        host,
        title: 'Test',
        maxPlayers: 4
      })

      useGamesStore.getState().setActiveSession(session.id)
      expect(useGamesStore.getState().activeSessionId).toBe(session.id)
    })

    test('setActiveSession can clear active session', () => {
      useGamesStore.getState().setActiveSession(null)
      expect(useGamesStore.getState().activeSessionId).toBeNull()
    })
  })

  describe('Local Player', () => {
    test('setLocalPlayerId updates localPlayerId', () => {
      useGamesStore.getState().setLocalPlayerId('player-123')
      expect(useGamesStore.getState().localPlayerId).toBe('player-123')
    })
  })

  describe('Add Bot', () => {
    test('addBotToSession adds bot player', () => {
      const host = buildSessionPlayer(mockUser, { isHost: true })
      
      const session = useGamesStore.getState().createSession({
        gameId: 'uno',
        sessionType: 'public',
        mode: 'realtime',
        host,
        title: 'Test with Bot',
        maxPlayers: 4
      })

      useGamesStore.getState().addBotToSession(session.id)

      const updatedSession = useGamesStore.getState().sessions.find(s => s.id === session.id)
      const botPlayer = updatedSession?.players.find(p => p.isBot)
      expect(botPlayer).toBeDefined()
      expect(botPlayer?.status).toBe('ready')
    })
  })
})

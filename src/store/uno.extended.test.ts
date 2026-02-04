import { describe, test, expect, beforeEach } from 'vitest'
import { useUnoStore } from './uno'
import { Card, Color } from '../games/uno/engine'

describe('UNO Store - Extended Tests', () => {
  beforeEach(() => {
    useUnoStore.getState().reset()
  })

  describe('Initial State', () => {
    test('reset returns to initial state', () => {
      const state = useUnoStore.getState()
      
      expect(state.sessionId).toBeNull()
      expect(state.variant).toBe('classic')
      expect(state.players).toEqual([])
      expect(state.deck).toEqual([])
      expect(state.discard).toEqual([])
      expect(state.turn).toBe(0)
      expect(state.dir).toBe(1)
      expect(state.started).toBe(false)
      expect(state.pendingDraw).toBe(0)
      expect(state.results).toEqual([])
    })
  })

  describe('Session Initialization', () => {
    const createMockSession = (gameId = 'uno', options = {}) => ({
      id: 'session-test',
      gameId,
      title: 'Test Game',
      type: 'public' as const,
      status: 'waiting' as const,
      mode: 'realtime' as const,
      maxPlayers: 4,
      createdAt: Date.now(),
      hostId: 'player-1',
      players: [
        { id: 'player-1', name: 'Player 1', avatar: 'P1', isHost: true, status: 'ready' as const },
        { id: 'player-2', name: 'Player 2', avatar: 'P2', isHost: false, status: 'ready' as const }
      ],
      options: {
        allowStacking: true,
        allowWildChallenge: true,
        timerPerTurn: 20,
        allowBots: true,
        visibility: 'public' as const,
        mode: 'realtime' as const,
        ...options
      }
    })

    test('initializeFromSession sets up classic variant', () => {
      const session = createMockSession('uno')
      useUnoStore.getState().initializeFromSession(session as any, session.players as any)
      
      const state = useUnoStore.getState()
      expect(state.variant).toBe('classic')
      expect(state.sessionId).toBe('session-test')
    })

    test('initializeFromSession sets up no-mercy variant', () => {
      const session = createMockSession('uno-no-mercy', { eliminationThreshold: 25 })
      useUnoStore.getState().initializeFromSession(session as any, session.players as any)
      
      const state = useUnoStore.getState()
      expect(state.variant).toBe('no-mercy')
      expect(state.rules.eliminationThreshold).toBe(25)
    })

    test('players receive 7 cards each', () => {
      const session = createMockSession()
      useUnoStore.getState().initializeFromSession(session as any, session.players as any)
      
      const state = useUnoStore.getState()
      state.players.forEach(player => {
        expect(player.hand.length).toBe(7)
      })
    })

    test('discard pile starts with one card', () => {
      const session = createMockSession()
      useUnoStore.getState().initializeFromSession(session as any, session.players as any)
      
      const state = useUnoStore.getState()
      expect(state.discard.length).toBe(1)
    })

    test('first discard card is not a wild', () => {
      const session = createMockSession()
      useUnoStore.getState().initializeFromSession(session as any, session.players as any)
      
      const state = useUnoStore.getState()
      const topCard = state.discard[0]
      expect(topCard.type).not.toBe('wild')
    })

    test('game is started after initialization', () => {
      const session = createMockSession()
      useUnoStore.getState().initializeFromSession(session as any, session.players as any)
      
      expect(useUnoStore.getState().started).toBe(true)
    })

    test('rules are properly extracted from session options', () => {
      const session = createMockSession('uno', {
        allowStacking: false,
        allowWildChallenge: false,
        timerPerTurn: 30
      })
      useUnoStore.getState().initializeFromSession(session as any, session.players as any)
      
      const state = useUnoStore.getState()
      expect(state.rules.stackDraw).toBe(false)
      expect(state.rules.allowWildChallenge).toBe(false)
      expect(state.rules.timer).toBe(30)
    })
  })

  describe('Game Actions', () => {
    const setupGame = () => {
      const session = {
        id: 'session-test',
        gameId: 'uno',
        title: 'Test',
        type: 'public' as const,
        status: 'waiting' as const,
        mode: 'realtime' as const,
        maxPlayers: 4,
        createdAt: Date.now(),
        hostId: 'player-1',
        players: [
          { id: 'player-1', name: 'Player 1', avatar: 'P1', isHost: true, status: 'ready' as const },
          { id: 'player-2', name: 'Player 2', avatar: 'P2', isHost: false, status: 'ready' as const }
        ],
        options: {
          allowStacking: true,
          allowWildChallenge: true,
          timerPerTurn: 20,
          allowBots: true,
          visibility: 'public' as const,
          mode: 'realtime' as const
        }
      }
      useUnoStore.getState().initializeFromSession(session as any, session.players as any)
    }

    test('drawCard adds card to current player hand', () => {
      setupGame()
      
      const initialHandSize = useUnoStore.getState().players[0].hand.length
      useUnoStore.getState().drawCard()
      
      const newHandSize = useUnoStore.getState().players[0].hand.length
      expect(newHandSize).toBe(initialHandSize + 1)
    })

    test('setForcedColor updates forced color', () => {
      setupGame()
      
      useUnoStore.getState().setForcedColor('R')
      expect(useUnoStore.getState().forcedColor).toBe('R')
      
      useUnoStore.getState().setForcedColor('B')
      expect(useUnoStore.getState().forcedColor).toBe('B')
    })

    test('callUno marks player as called uno', () => {
      setupGame()
      
      useUnoStore.getState().callUno('player-1')
      
      const player = useUnoStore.getState().players.find(p => p.id === 'player-1')
      expect(player?.hasCalledUno).toBe(true)
    })

    test('eliminatePlayer changes player status', () => {
      setupGame()
      
      useUnoStore.getState().eliminatePlayer('player-2')
      
      const player = useUnoStore.getState().players.find(p => p.id === 'player-2')
      expect(player?.status).toBe('eliminated')
    })
  })

  describe('Player State', () => {
    test('all players start with playing status', () => {
      const session = {
        id: 'test',
        gameId: 'uno',
        title: 'Test',
        type: 'public' as const,
        status: 'waiting' as const,
        mode: 'realtime' as const,
        maxPlayers: 4,
        createdAt: Date.now(),
        hostId: 'p1',
        players: [
          { id: 'p1', name: 'P1', avatar: 'P1', isHost: true, status: 'ready' as const },
          { id: 'p2', name: 'P2', avatar: 'P2', isHost: false, status: 'ready' as const },
          { id: 'p3', name: 'P3', avatar: 'P3', isHost: false, status: 'ready' as const }
        ],
        options: { allowStacking: true, timerPerTurn: 20 }
      }
      
      useUnoStore.getState().initializeFromSession(session as any, session.players as any)
      
      useUnoStore.getState().players.forEach(player => {
        expect(player.status).toBe('playing')
      })
    })

    test('players start with hasCalledUno as false', () => {
      const session = {
        id: 'test',
        gameId: 'uno',
        title: 'Test',
        type: 'public' as const,
        status: 'waiting' as const,
        mode: 'realtime' as const,
        maxPlayers: 4,
        createdAt: Date.now(),
        hostId: 'p1',
        players: [
          { id: 'p1', name: 'P1', avatar: 'P1', isHost: true, status: 'ready' as const },
          { id: 'p2', name: 'P2', avatar: 'P2', isHost: false, status: 'ready' as const }
        ],
        options: { allowStacking: true, timerPerTurn: 20 }
      }
      
      useUnoStore.getState().initializeFromSession(session as any, session.players as any)
      
      useUnoStore.getState().players.forEach(player => {
        expect(player.hasCalledUno).toBe(false)
      })
    })
  })

  describe('Game Flow', () => {
    test('turn starts at 0', () => {
      const session = {
        id: 'test',
        gameId: 'uno',
        title: 'Test',
        type: 'public' as const,
        status: 'waiting' as const,
        mode: 'realtime' as const,
        maxPlayers: 4,
        createdAt: Date.now(),
        hostId: 'p1',
        players: [
          { id: 'p1', name: 'P1', avatar: 'P1', isHost: true, status: 'ready' as const },
          { id: 'p2', name: 'P2', avatar: 'P2', isHost: false, status: 'ready' as const }
        ],
        options: { allowStacking: true, timerPerTurn: 20 }
      }
      
      useUnoStore.getState().initializeFromSession(session as any, session.players as any)
      
      expect(useUnoStore.getState().turn).toBe(0)
    })

    test('direction starts as clockwise (1)', () => {
      const session = {
        id: 'test',
        gameId: 'uno',
        title: 'Test',
        type: 'public' as const,
        status: 'waiting' as const,
        mode: 'realtime' as const,
        maxPlayers: 4,
        createdAt: Date.now(),
        hostId: 'p1',
        players: [
          { id: 'p1', name: 'P1', avatar: 'P1', isHost: true, status: 'ready' as const },
          { id: 'p2', name: 'P2', avatar: 'P2', isHost: false, status: 'ready' as const }
        ],
        options: { allowStacking: true, timerPerTurn: 20 }
      }
      
      useUnoStore.getState().initializeFromSession(session as any, session.players as any)
      
      expect(useUnoStore.getState().dir).toBe(1)
    })

    test('pendingDraw starts at 0', () => {
      const session = {
        id: 'test',
        gameId: 'uno',
        title: 'Test',
        type: 'public' as const,
        status: 'waiting' as const,
        mode: 'realtime' as const,
        maxPlayers: 4,
        createdAt: Date.now(),
        hostId: 'p1',
        players: [
          { id: 'p1', name: 'P1', avatar: 'P1', isHost: true, status: 'ready' as const },
          { id: 'p2', name: 'P2', avatar: 'P2', isHost: false, status: 'ready' as const }
        ],
        options: { allowStacking: true, timerPerTurn: 20 }
      }
      
      useUnoStore.getState().initializeFromSession(session as any, session.players as any)
      
      expect(useUnoStore.getState().pendingDraw).toBe(0)
    })
  })

  describe('Results', () => {
    test('results array is empty at start', () => {
      const session = {
        id: 'test',
        gameId: 'uno',
        title: 'Test',
        type: 'public' as const,
        status: 'waiting' as const,
        mode: 'realtime' as const,
        maxPlayers: 4,
        createdAt: Date.now(),
        hostId: 'p1',
        players: [
          { id: 'p1', name: 'P1', avatar: 'P1', isHost: true, status: 'ready' as const },
          { id: 'p2', name: 'P2', avatar: 'P2', isHost: false, status: 'ready' as const }
        ],
        options: { allowStacking: true, timerPerTurn: 20 }
      }
      
      useUnoStore.getState().initializeFromSession(session as any, session.players as any)
      
      expect(useUnoStore.getState().results).toEqual([])
    })

    test('finishRound adds winner to results', () => {
      const session = {
        id: 'test',
        gameId: 'uno',
        title: 'Test',
        type: 'public' as const,
        status: 'waiting' as const,
        mode: 'realtime' as const,
        maxPlayers: 4,
        createdAt: Date.now(),
        hostId: 'p1',
        players: [
          { id: 'p1', name: 'P1', avatar: 'P1', isHost: true, status: 'ready' as const },
          { id: 'p2', name: 'P2', avatar: 'P2', isHost: false, status: 'ready' as const }
        ],
        options: { allowStacking: true, timerPerTurn: 20 }
      }
      
      useUnoStore.getState().initializeFromSession(session as any, session.players as any)
      useUnoStore.getState().finishRound('p1')
      
      expect(useUnoStore.getState().results).toContain('p1')
    })
  })
})

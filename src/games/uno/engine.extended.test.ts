import { describe, test, expect } from 'vitest'
import {
  makeDeck,
  canPlay,
  createGame,
  applyEffect,
  nextTurn,
  cssClass,
  label,
  Card,
  Color,
  Variant,
  GameState
} from './engine'

describe('UNO Engine - Comprehensive Tests', () => {
  describe('makeDeck', () => {
    test('classic deck has 108 cards', () => {
      const deck = makeDeck('classic')
      // Standard UNO: 108 cards
      // 76 number cards (19 per color: one 0, two of 1-9)
      // 24 action cards (2 skip, 2 reverse, 2 draw 2 per color)
      // 8 wild cards (4 wild, 4 wild draw 4)
      expect(deck.length).toBe(108)
    })

    test('no-mercy deck has more cards than classic', () => {
      const classic = makeDeck('classic').length
      const noMercy = makeDeck('no-mercy').length
      expect(noMercy).toBeGreaterThan(classic)
    })

    test('deck contains all colors', () => {
      const deck = makeDeck('classic')
      const colors = new Set(deck.filter(c => c.color).map(c => c.color))
      
      expect(colors.has('R')).toBe(true)
      expect(colors.has('G')).toBe(true)
      expect(colors.has('B')).toBe(true)
      expect(colors.has('Y')).toBe(true)
    })

    test('deck contains wild cards', () => {
      const deck = makeDeck('classic')
      const wilds = deck.filter(c => c.type === 'wild')
      
      expect(wilds.length).toBeGreaterThan(0)
      expect(wilds.some(c => c.value === 'W')).toBe(true)
      expect(wilds.some(c => c.value === 'W4')).toBe(true)
    })

    test('no-mercy deck contains extra wild cards', () => {
      const deck = makeDeck('no-mercy')
      const values = deck.map(c => c.value)
      
      expect(values).toContain('W6')
      expect(values).toContain('W10')
      expect(values).toContain('WR4')
      expect(values).toContain('WR')
    })

    test('no-mercy deck contains extra action cards', () => {
      const deck = makeDeck('no-mercy')
      const values = deck.map(c => c.value)
      
      expect(values).toContain('SE') // Skip Everyone
      expect(values).toContain('DA') // Discard All
    })

    test('deck is shuffled (not in order)', () => {
      const deck1 = makeDeck('classic')
      const deck2 = makeDeck('classic')
      
      // Very unlikely to be identical after shuffle
      let differences = 0
      for (let i = 0; i < deck1.length; i++) {
        if (deck1[i].value !== deck2[i].value || deck1[i].color !== deck2[i].color) {
          differences++
        }
      }
      expect(differences).toBeGreaterThan(0)
    })

    test('each number appears correct times', () => {
      const deck = makeDeck('classic')
      const coloredCards = deck.filter(c => c.type === 'num' && c.color)
      
      // Count zeros (should be 4 - one per color)
      const zeros = coloredCards.filter(c => c.value === '0')
      expect(zeros.length).toBe(4)
      
      // Count ones (should be 8 - two per color)
      const ones = coloredCards.filter(c => c.value === '1')
      expect(ones.length).toBe(8)
    })
  })

  describe('canPlay', () => {
    test('can play same color', () => {
      const card: Card = { type: 'num', color: 'R', value: '5' }
      const top: Card = { type: 'num', color: 'R', value: '2' }
      expect(canPlay(card, top)).toBe(true)
    })

    test('can play same value different color', () => {
      const card: Card = { type: 'num', color: 'G', value: '5' }
      const top: Card = { type: 'num', color: 'R', value: '5' }
      expect(canPlay(card, top)).toBe(true)
    })

    test('can always play wild', () => {
      const wild: Card = { type: 'wild', value: 'W' }
      const top: Card = { type: 'num', color: 'R', value: '5' }
      expect(canPlay(wild, top)).toBe(true)
    })

    test('can always play wild draw 4', () => {
      const wild: Card = { type: 'wild', value: 'W4' }
      const top: Card = { type: 'num', color: 'B', value: '9' }
      expect(canPlay(wild, top)).toBe(true)
    })

    test('cannot play different color and value', () => {
      const card: Card = { type: 'num', color: 'G', value: '3' }
      const top: Card = { type: 'num', color: 'R', value: '5' }
      expect(canPlay(card, top)).toBe(false)
    })

    test('can play on wild with matching color', () => {
      const card: Card = { type: 'num', color: 'R', value: '3' }
      const top: Card = { type: 'wild', color: 'R', value: 'W' }
      expect(canPlay(card, top)).toBe(true)
    })

    test('action cards follow color rules', () => {
      const skip: Card = { type: 'action', color: 'B', value: 'S' }
      const top: Card = { type: 'num', color: 'B', value: '7' }
      expect(canPlay(skip, top)).toBe(true)
    })

    test('action cards can match other action cards', () => {
      const skip1: Card = { type: 'action', color: 'R', value: 'S' }
      const skip2: Card = { type: 'action', color: 'B', value: 'S' }
      expect(canPlay(skip1, skip2)).toBe(true)
    })
  })

  describe('applyEffect', () => {
    test('D2 adds 2 to pending draw', () => {
      const state: any = { pendingDraw: 0 }
      applyEffect(state, { type: 'action', color: 'R', value: 'D2' })
      expect(state.pendingDraw).toBe(2)
    })

    test('D2 stacks with existing pending draw', () => {
      const state: any = { pendingDraw: 2 }
      applyEffect(state, { type: 'action', color: 'R', value: 'D2' })
      expect(state.pendingDraw).toBe(4)
    })

    test('W4 adds 4 to pending draw', () => {
      const state: any = { pendingDraw: 0 }
      applyEffect(state, { type: 'wild', value: 'W4' })
      expect(state.pendingDraw).toBe(4)
    })

    test('W6 adds 6 to pending draw', () => {
      const state: any = { pendingDraw: 0 }
      applyEffect(state, { type: 'wild', value: 'W6' })
      expect(state.pendingDraw).toBe(6)
    })

    test('W10 adds 10 to pending draw', () => {
      const state: any = { pendingDraw: 0 }
      applyEffect(state, { type: 'wild', value: 'W10' })
      expect(state.pendingDraw).toBe(10)
    })

    test('WR4 adds 4 and reverses', () => {
      const state: any = { pendingDraw: 0, dir: 1 }
      applyEffect(state, { type: 'wild', value: 'WR4' })
      expect(state.pendingDraw).toBe(4)
      expect(state.dir).toBe(-1)
    })

    test('S skips next player', () => {
      const state: any = { turn: 0, dir: 1, players: [{}, {}, {}] }
      applyEffect(state, { type: 'action', color: 'R', value: 'S' })
      // Skip advances turn by one
      expect(state.turn).toBe(1)
    })

    test('R reverses direction', () => {
      const state: any = { dir: 1 }
      applyEffect(state, { type: 'action', color: 'R', value: 'R' })
      expect(state.dir).toBe(-1)
    })

    test('R reverses back', () => {
      const state: any = { dir: -1 }
      applyEffect(state, { type: 'action', color: 'R', value: 'R' })
      expect(state.dir).toBe(1)
    })

    test('SE sets skipAll flag', () => {
      const state: any = {}
      applyEffect(state, { type: 'action', color: 'R', value: 'SE' })
      expect(state.skipAll).toBe(true)
    })

    test('DA sets discardAll to card color', () => {
      const state: any = {}
      applyEffect(state, { type: 'action', color: 'G', value: 'DA' })
      expect(state.discardAll).toBe('G')
    })

    test('WR sets roulette flag', () => {
      const state: any = {}
      applyEffect(state, { type: 'wild', value: 'WR' })
      expect(state.roulette).toBe(true)
    })

    test('regular wild has no special effect', () => {
      const state: any = { pendingDraw: 0, dir: 1 }
      applyEffect(state, { type: 'wild', value: 'W' })
      expect(state.pendingDraw).toBe(0)
      expect(state.dir).toBe(1)
    })

    test('number cards have no effect', () => {
      const state: any = { pendingDraw: 0, dir: 1, turn: 0 }
      applyEffect(state, { type: 'num', color: 'R', value: '5' })
      expect(state.pendingDraw).toBe(0)
      expect(state.dir).toBe(1)
    })
  })

  describe('nextTurn', () => {
    test('advances turn clockwise', () => {
      const state: any = { turn: 0, dir: 1, players: [{}, {}, {}, {}] }
      nextTurn(state)
      expect(state.turn).toBe(1)
    })

    test('wraps around at end', () => {
      const state: any = { turn: 3, dir: 1, players: [{}, {}, {}, {}] }
      nextTurn(state)
      expect(state.turn).toBe(0)
    })

    test('goes counter-clockwise when reversed', () => {
      const state: any = { turn: 1, dir: -1, players: [{}, {}, {}, {}] }
      nextTurn(state)
      expect(state.turn).toBe(0)
    })

    test('wraps counter-clockwise', () => {
      const state: any = { turn: 0, dir: -1, players: [{}, {}, {}, {}] }
      nextTurn(state)
      expect(state.turn).toBe(3)
    })
  })

  describe('createGame', () => {
    test('creates game with correct number of players', () => {
      const game = createGame(['p1', 'p2', 'p3'])
      expect(game.players.length).toBe(3)
    })

    test('each player gets 7 cards', () => {
      const game = createGame(['p1', 'p2'])
      game.players.forEach(player => {
        expect(player.hand.length).toBe(7)
      })
    })

    test('game starts with one card in discard', () => {
      const game = createGame(['p1', 'p2'])
      expect(game.discard.length).toBe(1)
    })

    test('first discard is not wild', () => {
      // Run multiple times to ensure consistency
      for (let i = 0; i < 10; i++) {
        const game = createGame(['p1', 'p2'])
        expect(game.discard[0].type).not.toBe('wild')
      }
    })

    test('game is started', () => {
      const game = createGame(['p1', 'p2'])
      expect(game.started).toBe(true)
    })

    test('turn starts at 0', () => {
      const game = createGame(['p1', 'p2'])
      expect(game.turn).toBe(0)
    })

    test('direction is clockwise', () => {
      const game = createGame(['p1', 'p2'])
      expect(game.dir).toBe(1)
    })

    test('no pending draw at start', () => {
      const game = createGame(['p1', 'p2'])
      expect(game.pendingDraw).toBe(0)
    })

    test('classic variant by default', () => {
      const game = createGame(['p1', 'p2'])
      expect(game.variant).toBe('classic')
    })

    test('can create no-mercy variant', () => {
      const game = createGame(['p1', 'p2'], { variant: 'no-mercy' })
      expect(game.variant).toBe('no-mercy')
    })

    test('deck has remaining cards after deal', () => {
      const game = createGame(['p1', 'p2'])
      // 108 - 14 (7*2) - 1 (discard) = 93
      expect(game.deck.length).toBe(93)
    })

    test('player IDs are preserved', () => {
      const game = createGame(['alice', 'bob', 'charlie'])
      expect(game.players[0].id).toBe('alice')
      expect(game.players[1].id).toBe('bob')
      expect(game.players[2].id).toBe('charlie')
    })
  })

  describe('label', () => {
    test('returns value for wild', () => {
      expect(label({ type: 'wild', value: 'W' })).toBe('W')
      expect(label({ type: 'wild', value: 'W4' })).toBe('W4')
    })

    test('returns color+value for colored cards', () => {
      expect(label({ type: 'num', color: 'R', value: '5' })).toBe('R5')
      expect(label({ type: 'action', color: 'B', value: 'S' })).toBe('BS')
    })

    test('supports color override', () => {
      expect(label({ type: 'num', color: 'R', value: '5' }, 'G')).toBe('G5')
    })
  })

  describe('cssClass', () => {
    test('returns gradient for wild', () => {
      const cls = cssClass({ type: 'wild', value: 'W' })
      expect(cls).toContain('bg-gradient')
    })

    test('returns red for R color', () => {
      const cls = cssClass({ type: 'num', color: 'R', value: '5' })
      expect(cls).toContain('bg-red')
    })

    test('returns green for G color', () => {
      const cls = cssClass({ type: 'num', color: 'G', value: '5' })
      expect(cls).toContain('bg-green')
    })

    test('returns blue for B color', () => {
      const cls = cssClass({ type: 'num', color: 'B', value: '5' })
      expect(cls).toContain('bg-blue')
    })

    test('returns yellow for Y color', () => {
      const cls = cssClass({ type: 'num', color: 'Y', value: '5' })
      expect(cls).toContain('bg-yellow')
    })
  })

  describe('Card Types', () => {
    test('all card types are covered', () => {
      const deck = makeDeck('no-mercy')
      const types = new Set(deck.map(c => c.type))
      
      expect(types.has('num')).toBe(true)
      expect(types.has('action')).toBe(true)
      expect(types.has('wild')).toBe(true)
    })

    test('all number values exist', () => {
      const deck = makeDeck('classic')
      const numCards = deck.filter(c => c.type === 'num')
      const values = new Set(numCards.map(c => c.value))
      
      for (let i = 0; i <= 9; i++) {
        expect(values.has(String(i))).toBe(true)
      }
    })

    test('all basic action values exist', () => {
      const deck = makeDeck('classic')
      const actionCards = deck.filter(c => c.type === 'action')
      const values = new Set(actionCards.map(c => c.value))
      
      expect(values.has('S')).toBe(true)  // Skip
      expect(values.has('R')).toBe(true)  // Reverse
      expect(values.has('D2')).toBe(true) // Draw 2
    })
  })
})

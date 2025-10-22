import { create } from 'zustand'
import { createGame, Card, canPlay, applyEffect, nextTurn, Variant, Color } from '../games/uno/engine'
import { GameSession, SessionPlayer } from './games'

export type UnoVariant = Variant

export type UnoRules = {
  stackDraw: boolean
  allowWildChallenge: boolean
  timer: number
  eliminationThreshold?: number
}

export type UnoPlayer = {
  id: string
  name: string
  avatar: string
  isBot?: boolean
  hand: Card[]
  hasCalledUno: boolean
  status: 'playing' | 'waiting' | 'eliminated' | 'finished'
}

type UnoState = {
  sessionId: string | null
  variant: UnoVariant
  rules: UnoRules
  players: UnoPlayer[]
  deck: Card[]
  discard: Card[]
  turn: number
  dir: number
  started: boolean
  pendingDraw: number
  forcedColor?: Color
  rouletteColor?: Color
  results: string[]
  initializeFromSession: (session: GameSession, players: SessionPlayer[]) => void
  setForcedColor: (color: Color) => void
  playCard: (index: number, colorChoice?: Color) => void
  drawCard: () => void
  callUno: (playerId?: string) => void
  eliminatePlayer: (playerId: string) => void
  finishRound: (winnerId: string) => void
  reset: () => void
}

const DEFAULT_RULES: UnoRules = {
  stackDraw: true,
  allowWildChallenge: true,
  timer: 20
}

export const useUnoStore = create<UnoState>((set, get) => ({
  sessionId: null,
  variant: 'classic',
  rules: DEFAULT_RULES,
  players: [],
  deck: [],
  discard: [],
  turn: 0,
  dir: 1,
  started: false,
  pendingDraw: 0,
  forcedColor: undefined,
  rouletteColor: undefined,
  results: [],
  initializeFromSession: (session, metaPlayers) => {
    const variant: UnoVariant = session.gameId === 'uno-no-mercy' ? 'no-mercy' : 'classic'
    const rules: UnoRules = {
      stackDraw: session.options.allowStacking ?? true,
      allowWildChallenge: session.options.allowWildChallenge ?? true,
      timer: session.options.timerPerTurn ?? 20,
      eliminationThreshold: session.options.eliminationThreshold
    }

    const engineGame = createGame(
      metaPlayers.map((player) => player.id),
      { variant }
    )

    const metaById = new Map(metaPlayers.map((player) => [player.id, player]))
    const players: UnoPlayer[] = engineGame.players.map(({ id, hand }) => {
      const meta = metaById.get(id)
      return {
        id,
        name: meta?.name ?? id,
        avatar: meta?.avatar ?? id.slice(0, 2).toUpperCase(),
        isBot: meta?.isBot,
        hand: hand.slice(),
        hasCalledUno: false,
        status: 'playing'
      }
    })

    set({
      sessionId: session.id,
      variant,
      rules,
      players,
      deck: engineGame.deck,
      discard: engineGame.discard,
      turn: engineGame.turn,
      dir: engineGame.dir,
      started: true,
      pendingDraw: engineGame.pendingDraw,
      forcedColor: engineGame.discard[engineGame.discard.length - 1]?.color,
      rouletteColor: undefined,
      results: []
    })
  },
  setForcedColor: (color) => set({ forcedColor: color }),
  playCard: (index, colorChoice) => {
    const state = get()
    if (!state.started) return
    const player = state.players[state.turn]
    if (!player || player.status === 'eliminated') return
    const card = player.hand[index]
    if (!card) return

    const top = state.discard[state.discard.length - 1]

    if (state.pendingDraw > 0 && !isStackable(card)) {
      return
    }
    if (top && !canPlay(card, top)) {
      return
    }

    const players = clonePlayers(state.players)
    const current = players[state.turn]
    const removedCard = { ...card }
    current.hand = [...current.hand.slice(0, index), ...current.hand.slice(index + 1)]

    let forcedColor = state.forcedColor
    if (removedCard.type === 'wild') {
      const chosenColor = colorChoice ?? pickBestColor(current.hand)
      removedCard.color = chosenColor
      forcedColor = chosenColor
    } else {
      forcedColor = removedCard.color ?? forcedColor
    }

    const discard = [...state.discard, removedCard]
    const frame: any = {
      players,
      turn: state.turn,
      dir: state.dir,
      rules: { stackD2: state.rules.stackDraw },
      pendingDraw: state.pendingDraw
    }

    applyEffect(frame, removedCard)

    let pendingDraw = frame.pendingDraw || 0
    let dir = frame.dir || state.dir
    let rouletteColor = frame.roulette ? (removedCard.color as Color) : state.rouletteColor
    let discardAllColor = frame.discardAll as Color | undefined
    const skipAll = Boolean(frame.skipAll)

    if (state.variant === 'no-mercy') {
      if (removedCard.type === 'num' && removedCard.value === '7') {
        swapWithNext(players, state.turn, dir)
      }
      if (removedCard.type === 'num' && removedCard.value === '0') {
        rotateHands(players, dir)
      }
    }

    if (discardAllColor && removedCard.color === discardAllColor) {
      const remaining = current.hand.filter((c) => c.color !== discardAllColor)
      current.hand = remaining
    }

    const eliminationThreshold = state.rules.eliminationThreshold
    if (state.variant === 'no-mercy' && eliminationThreshold) {
      players.forEach((p, idx) => {
        if (p.status !== 'eliminated' && p.hand.length >= eliminationThreshold) {
          p.status = 'eliminated'
          if (idx === state.turn) {
            // current player eliminated after play, cannot continue
          }
        }
      })
    }

    let nextTurnIndex = state.turn
    if (!skipAll) {
      const tempFrame: any = { players, turn: frame.turn, dir }
      nextTurn(tempFrame)
      nextTurnIndex = findNextActivePlayer(tempFrame.turn, dir, players)
    }

    const hasWinner = current.hand.length === 0
    const newResults = hasWinner ? [...state.results, current.id] : state.results
    const started = hasWinner ? false : true

    set({
      players,
      discard,
      deck: state.deck,
      forcedColor,
      rouletteColor,
      turn: nextTurnIndex,
      dir,
      pendingDraw,
      started,
      results: newResults
    })

    if (!started) {
      return
    }

    const nextPlayer = get().players[get().turn]
    if (nextPlayer?.isBot) {
      scheduleBotTurn()
    }
  },
  drawCard: () => {
    const state = get()
    if (!state.started) return
    const players = clonePlayers(state.players)
    const player = players[state.turn]
    if (!player || player.status === 'eliminated') return

    let deck = [...state.deck]
    let discard = [...state.discard]

    const takeCard = () => {
      if (deck.length === 0) {
        const refill = reshuffle(discard)
        deck = refill.deck
        discard = refill.discard
      }
      return deck.pop() || null
    }

    const drawCount = state.pendingDraw > 0 ? state.pendingDraw : 1
    const drawn: Card[] = []

    if (state.rouletteColor) {
      let continueDrawing = true
      while (continueDrawing) {
        const card = takeCard()
        if (!card) break
        player.hand.push(card)
        drawn.push(card)
        if (card.color === state.rouletteColor || card.type === 'wild') {
          continueDrawing = false
        }
      }
    } else {
      for (let i = 0; i < drawCount; i++) {
        const card = takeCard()
        if (card) {
          player.hand.push(card)
          drawn.push(card)
        }
      }
    }

    const eliminationThreshold = state.rules.eliminationThreshold
    if (state.variant === 'no-mercy' && eliminationThreshold && player.hand.length >= eliminationThreshold) {
      player.status = 'eliminated'
    }

    const pendingDraw = state.pendingDraw > 0 ? 0 : state.pendingDraw
    const nextTurnIndex = findNextActivePlayer(
      computeNextIndex(state.turn, state.dir, players.length),
      state.dir,
      players
    )

    set({
      players,
      deck,
      discard,
      pendingDraw,
      rouletteColor: undefined,
      turn: nextTurnIndex
    })

    const nextPlayer = get().players[get().turn]
    if (nextPlayer?.isBot) {
      scheduleBotTurn()
    }
  },
  callUno: (playerId) => {
    set((state) => ({
      players: state.players.map((player) =>
        player.id === (playerId ?? state.players[state.turn]?.id)
          ? { ...player, hasCalledUno: true }
          : player
      )
    }))
  },
  eliminatePlayer: (playerId) => {
    set((state) => ({
      players: state.players.map((player) =>
        player.id === playerId ? { ...player, status: 'eliminated' } : player
      )
    }))
  },
  finishRound: (winnerId) => {
    set((state) => ({
      started: false,
      results: [...state.results, winnerId]
    }))
  },
  reset: () =>
    set({
      sessionId: null,
      players: [],
      deck: [],
      discard: [],
      turn: 0,
      dir: 1,
      pendingDraw: 0,
      started: false,
      variant: 'classic',
      rules: DEFAULT_RULES,
      forcedColor: undefined,
      rouletteColor: undefined,
      results: []
    })
}))

function clonePlayers(players: UnoPlayer[]): UnoPlayer[] {
  return players.map((player) => ({
    ...player,
    hand: player.hand.slice()
  }))
}

function computeNextIndex(current: number, dir: number, length: number) {
  return (current + dir + length) % length
}

function findNextActivePlayer(start: number, dir: number, players: UnoPlayer[]): number {
  const length = players.length
  let idx = start
  for (let i = 0; i < length; i++) {
    const player = players[idx]
    if (player && player.status !== 'eliminated') {
      return idx
    }
    idx = computeNextIndex(idx, dir, length)
  }
  return start
}

function isStackable(card: Card) {
  if (card.type === 'action' && card.value === 'D2') return true
  if (card.type === 'wild' && ['W4', 'W6', 'W10'].includes(card.value)) return true
  return false
}

function pickBestColor(hand: Card[]): Color {
  const counts: Record<Color, number> = { R: 0, G: 0, B: 0, Y: 0 }
  hand.forEach((card) => {
    if (card.color) counts[card.color] += 1
  })
  const entries = Object.entries(counts) as Array<[Color, number]>
  entries.sort((a, b) => b[1] - a[1])
  return (entries[0]?.[0] ?? 'R') as Color
}

function swapWithNext(players: UnoPlayer[], currentIndex: number, dir: number) {
  const nextIndex = findNextActivePlayer(
    computeNextIndex(currentIndex, dir, players.length),
    dir,
    players
  )
  if (nextIndex === currentIndex) return
  const temp = players[currentIndex].hand
  players[currentIndex].hand = players[nextIndex].hand
  players[nextIndex].hand = temp
}

function rotateHands(players: UnoPlayer[], dir: number) {
  const activeIndices = players
    .map((player, index) => (player.status !== 'eliminated' ? index : -1))
    .filter((index) => index >= 0)
  if (activeIndices.length < 2) return
  const hands = activeIndices.map((index) => players[index].hand)
  if (dir > 0) {
    hands.unshift(hands.pop() as Card[])
  } else {
    hands.push(hands.shift() as Card[])
  }
  activeIndices.forEach((index, handIdx) => {
    players[index].hand = hands[handIdx]
  })
}

function reshuffle(discard: Card[]) {
  if (discard.length <= 1) return { deck: [] as Card[], discard }
  const top = discard[discard.length - 1]
  const rest = discard.slice(0, discard.length - 1)
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[rest[i], rest[j]] = [rest[j], rest[i]]
  }
  return { deck: rest, discard: [top] }
}

function scheduleBotTurn() {
  setTimeout(() => {
    const state = getStoreSnapshot()
    if (!state.started) return
    const player = state.players[state.turn]
    if (!player || !player.isBot || player.status === 'eliminated') return
    const top = state.discard[state.discard.length - 1]
    let chosenIndex = -1
    let chosenColor: Color | undefined
    player.hand.some((card, index) => {
      if (state.pendingDraw > 0 && !isStackable(card)) {
        return false
      }
      if (!top || canPlay(card, top)) {
        chosenIndex = index
        if (card.type === 'wild') {
          chosenColor = pickBestColor(player.hand)
        }
        return true
      }
      return false
    })
    if (chosenIndex >= 0) {
      useUnoStore.getState().playCard(chosenIndex, chosenColor)
    } else {
      useUnoStore.getState().drawCard()
    }
  }, 600)
}

function getStoreSnapshot(): UnoState {
  return useUnoStore.getState()
}

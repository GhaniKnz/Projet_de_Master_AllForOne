export type Color = 'R' | 'G' | 'B' | 'Y'
export type Num = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
export type Action = 'S' | 'R' | 'D2' | 'SE' | 'DA'
export type Wild = 'W' | 'W4' | 'W6' | 'W10' | 'WR4' | 'WR'
export type Variant = 'classic' | 'no-mercy'

export type Card = {
  type: 'num' | 'action' | 'wild'
  color?: Color
  value: string
}

export type GameState = {
  players: Array<{ id: string; hand: Card[] }>
  deck: Card[]
  discard: Card[]
  turn: number
  dir: number
  started: boolean
  variant: Variant
  pendingDraw: number
}

const COLORS: Color[] = ['R', 'G', 'B', 'Y']
const NUMS: Num[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
const BASE_ACTIONS: Action[] = ['S', 'R', 'D2']
const NO_MERCY_ACTIONS: Action[] = ['SE', 'DA']
const BASE_WILDS: Wild[] = ['W', 'W4']
const NO_MERCY_WILDS: Wild[] = ['W6', 'W10', 'WR4', 'WR']

export function createGame(playerIds: string[], options?: { variant?: Variant }): GameState {
  const variant: Variant = options?.variant ?? 'classic'
  const deck = makeDeck(variant)
  const players = playerIds.map((id) => ({ id, hand: [] as Card[] }))

  for (let i = 0; i < 7; i++) {
    players.forEach((player) => {
      const card = deck.pop()
      if (card) player.hand.push(card)
    })
  }

  let top = deck.pop()!
  while (top.type === 'wild') {
    deck.unshift(top)
    top = deck.pop()!
  }

  return {
    players,
    deck,
    discard: [top],
    turn: 0,
    dir: 1,
    started: true,
    variant,
    pendingDraw: 0
  }
}

export function makeDeck(variant: Variant): Card[] {
  const deck: Card[] = []

  COLORS.forEach((color) => {
    NUMS.forEach((num) => {
      deck.push({ type: 'num', color, value: num })
      if (num !== '0') deck.push({ type: 'num', color, value: num })
    })

    BASE_ACTIONS.forEach((action) => {
      deck.push({ type: 'action', color, value: action })
      deck.push({ type: 'action', color, value: action })
    })

    if (variant === 'no-mercy') {
      NO_MERCY_ACTIONS.forEach((action) => {
        deck.push({ type: 'action', color, value: action })
      })
    }
  })

  BASE_WILDS.forEach((wild) => {
    for (let i = 0; i < 4; i++) deck.push({ type: 'wild', value: wild })
  })

  if (variant === 'no-mercy') {
    NO_MERCY_WILDS.forEach((wild) => {
      for (let i = 0; i < 4; i++) deck.push({ type: 'wild', value: wild })
    })
  }

  shuffle(deck)
  return deck
}

function shuffle(cards: Card[]) {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[cards[i], cards[j]] = [cards[j], cards[i]]
  }
}

export function label(card: Card, colorOverride?: Color) {
  if (card.type === 'wild') return card.value
  const color = colorOverride ?? card.color ?? ''
  return `${color}${card.value}`
}

export function canPlay(card: Card, top: Card) {
  if (!top) return true
  if (card.type === 'wild') return true
  if (top.type === 'wild' && top.color && card.color === top.color) return true
  if (card.color && top.color && card.color === top.color) return true
  if (card.value === top.value) return true
  return false
}

export function applyEffect(state: any, card: Card) {
  if (card.type === 'action') {
    switch (card.value) {
      case 'D2':
        state.pendingDraw = (state.pendingDraw || 0) + 2
        break
      case 'S':
        state.turn = (state.turn + state.dir + state.players.length) % state.players.length
        break
      case 'R':
        state.dir = -state.dir
        break
      case 'SE':
        state.skipAll = true
        break
      case 'DA':
        state.discardAll = card.color
        break
      default:
        break
    }
  }

  if (card.type === 'wild') {
    switch (card.value) {
      case 'W4':
        state.pendingDraw = (state.pendingDraw || 0) + 4
        break
      case 'W6':
        state.pendingDraw = (state.pendingDraw || 0) + 6
        break
      case 'W10':
        state.pendingDraw = (state.pendingDraw || 0) + 10
        break
      case 'WR4':
        state.pendingDraw = (state.pendingDraw || 0) + 4
        state.dir = -state.dir
        break
      case 'WR':
        state.roulette = true
        break
      default:
        break
    }
  }
}

export function nextTurn(state: any) {
  state.turn = (state.turn + state.dir + state.players.length) % state.players.length
}

export function cssClass(card: Card) {
  if (card.type === 'wild') return 'bg-gradient-to-br from-panel to-bg'
  switch (card.color) {
    case 'R':
      return 'bg-red-500'
    case 'G':
      return 'bg-green-500'
    case 'B':
      return 'bg-blue-500'
    case 'Y':
      return 'bg-yellow-400 text-black'
    default:
      return 'bg-panel'
  }
}

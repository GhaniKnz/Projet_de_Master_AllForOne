import { makeDeck, canPlay, createGame, applyEffect, cssClass } from './engine'

test('makeDeck generates classic deck', () => {
  const deck = makeDeck('classic')
  expect(deck.length).toBeGreaterThanOrEqual(100)
})

test('makeDeck adds extra cards for no mercy', () => {
  const classic = makeDeck('classic').length
  const noMercy = makeDeck('no-mercy').length
  expect(noMercy).toBeGreaterThan(classic)
})

test('canPlay allows same color or same value or wild', () => {
  const top = { type: 'num', color: 'R', value: '5' }
  expect(canPlay({ type: 'num', color: 'R', value: '2' } as any, top as any)).toBeTruthy()
  expect(canPlay({ type: 'num', color: 'G', value: '5' } as any, top as any)).toBeTruthy()
  expect(canPlay({ type: 'wild', value: 'W' } as any, top as any)).toBeTruthy()
})

test('applyEffect handles draw cards', () => {
  const state: any = { pendingDraw: 0 }
  applyEffect(state, { type: 'action', color: 'R', value: 'D2' } as any)
  expect(state.pendingDraw).toBe(2)
  applyEffect(state, { type: 'wild', value: 'W6' } as any)
  expect(state.pendingDraw).toBe(8)
})

test('cssClass returns gradient for wild', () => {
  const clazz = cssClass({ type: 'wild', value: 'W' } as any)
  expect(clazz).toContain('bg-gradient')
})

import { describe, expect, test } from 'vitest'
import { buildSessionPlayer } from './sessionPlayer'

describe('buildSessionPlayer', () => {
  test('utilisateur connecté', () => {
    const player = buildSessionPlayer({ name: 'Alice', avatar: 'AL', xp: 0, level: 1 }, { id: 'custom', status: 'ready' })
    expect(player.id).toBe('custom')
    expect(player.status).toBe('ready')
    expect(player.avatar).toBe('AL')
  })

  test('invité', () => {
    const player = buildSessionPlayer(null)
    expect(player.id.startsWith('guest-')).toBe(true)
    expect(player.name).toBe('Invite')
  })
})

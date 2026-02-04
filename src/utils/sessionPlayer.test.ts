import { describe, expect, test } from 'vitest'
import { buildSessionPlayer } from './sessionPlayer'
import type { User } from '../store/app'

describe('buildSessionPlayer', () => {
  test('utilisateur connecté', () => {
    const user: User = { 
      id: 'user-123',
      handle: '@alice',
      displayName: 'Alice', 
      avatarUrl: 'https://example.com/alice.jpg',
      xp: 0, 
      level: 1,
      rating: 1200
    }
    const player = buildSessionPlayer(user, { id: 'custom', status: 'ready' })
    expect(player.id).toBe('custom')
    expect(player.status).toBe('ready')
    expect(player.avatar).toBe('https://example.com/alice.jpg')
  })

  test('invité', () => {
    const player = buildSessionPlayer(null)
    expect(player.id.startsWith('guest-')).toBe(true)
    expect(player.name).toBe('Invite')
  })
})

import { describe, test, expect } from 'vitest'
import { buildSessionPlayer } from './sessionPlayer'
import type { User } from '../store/app'

describe('Session Player Builder - Extended Tests', () => {
  describe('Authenticated User', () => {
    const mockUser: User = {
      id: 'user-123',
      handle: '@testuser',
      displayName: 'Test User',
      avatarUrl: 'https://example.com/avatar.jpg',
      level: 5,
      xp: 1000,
      rating: 1500
    }

    test('creates player from user data', () => {
      const player = buildSessionPlayer(mockUser)
      expect(player.name).toBe('Test User')
      expect(player.avatar).toBe('https://example.com/avatar.jpg')
      expect(player.isHost).toBe(false)
      expect(player.status).toBe('waiting')
    })

    test('respects status override', () => {
      const player = buildSessionPlayer(mockUser, { status: 'ready' })
      expect(player.status).toBe('ready')
    })

    test('respects isHost override', () => {
      const player = buildSessionPlayer(mockUser, { isHost: true })
      expect(player.isHost).toBe(true)
    })

    test('handles user without avatar url', () => {
      const userWithoutAvatar: User = {
        ...mockUser,
        avatarUrl: undefined
      }
      const player = buildSessionPlayer(userWithoutAvatar)
      expect(player.avatar).toBe('TE') // First 2 chars uppercase
    })
  })

  describe('Guest User', () => {
    test('creates guest player when no user data', () => {
      const player = buildSessionPlayer(null)

      expect(player.id).toMatch(/^guest-/)
      expect(player.name).toBe('Invite')
    })

    test('guest has default status', () => {
      const player = buildSessionPlayer(null)
      expect(player.status).toBe('waiting')
    })

    test('guest is not host by default', () => {
      const player = buildSessionPlayer(null)
      expect(player.isHost).toBe(false)
    })

    test('guest can be host with override', () => {
      const player = buildSessionPlayer(null, { isHost: true })
      expect(player.isHost).toBe(true)
    })

    test('guest ID is unique', () => {
      const player1 = buildSessionPlayer(null)
      const player2 = buildSessionPlayer(null)
      expect(player1.id).not.toBe(player2.id)
    })

    test('guest can have custom name override', () => {
      const player = buildSessionPlayer(null, { name: 'Custom Guest' })
      expect(player.name).toBe('Custom Guest')
    })
  })

  describe('Override Combinations', () => {
    const mockUser: User = {
      id: 'user-123',
      handle: '@testuser',
      displayName: 'Test User',
      level: 5,
      xp: 1000,
      rating: 1500
    }

    test('all overrides work together', () => {
      const player = buildSessionPlayer(null, {
        id: 'custom-id',
        name: 'Custom Name',
        avatar: 'CN',
        isHost: true,
        status: 'ready',
        rating: 2000
      })

      expect(player.id).toBe('custom-id')
      expect(player.name).toBe('Custom Name')
      expect(player.avatar).toBe('CN')
      expect(player.isHost).toBe(true)
      expect(player.status).toBe('ready')
      expect(player.rating).toBe(2000)
    })

    test('partial overrides preserve user data', () => {
      const player = buildSessionPlayer(mockUser, { isHost: true })
      expect(player.name).toBe('Test User')
      expect(player.isHost).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    test('handles empty string name in user', () => {
      const userWithEmptyName: User = {
        id: 'user-empty',
        handle: '@empty',
        displayName: '',
        level: 1,
        xp: 0,
        rating: 1200
      }
      const player = buildSessionPlayer(userWithEmptyName)
      // Should handle empty name gracefully
      expect(typeof player.name).toBe('string')
    })

    test('handles undefined user with overrides', () => {
      const player = buildSessionPlayer(null, { name: 'Override Name' })
      expect(player.name).toBe('Override Name')
    })
  })

  describe('Type Safety', () => {
    test('player has all required properties', () => {
      const mockUser: User = {
        id: 'user-123',
        handle: '@test',
        displayName: 'Test',
        level: 1,
        xp: 0,
        rating: 1200
      }
      const player = buildSessionPlayer(mockUser)

      expect(player).toHaveProperty('id')
      expect(player).toHaveProperty('name')
      expect(player).toHaveProperty('avatar')
      expect(player).toHaveProperty('isHost')
      expect(player).toHaveProperty('status')
    })

    test('status is valid enum value', () => {
      const player = buildSessionPlayer(null)
      expect(['waiting', 'ready', 'disconnected']).toContain(player.status)
    })
  })
})

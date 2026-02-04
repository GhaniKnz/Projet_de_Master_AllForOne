import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock import.meta.env
vi.mock('./api', async () => {
  const actual = await vi.importActual('./api')
  return {
    ...actual,
  }
})

describe('API Module', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('ApiError', () => {
    test('creates error with status and message', async () => {
      const { ApiError } = await import('./api')
      const error = new ApiError(404, 'Not found')
      expect(error.status).toBe(404)
      expect(error.message).toBe('Not found')
    })

    test('creates error with body', async () => {
      const { ApiError } = await import('./api')
      const body = { details: 'Invalid ID' }
      const error = new ApiError(400, 'Bad request', body)
      expect(error.body).toEqual(body)
    })
  })

  describe('isApiError', () => {
    test('returns true for ApiError instances', async () => {
      const { ApiError, isApiError } = await import('./api')
      const error = new ApiError(500, 'Server error')
      expect(isApiError(error)).toBe(true)
    })

    test('returns false for regular errors', async () => {
      const { isApiError } = await import('./api')
      const error = new Error('Regular error')
      expect(isApiError(error)).toBe(false)
    })

    test('returns false for non-error values', async () => {
      const { isApiError } = await import('./api')
      expect(isApiError(null)).toBe(false)
      expect(isApiError(undefined)).toBe(false)
      expect(isApiError('string')).toBe(false)
    })
  })

  describe('getCurrentUser', () => {
    test('returns null when no token', async () => {
      const { getCurrentUser } = await import('./api')
      expect(getCurrentUser()).toBeNull()
    })

    test('parses valid JWT payload', async () => {
      // Create a mock JWT (header.payload.signature)
      const payload = {
        userId: 'user-123',
        displayName: 'Test User',
        email: 'test@example.com',
        role: 'user'
      }
      const encodedPayload = btoa(JSON.stringify(payload))
      const mockToken = `header.${encodedPayload}.signature`
      
      localStorage.setItem('afo_token', mockToken)
      
      const { getCurrentUser } = await import('./api')
      const user = getCurrentUser()
      
      expect(user?.userId).toBe('user-123')
      expect(user?.displayName).toBe('Test User')
      expect(user?.email).toBe('test@example.com')
      expect(user?.role).toBe('user')
    })

    test('returns null for invalid token', async () => {
      localStorage.setItem('afo_token', 'invalid-token')
      const { getCurrentUser } = await import('./api')
      expect(getCurrentUser()).toBeNull()
    })
  })

  describe('Type definitions', () => {
    test('FeedPost type structure', async () => {
      const post: import('./api').FeedPost = {
        id: 'post-1',
        authorId: 'author-1',
        author: {
          id: 'author-1',
          displayName: 'Author',
          handle: '@author',
          level: 5
        },
        content: 'Test content',
        media: [],
        likesCount: 10,
        commentsCount: 5,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        viewerHasLiked: false
      }
      expect(post.id).toBe('post-1')
    })

    test('UserProfile type structure', async () => {
      const profile: import('./api').UserProfile = {
        id: 'user-1',
        displayName: 'User',
        handle: '@user',
        xp: 100,
        level: 2,
        stats: { wins: 5, losses: 3 },
        friends: ['friend-1'],
        postsCount: 10,
        commentsCount: 20,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      expect(profile.id).toBe('user-1')
    })

    test('Trophy type structure', async () => {
      const trophy: import('./api').Trophy = {
        id: 'trophy-1',
        name: 'First Win',
        description: 'Win your first game',
        icon: '🏆',
        category: 'general',
        xpReward: 50,
        rarity: 'common'
      }
      expect(trophy.id).toBe('trophy-1')
    })
  })
})

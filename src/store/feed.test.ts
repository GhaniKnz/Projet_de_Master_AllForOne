import { describe, test, expect, beforeEach, vi } from 'vitest'
import { useFeedStore } from './feed'

// Mock socket and api
vi.mock('../lib/socket', () => ({
  getSocket: vi.fn(() => null),
  disconnectSocket: vi.fn()
}))

vi.mock('../lib/api', () => ({
  isBackendConfigured: vi.fn(() => false),
  api: {
    fetchFeed: vi.fn(),
    createFeedPost: vi.fn(),
    toggleFeedLike: vi.fn(),
    fetchFeedComments: vi.fn(),
    createFeedComment: vi.fn()
  },
  getCurrentUser: vi.fn(() => null),
  isApiError: vi.fn((err) => err?.status !== undefined)
}))

describe('Feed Store', () => {
  beforeEach(() => {
    // Reset store to initial state
    useFeedStore.setState({
      remote: false,
      loading: false,
      error: undefined,
      initialized: false,
      posts: [],
      trends: [],
      cursor: null,
      hasMore: true,
      comments: {},
      socketReady: false
    })
  })

  describe('Initial State', () => {
    test('has correct initial values', () => {
      const state = useFeedStore.getState()
      expect(state.remote).toBe(false)
      expect(state.loading).toBe(false)
      expect(state.initialized).toBe(false)
      expect(state.posts).toEqual([])
      expect(state.hasMore).toBe(true)
    })
  })

  describe('Error Handling', () => {
    test('clearError removes error state', () => {
      useFeedStore.setState({ error: 'Test error' })
      expect(useFeedStore.getState().error).toBe('Test error')

      useFeedStore.getState().clearError()
      expect(useFeedStore.getState().error).toBeUndefined()
    })
  })

  describe('Offline Mode', () => {
    test('initialize loads fallback data when backend not configured', async () => {
      await useFeedStore.getState().initialize()

      const state = useFeedStore.getState()
      expect(state.initialized).toBe(true)
      expect(state.posts.length).toBeGreaterThan(0)
      expect(state.trends.length).toBeGreaterThan(0)
    })

    test('fallback posts have required structure', async () => {
      await useFeedStore.getState().initialize()

      const posts = useFeedStore.getState().posts
      posts.forEach(post => {
        expect(post).toHaveProperty('id')
        expect(post).toHaveProperty('authorId')
        expect(post).toHaveProperty('content')
        expect(post).toHaveProperty('likesCount')
        expect(post).toHaveProperty('commentsCount')
        expect(post).toHaveProperty('createdAt')
      })
    })

    test('fallback trends have required structure', async () => {
      await useFeedStore.getState().initialize()

      const trends = useFeedStore.getState().trends
      trends.forEach(trend => {
        expect(trend).toHaveProperty('id')
        expect(trend).toHaveProperty('title')
        expect(trend).toHaveProperty('description')
        expect(trend).toHaveProperty('growth')
      })
    })
  })

  describe('Comments State', () => {
    test('comments state structure', () => {
      const postId = 'post-123'
      useFeedStore.setState({
        comments: {
          [postId]: {
            items: [],
            loading: false,
            cursor: null,
            hasMore: true
          }
        }
      })

      const commentState = useFeedStore.getState().comments[postId]
      expect(commentState.items).toEqual([])
      expect(commentState.loading).toBe(false)
      expect(commentState.hasMore).toBe(true)
    })
  })

  describe('Post Data Integrity', () => {
    test('posts contain valid author information', async () => {
      await useFeedStore.getState().initialize()

      const posts = useFeedStore.getState().posts
      posts.forEach(post => {
        if (post.author) {
          expect(post.author).toHaveProperty('id')
          expect(post.author).toHaveProperty('displayName')
          expect(post.author).toHaveProperty('handle')
          expect(post.author).toHaveProperty('level')
        }
      })
    })

    test('posts have valid media array', async () => {
      await useFeedStore.getState().initialize()

      const posts = useFeedStore.getState().posts
      posts.forEach(post => {
        expect(Array.isArray(post.media)).toBe(true)
        post.media.forEach(media => {
          expect(media).toHaveProperty('url')
          expect(media).toHaveProperty('type')
          expect(['image', 'video']).toContain(media.type)
        })
      })
    })
  })
})

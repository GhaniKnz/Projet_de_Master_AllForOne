import { describe, test, expect, beforeEach, vi } from 'vitest'
import { useChatStore } from './chat'

// Mock dependencies
vi.mock('../lib/socket', () => ({
  getSocket: vi.fn(() => null),
  disconnectSocket: vi.fn()
}))

vi.mock('../lib/api', () => ({
  isBackendConfigured: vi.fn(() => false),
  api: {
    getConversations: vi.fn(),
    createConversation: vi.fn(),
    getConversationMessages: vi.fn(),
    sendConversationMessage: vi.fn(),
    toggleConversationPin: vi.fn()
  },
  getCurrentUser: vi.fn(() => null),
  isApiError: vi.fn((err) => err?.status !== undefined)
}))

describe('Chat Store', () => {
  beforeEach(() => {
    useChatStore.setState({
      remote: false,
      loading: false,
      error: undefined,
      conversations: [],
      messages: {},
      activeId: undefined,
      unread: {}
    })
  })

  describe('Initial State', () => {
    test('has correct initial values', () => {
      const state = useChatStore.getState()
      expect(state.remote).toBe(false)
      expect(state.loading).toBe(false)
      expect(state.conversations).toEqual([])
      expect(state.activeId).toBeUndefined()
    })
  })

  describe('Offline Mode', () => {
    test('initialize loads fallback conversations', async () => {
      await useChatStore.getState().initialize()

      const state = useChatStore.getState()
      expect(state.conversations.length).toBeGreaterThan(0)
    })

    test('fallback conversations have required structure', async () => {
      await useChatStore.getState().initialize()

      const conversations = useChatStore.getState().conversations
      conversations.forEach(conv => {
        expect(conv).toHaveProperty('id')
        expect(conv).toHaveProperty('type')
        expect(['dm', 'group']).toContain(conv.type)
        expect(conv).toHaveProperty('members')
        expect(Array.isArray(conv.members)).toBe(true)
      })
    })
  })

  describe('Active Conversation', () => {
    test('loadMessages changes activeId', async () => {
      await useChatStore.getState().initialize()
      
      const conversations = useChatStore.getState().conversations
      if (conversations.length > 0) {
        await useChatStore.getState().loadMessages(conversations[0].id)
        expect(useChatStore.getState().activeId).toBe(conversations[0].id)
      }
    })

    test('loadMessages loads different conversation', async () => {
      await useChatStore.getState().initialize()
      
      const conversations = useChatStore.getState().conversations
      if (conversations.length > 1) {
        await useChatStore.getState().loadMessages(conversations[0].id)
        await useChatStore.getState().loadMessages(conversations[1].id)
        expect(useChatStore.getState().activeId).toBe(conversations[1].id)
      }
    })
  })

  describe('Messages Structure', () => {
    test('messages are stored by conversation id', async () => {
      await useChatStore.getState().initialize()

      const messages = useChatStore.getState().messages
      expect(typeof messages).toBe('object')
    })

    test('loadMessages populates messages for conversation', async () => {
      await useChatStore.getState().initialize()
      
      const conversations = useChatStore.getState().conversations
      if (conversations.length > 0) {
        await useChatStore.getState().loadMessages(conversations[0].id)
        const messages = useChatStore.getState().messages
        expect(messages[conversations[0].id]).toBeDefined()
      }
    })
  })

  describe('Unread Count', () => {
    test('unread is an object', () => {
      const state = useChatStore.getState()
      expect(typeof state.unread).toBe('object')
    })
  })

  describe('Error Handling', () => {
    test('clearError clears the error', () => {
      useChatStore.setState({ error: 'Test error' })
      useChatStore.getState().clearError()
      expect(useChatStore.getState().error).toBeUndefined()
    })
  })
})

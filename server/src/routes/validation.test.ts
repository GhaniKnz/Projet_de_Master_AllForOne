import { describe, test, expect } from 'vitest'
import { z } from 'zod'

describe('API Validation Schemas', () => {
  describe('Register Schema', () => {
    const RegisterSchema = z.object({
      email: z.string().email().transform((value) => value.toLowerCase()),
      password: z.string().min(8).max(128),
      displayName: z.string().min(2).max(50)
    })

    test('accepts valid registration data', () => {
      const data = {
        email: 'test@example.com',
        password: 'securepassword123',
        displayName: 'Test User'
      }

      const result = RegisterSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    test('normalizes email to lowercase', () => {
      const data = {
        email: 'TEST@EXAMPLE.COM',
        password: 'securepassword123',
        displayName: 'Test User'
      }

      const result = RegisterSchema.parse(data)
      expect(result.email).toBe('test@example.com')
    })

    test('rejects invalid email', () => {
      const data = {
        email: 'not-an-email',
        password: 'securepassword123',
        displayName: 'Test User'
      }

      const result = RegisterSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    test('rejects short password', () => {
      const data = {
        email: 'test@example.com',
        password: 'short',
        displayName: 'Test User'
      }

      const result = RegisterSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    test('rejects very long password', () => {
      const data = {
        email: 'test@example.com',
        password: 'x'.repeat(200),
        displayName: 'Test User'
      }

      const result = RegisterSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    test('rejects short displayName', () => {
      const data = {
        email: 'test@example.com',
        password: 'securepassword123',
        displayName: 'X'
      }

      const result = RegisterSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    test('rejects long displayName', () => {
      const data = {
        email: 'test@example.com',
        password: 'securepassword123',
        displayName: 'X'.repeat(100)
      }

      const result = RegisterSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('Login Schema', () => {
    const LoginSchema = z.object({
      email: z.string().email().transform((value) => value.toLowerCase()),
      password: z.string().min(1)
    })

    test('accepts valid login data', () => {
      const data = {
        email: 'test@example.com',
        password: 'anypassword'
      }

      const result = LoginSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    test('rejects empty password', () => {
      const data = {
        email: 'test@example.com',
        password: ''
      }

      const result = LoginSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('Session Create Schema', () => {
    const CreateSchema = z.object({
      gameId: z.string().min(1),
      title: z.string().optional(),
      type: z.enum(['public', 'private', 'ranked']).optional(),
      mode: z.enum(['realtime', 'turn-based']).optional(),
      maxPlayers: z.number().int().min(2).max(10).optional(),
      options: z.record(z.any()).optional()
    })

    test('accepts minimal session data', () => {
      const data = { gameId: 'uno' }

      const result = CreateSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    test('accepts full session data', () => {
      const data = {
        gameId: 'uno',
        title: 'My UNO Game',
        type: 'public',
        mode: 'realtime',
        maxPlayers: 4,
        options: { allowStacking: true, timerPerTurn: 20 }
      }

      const result = CreateSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    test('rejects empty gameId', () => {
      const data = { gameId: '' }

      const result = CreateSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    test('rejects invalid type', () => {
      const data = {
        gameId: 'uno',
        type: 'invalid-type'
      }

      const result = CreateSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    test('rejects invalid mode', () => {
      const data = {
        gameId: 'uno',
        mode: 'invalid-mode'
      }

      const result = CreateSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    test('rejects maxPlayers below 2', () => {
      const data = {
        gameId: 'uno',
        maxPlayers: 1
      }

      const result = CreateSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    test('rejects maxPlayers above 10', () => {
      const data = {
        gameId: 'uno',
        maxPlayers: 11
      }

      const result = CreateSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    test('rejects non-integer maxPlayers', () => {
      const data = {
        gameId: 'uno',
        maxPlayers: 4.5
      }

      const result = CreateSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('Bot Schema', () => {
    const AddBotSchema = z.object({
      name: z.string().trim().min(1).max(30).optional(),
      difficulty: z.enum(['easy', 'normal', 'hard']).optional()
    }).optional()

    test('accepts empty object', () => {
      const result = AddBotSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    test('accepts undefined', () => {
      const result = AddBotSchema.safeParse(undefined)
      expect(result.success).toBe(true)
    })

    test('accepts valid bot name', () => {
      const data = { name: 'Bot Alpha' }
      const result = AddBotSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    test('accepts valid difficulty', () => {
      const data = { difficulty: 'hard' }
      const result = AddBotSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    test('rejects very long bot name', () => {
      const data = { name: 'X'.repeat(50) }
      const result = AddBotSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    test('rejects invalid difficulty', () => {
      const data = { difficulty: 'impossible' }
      const result = AddBotSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('Feed Post Schema', () => {
    const FeedPostSchema = z.object({
      content: z.string().min(1).max(1000),
      media: z.array(z.object({
        url: z.string().url(),
        type: z.enum(['image', 'video']),
        width: z.number().optional(),
        height: z.number().optional()
      })).optional()
    })

    test('accepts text only post', () => {
      const data = { content: 'Hello world!' }
      const result = FeedPostSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    test('accepts post with media', () => {
      const data = {
        content: 'Check this out!',
        media: [
          { url: 'https://example.com/image.jpg', type: 'image' }
        ]
      }
      const result = FeedPostSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    test('rejects empty content', () => {
      const data = { content: '' }
      const result = FeedPostSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    test('rejects very long content', () => {
      const data = { content: 'X'.repeat(2000) }
      const result = FeedPostSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    test('rejects invalid media URL', () => {
      const data = {
        content: 'Test',
        media: [{ url: 'not-a-url', type: 'image' }]
      }
      const result = FeedPostSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    test('rejects invalid media type', () => {
      const data = {
        content: 'Test',
        media: [{ url: 'https://example.com/file.pdf', type: 'pdf' }]
      }
      const result = FeedPostSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('Conversation Schema', () => {
    const ConversationSchema = z.object({
      members: z.array(z.string()).min(1),
      title: z.string().max(100).optional()
    })

    test('accepts valid conversation', () => {
      const data = {
        members: ['user-1', 'user-2'],
        title: 'Chat Group'
      }
      const result = ConversationSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    test('accepts conversation without title', () => {
      const data = { members: ['user-1'] }
      const result = ConversationSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    test('rejects empty members', () => {
      const data = { members: [] }
      const result = ConversationSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    test('rejects very long title', () => {
      const data = {
        members: ['user-1'],
        title: 'X'.repeat(200)
      }
      const result = ConversationSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })
})

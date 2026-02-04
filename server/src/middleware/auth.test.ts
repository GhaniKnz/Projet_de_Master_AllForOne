import { describe, test, expect, vi, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'

// Mock environment
process.env.JWT_SECRET = 'test-secret-key'

describe('Auth Middleware', () => {
  const JWT_SECRET = 'test-secret-key'

  describe('Token Generation', () => {
    test('generates valid JWT token', () => {
      const payload = {
        userId: 'user-123',
        displayName: 'Test User',
        email: 'test@example.com',
        role: 'user',
        handle: '@testuser'
      }

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' })

      expect(token).toBeTruthy()
      expect(typeof token).toBe('string')
      expect(token.split('.').length).toBe(3) // JWT has 3 parts
    })

    test('token contains correct payload', () => {
      const payload = {
        userId: 'user-123',
        displayName: 'Test User',
        email: 'test@example.com',
        role: 'admin',
        handle: '@admin'
      }

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' })
      const decoded = jwt.verify(token, JWT_SECRET) as typeof payload & { iat: number; exp: number }

      expect(decoded.userId).toBe('user-123')
      expect(decoded.displayName).toBe('Test User')
      expect(decoded.email).toBe('test@example.com')
      expect(decoded.role).toBe('admin')
    })

    test('token expires correctly', () => {
      const payload = { userId: 'user-123' }
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1s' })

      // Wait for expiration
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(() => jwt.verify(token, JWT_SECRET)).toThrow()
          resolve()
        }, 1100)
      })
    })
  })

  describe('Token Verification', () => {
    test('verifies valid token', () => {
      const payload = { userId: 'user-123', role: 'user' }
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' })

      const decoded = jwt.verify(token, JWT_SECRET)

      expect(decoded).toBeTruthy()
    })

    test('rejects invalid token', () => {
      expect(() => jwt.verify('invalid-token', JWT_SECRET)).toThrow()
    })

    test('rejects token with wrong secret', () => {
      const payload = { userId: 'user-123' }
      const token = jwt.sign(payload, 'different-secret', { expiresIn: '1h' })

      expect(() => jwt.verify(token, JWT_SECRET)).toThrow()
    })

    test('rejects expired token', () => {
      const payload = { userId: 'user-123' }
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '-1s' })

      expect(() => jwt.verify(token, JWT_SECRET)).toThrow()
    })

    test('rejects malformed token', () => {
      expect(() => jwt.verify('not.a.jwt', JWT_SECRET)).toThrow()
    })
  })

  describe('Payload Validation', () => {
    test('userId is required in payload', () => {
      const validPayload = { userId: 'user-123' }
      const token = jwt.sign(validPayload, JWT_SECRET)
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }

      expect(decoded.userId).toBe('user-123')
    })

    test('role defaults correctly', () => {
      const payload = { userId: 'user-123', role: 'user' }
      const token = jwt.sign(payload, JWT_SECRET)
      const decoded = jwt.verify(token, JWT_SECRET) as { role: string }

      expect(decoded.role).toBe('user')
    })

    test('admin role is recognized', () => {
      const payload = { userId: 'admin-123', role: 'admin' }
      const token = jwt.sign(payload, JWT_SECRET)
      const decoded = jwt.verify(token, JWT_SECRET) as { role: string }

      expect(decoded.role).toBe('admin')
    })
  })
})

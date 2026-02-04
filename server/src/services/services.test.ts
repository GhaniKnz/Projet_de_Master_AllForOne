import { describe, test, expect } from 'vitest'
import bcrypt from 'bcryptjs'

describe('Password Hashing', () => {
  describe('bcrypt', () => {
    test('hashes password correctly', async () => {
      const password = 'securePassword123!'
      const hash = await bcrypt.hash(password, 10)

      expect(hash).not.toBe(password)
      expect(hash.length).toBeGreaterThan(password.length)
    })

    test('verifies correct password', async () => {
      const password = 'securePassword123!'
      const hash = await bcrypt.hash(password, 10)

      const isValid = await bcrypt.compare(password, hash)
      expect(isValid).toBe(true)
    })

    test('rejects incorrect password', async () => {
      const password = 'securePassword123!'
      const hash = await bcrypt.hash(password, 10)

      const isValid = await bcrypt.compare('wrongPassword', hash)
      expect(isValid).toBe(false)
    })

    test('different passwords produce different hashes', async () => {
      const password1 = 'password1'
      const password2 = 'password2'

      const hash1 = await bcrypt.hash(password1, 10)
      const hash2 = await bcrypt.hash(password2, 10)

      expect(hash1).not.toBe(hash2)
    })

    test('same password produces different hashes (salt)', async () => {
      const password = 'samePassword'

      const hash1 = await bcrypt.hash(password, 10)
      const hash2 = await bcrypt.hash(password, 10)

      expect(hash1).not.toBe(hash2)
      // But both should verify
      expect(await bcrypt.compare(password, hash1)).toBe(true)
      expect(await bcrypt.compare(password, hash2)).toBe(true)
    })

    test('handles empty password', async () => {
      const password = ''
      const hash = await bcrypt.hash(password, 10)

      expect(await bcrypt.compare('', hash)).toBe(true)
      expect(await bcrypt.compare('something', hash)).toBe(false)
    })

    test('handles special characters', async () => {
      const password = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`'
      const hash = await bcrypt.hash(password, 10)

      expect(await bcrypt.compare(password, hash)).toBe(true)
    })

    test('handles unicode characters', async () => {
      const password = 'motdepasse日本語🔐'
      const hash = await bcrypt.hash(password, 10)

      expect(await bcrypt.compare(password, hash)).toBe(true)
    })

    test('handles very long password', async () => {
      const password = 'a'.repeat(128)
      const hash = await bcrypt.hash(password, 10)

      expect(await bcrypt.compare(password, hash)).toBe(true)
    })
  })
})

describe('XP System', () => {
  const XP_CONFIG = {
    BASE_WIN_XP: 50,
    BASE_LOSS_XP: 20,
    STREAK_BONUS: 10,
    MAX_STREAK_BONUS: 50,
    LEVEL_MULTIPLIER: 1.5
  }

  function calculateXp(isWinner: boolean, winStreak: number): number {
    const base = isWinner ? XP_CONFIG.BASE_WIN_XP : XP_CONFIG.BASE_LOSS_XP
    const streakBonus = isWinner
      ? Math.min(winStreak * XP_CONFIG.STREAK_BONUS, XP_CONFIG.MAX_STREAK_BONUS)
      : 0
    return base + streakBonus
  }

  function xpForLevel(level: number): number {
    return Math.floor(100 * Math.pow(XP_CONFIG.LEVEL_MULTIPLIER, level - 1))
  }

  function levelFromXp(totalXp: number): number {
    let level = 1
    let xpNeeded = xpForLevel(level)
    let accumulated = 0

    while (accumulated + xpNeeded <= totalXp) {
      accumulated += xpNeeded
      level++
      xpNeeded = xpForLevel(level)
    }

    return level
  }

  describe('XP Calculation', () => {
    test('winner gets base XP', () => {
      const xp = calculateXp(true, 0)
      expect(xp).toBe(50)
    })

    test('loser gets reduced XP', () => {
      const xp = calculateXp(false, 0)
      expect(xp).toBe(20)
    })

    test('win streak increases XP', () => {
      const xp = calculateXp(true, 3)
      expect(xp).toBe(50 + 30) // 50 + 3*10
    })

    test('streak bonus is capped', () => {
      const xp = calculateXp(true, 10)
      expect(xp).toBe(50 + 50) // 50 + max 50
    })

    test('loser gets no streak bonus', () => {
      const xp = calculateXp(false, 5)
      expect(xp).toBe(20) // No streak bonus
    })
  })

  describe('Level Calculation', () => {
    test('level 1 requires 100 XP', () => {
      expect(xpForLevel(1)).toBe(100)
    })

    test('XP requirements increase with level', () => {
      const level1 = xpForLevel(1)
      const level2 = xpForLevel(2)
      const level3 = xpForLevel(3)

      expect(level2).toBeGreaterThan(level1)
      expect(level3).toBeGreaterThan(level2)
    })

    test('0 XP is level 1', () => {
      expect(levelFromXp(0)).toBe(1)
    })

    test('99 XP is still level 1', () => {
      expect(levelFromXp(99)).toBe(1)
    })

    test('100 XP is level 2', () => {
      expect(levelFromXp(100)).toBe(2)
    })

    test('high XP gives high level', () => {
      expect(levelFromXp(10000)).toBeGreaterThan(5)
    })
  })
})

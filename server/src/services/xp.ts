import { UserModel } from '../models/user.js'

function computeLevelFromXp(xp: number) {
  return Math.max(1, Math.floor(Math.pow(xp / 100 + 1, 0.8)))
}

export async function awardXp(userId: string, amount: number, reason?: string) {
  if (!amount) return
  const user = await UserModel.findOneAndUpdate(
    { username: userId },
    { $inc: { xp: amount } },
    { new: true }
  )
  if (!user) return
  const expectedLevel = computeLevelFromXp(user.xp)
  if (expectedLevel !== user.level) {
    user.level = expectedLevel
    await user.save()
  }
}

export async function getProgression(userId: string) {
  const user = await UserModel.findOne({ username: userId }).lean()
  if (!user) return null
  const nextLevel = user.level + 1
  const currentThreshold = Math.pow(user.level, 1 / 0.8) * 100 - 100
  const nextThreshold = Math.pow(nextLevel, 1 / 0.8) * 100 - 100
  return {
    xp: user.xp,
    level: user.level,
    nextLevelAt: Math.ceil(nextThreshold),
    progressToNext: Math.max(0, user.xp - currentThreshold),
    xpForNext: Math.max(1, Math.ceil(nextThreshold - currentThreshold))
  }
}

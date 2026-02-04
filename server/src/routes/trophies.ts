import { Router, Request, Response } from 'express'
import { requireAuth, getAuthPayload } from '../middleware/auth'
import { UserModel, GameStats } from '../models/user'
import { UserTrophyModel, TROPHIES, TrophyDefinition, getTrophyById } from '../models/trophy'

const router = Router()

// Calcul du niveau basé sur l'XP
function calculateLevel(xp: number): number {
  // Formule: chaque niveau nécessite level * 100 XP
  // Niveau 1: 0-99, Niveau 2: 100-299, Niveau 3: 300-599, etc.
  let level = 1
  let xpRequired = 0
  while (xp >= xpRequired + level * 100) {
    xpRequired += level * 100
    level++
  }
  return level
}

// Calcul de la progression vers le prochain niveau
function calculateProgression(xp: number, level: number) {
  let xpForCurrentLevel = 0
  for (let i = 1; i < level; i++) {
    xpForCurrentLevel += i * 100
  }
  const xpForNextLevel = level * 100
  const progressInLevel = xp - xpForCurrentLevel
  return {
    xp,
    level,
    nextLevelAt: xpForCurrentLevel + xpForNextLevel,
    progressToNext: progressInLevel,
    xpForNext: xpForNextLevel
  }
}

// Vérifier et débloquer les trophées automatiquement
async function checkAndUnlockTrophies(userId: string): Promise<TrophyDefinition[]> {
  const user = await UserModel.findOne({ username: userId })
  if (!user) return []

  let userTrophies = await UserTrophyModel.findOne({ userId })
  if (!userTrophies) {
    userTrophies = await UserTrophyModel.create({ userId, trophies: [] })
  }

  const unlockedIds = new Set(userTrophies.trophies.map(t => t.trophyId))
  const newlyUnlocked: TrophyDefinition[] = []

  for (const trophy of TROPHIES) {
    if (unlockedIds.has(trophy.id)) continue

    let shouldUnlock = false
    const req = trophy.requirement

    switch (req.type) {
      case 'games_played':
        shouldUnlock = user.totalGamesPlayed >= req.value
        break
      case 'wins':
        if (req.gameId) {
          const gameStats = user.gameStats?.get(req.gameId)
          shouldUnlock = (gameStats?.wins ?? 0) >= req.value
        } else {
          shouldUnlock = user.stats.wins >= req.value
        }
        break
      case 'win_streak':
        shouldUnlock = user.bestWinStreak >= req.value
        break
      case 'level':
        shouldUnlock = user.level >= req.value
        break
      case 'friends':
        shouldUnlock = user.friends.length >= req.value
        break
      case 'uno_calls':
        const unoStats = user.gameStats?.get('uno')
        const noMercyStats = user.gameStats?.get('uno-no-mercy')
        const totalCalls = (unoStats?.unoCalls ?? 0) + (noMercyStats?.unoCalls ?? 0)
        shouldUnlock = totalCalls >= req.value
        break
      case 'cards_played':
        let totalCards = 0
        user.gameStats?.forEach(stats => {
          totalCards += stats.cardsPlayed
        })
        shouldUnlock = totalCards >= req.value
        break
      case 'special':
        // Les trophées spéciaux sont débloqués manuellement via des événements
        if (trophy.id === 'collector') {
          shouldUnlock = userTrophies.trophies.length >= 25
        } else if (trophy.id === 'completionist') {
          shouldUnlock = userTrophies.trophies.length >= TROPHIES.length - 1
        }
        break
    }

    if (shouldUnlock) {
      userTrophies.trophies.push({
        trophyId: trophy.id,
        unlockedAt: new Date(),
        notified: false
      })
      newlyUnlocked.push(trophy)
      
      // Ajouter l'XP du trophée
      user.xp += trophy.xpReward
    }
  }

  if (newlyUnlocked.length > 0) {
    user.level = calculateLevel(user.xp)
    await user.save()
    await userTrophies.save()
  }

  return newlyUnlocked
}

// GET /api/v1/trophies - Liste tous les trophées disponibles
router.get('/', (req: Request, res: Response) => {
  res.json({
    items: TROPHIES.map(t => ({
      ...t,
      totalCount: TROPHIES.length
    }))
  })
})

// GET /api/v1/trophies/me - Trophées de l'utilisateur connecté
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId
    
    // Vérifier les nouveaux trophées
    await checkAndUnlockTrophies(userId)
    
    const userTrophies = await UserTrophyModel.findOne({ userId })
    const unlockedIds = new Set(userTrophies?.trophies.map(t => t.trophyId) ?? [])
    
    const trophiesWithStatus = TROPHIES.map(trophy => {
      const userTrophy = userTrophies?.trophies.find(t => t.trophyId === trophy.id)
      return {
        ...trophy,
        unlocked: unlockedIds.has(trophy.id),
        unlockedAt: userTrophy?.unlockedAt ?? null
      }
    })

    res.json({
      items: trophiesWithStatus,
      unlockedCount: unlockedIds.size,
      totalCount: TROPHIES.length
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' })
  }
})

// GET /api/v1/trophies/user/:userId - Trophées d'un utilisateur
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    
    const userTrophies = await UserTrophyModel.findOne({ userId })
    const unlockedIds = new Set(userTrophies?.trophies.map(t => t.trophyId) ?? [])
    
    const trophiesWithStatus = TROPHIES.map(trophy => {
      const userTrophy = userTrophies?.trophies.find(t => t.trophyId === trophy.id)
      return {
        ...trophy,
        unlocked: unlockedIds.has(trophy.id),
        unlockedAt: userTrophy?.unlockedAt ?? null
      }
    })

    res.json({
      items: trophiesWithStatus,
      unlockedCount: unlockedIds.size,
      totalCount: TROPHIES.length
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' })
  }
})

// POST /api/v1/trophies/unlock/:trophyId - Débloquer un trophée spécial manuellement
router.post('/unlock/:trophyId', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId
    const { trophyId } = req.params
    
    const trophy = getTrophyById(trophyId)
    if (!trophy) {
      res.status(404).json({ error: 'Trophy not found' })
      return
    }

    let userTrophies = await UserTrophyModel.findOne({ userId })
    if (!userTrophies) {
      userTrophies = await UserTrophyModel.create({ userId, trophies: [] })
    }

    const alreadyUnlocked = userTrophies.trophies.some(t => t.trophyId === trophyId)
    if (alreadyUnlocked) {
      res.json({ ok: true, alreadyUnlocked: true, xpGained: 0 })
      return
    }

    userTrophies.trophies.push({
      trophyId,
      unlockedAt: new Date(),
      notified: false
    })
    await userTrophies.save()

    // Ajouter l'XP
    const user = await UserModel.findOne({ username: userId })
    if (user) {
      user.xp += trophy.xpReward
      user.level = calculateLevel(user.xp)
      await user.save()
    }

    res.json({
      ok: true,
      trophy,
      xpGained: trophy.xpReward,
      newXp: user?.xp ?? 0,
      newLevel: user?.level ?? 1
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' })
  }
})

// GET /api/v1/trophies/new - Récupérer les trophées non notifiés
router.get('/new', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId
    
    const userTrophies = await UserTrophyModel.findOne({ userId })
    if (!userTrophies) {
      res.json({ items: [] })
      return
    }

    const newTrophies = userTrophies.trophies
      .filter(t => !t.notified)
      .map(t => {
        const trophy = getTrophyById(t.trophyId)
        return trophy ? { ...trophy, unlockedAt: t.unlockedAt } : null
      })
      .filter(Boolean)

    // Marquer comme notifiés
    userTrophies.trophies.forEach(t => {
      t.notified = true
    })
    await userTrophies.save()

    res.json({ items: newTrophies })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' })
  }
})

// POST /api/v1/game/end - Terminer une partie et attribuer XP/stats
router.post('/game/end', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId
    const { 
      gameId, 
      sessionId, 
      isWinner, 
      cardsPlayed = 0, 
      unoCalls = 0,
      playerCount = 2
    } = req.body

    if (!gameId) {
      res.status(400).json({ error: 'gameId is required' })
      return
    }

    const user = await UserModel.findOne({ username: userId })
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    // Initialiser gameStats si nécessaire
    if (!user.gameStats) {
      user.gameStats = new Map()
    }

    let gameStats = user.gameStats.get(gameId)
    if (!gameStats) {
      gameStats = {
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        cardsPlayed: 0,
        unoCalls: 0
      }
    }

    // Mettre à jour les stats
    gameStats.gamesPlayed += 1
    gameStats.cardsPlayed += cardsPlayed
    gameStats.unoCalls += unoCalls
    gameStats.lastPlayedAt = new Date()

    if (isWinner) {
      gameStats.wins += 1
      user.stats.wins += 1
      user.currentWinStreak += 1
      if (user.currentWinStreak > user.bestWinStreak) {
        user.bestWinStreak = user.currentWinStreak
      }
    } else {
      gameStats.losses += 1
      user.stats.losses += 1
      user.currentWinStreak = 0
    }

    user.totalGamesPlayed += 1
    user.gameStats.set(gameId, gameStats)

    // Calculer le jeu préféré
    let maxGames = 0
    let favoriteGame = gameId
    user.gameStats.forEach((stats, gId) => {
      if (stats.gamesPlayed > maxGames) {
        maxGames = stats.gamesPlayed
        favoriteGame = gId
      }
    })
    user.favoriteGame = favoriteGame

    // XP gagné: base + bonus victoire + bonus joueurs
    let xpGained = 25 // Base XP pour avoir joué
    if (isWinner) {
      xpGained += 50 // Bonus victoire
      xpGained += (playerCount - 1) * 10 // Bonus par adversaire battu
    }

    user.xp += xpGained
    const oldLevel = user.level
    user.level = calculateLevel(user.xp)
    const leveledUp = user.level > oldLevel

    await user.save()

    // Vérifier les nouveaux trophées
    const newTrophies = await checkAndUnlockTrophies(userId)

    res.json({
      ok: true,
      xpGained,
      totalXp: user.xp,
      level: user.level,
      leveledUp,
      currentWinStreak: user.currentWinStreak,
      bestWinStreak: user.bestWinStreak,
      newTrophies: newTrophies.map(t => ({
        id: t.id,
        name: t.name,
        icon: t.icon,
        xpReward: t.xpReward
      })),
      progression: calculateProgression(user.xp, user.level)
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' })
  }
})

// GET /api/v1/trophies/stats/me - Statistiques détaillées de l'utilisateur
router.get('/stats/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.auth!.userId
    
    const user = await UserModel.findOne({ username: userId })
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    const gameStatsArray: Array<{ gameId: string } & GameStats> = []
    user.gameStats?.forEach((stats, gameId) => {
      gameStatsArray.push({ gameId, ...stats })
    })

    res.json({
      totalGamesPlayed: user.totalGamesPlayed,
      totalWins: user.stats.wins,
      totalLosses: user.stats.losses,
      winRate: user.stats.wins + user.stats.losses > 0 
        ? ((user.stats.wins / (user.stats.wins + user.stats.losses)) * 100).toFixed(1)
        : '0',
      currentWinStreak: user.currentWinStreak,
      bestWinStreak: user.bestWinStreak,
      favoriteGame: user.favoriteGame,
      xp: user.xp,
      level: user.level,
      gameStats: gameStatsArray,
      progression: calculateProgression(user.xp, user.level)
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' })
  }
})

// GET /api/v1/trophies/stats/user/:userId - Stats d'un autre utilisateur
router.get('/stats/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    
    const user = await UserModel.findOne({ username: userId })
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    const gameStatsArray: Array<{ gameId: string } & GameStats> = []
    user.gameStats?.forEach((stats, gameId) => {
      gameStatsArray.push({ gameId, ...stats })
    })

    res.json({
      totalGamesPlayed: user.totalGamesPlayed,
      totalWins: user.stats.wins,
      totalLosses: user.stats.losses,
      winRate: user.stats.wins + user.stats.losses > 0 
        ? ((user.stats.wins / (user.stats.wins + user.stats.losses)) * 100).toFixed(1)
        : '0',
      bestWinStreak: user.bestWinStreak,
      favoriteGame: user.favoriteGame,
      xp: user.xp,
      level: user.level,
      gameStats: gameStatsArray
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' })
  }
})

export default router
export { checkAndUnlockTrophies, calculateLevel, calculateProgression }

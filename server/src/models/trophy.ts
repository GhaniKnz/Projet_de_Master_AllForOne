import mongoose, { Schema, Document } from 'mongoose'

export interface TrophyDefinition {
  id: string
  name: string
  description: string
  icon: string
  category: 'general' | 'uno' | 'social' | 'achievement' | 'rare' | 'legendary'
  xpReward: number
  requirement: {
    type: 'wins' | 'games_played' | 'win_streak' | 'uno_calls' | 'cards_played' | 'friends' | 'level' | 'special'
    value: number
    gameId?: string
  }
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
}

export interface UserTrophy {
  trophyId: string
  unlockedAt: Date
  notified: boolean
}

export interface UserTrophyDocument extends Document {
  userId: string
  trophies: UserTrophy[]
  createdAt: Date
  updatedAt: Date
}

const UserTrophyEntrySchema = new Schema(
  {
    trophyId: { type: String, required: true },
    unlockedAt: { type: Date, default: Date.now },
    notified: { type: Boolean, default: false }
  },
  { _id: false }
)

const UserTrophySchema = new Schema<UserTrophyDocument>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    trophies: { type: [UserTrophyEntrySchema], default: [] }
  },
  { timestamps: true }
)

export const UserTrophyModel = mongoose.model<UserTrophyDocument>('UserTrophy', UserTrophySchema)

// Liste complète des 50 trophées
export const TROPHIES: TrophyDefinition[] = [
  // ===== GÉNÉRAL (10) =====
  {
    id: 'first_game',
    name: 'Premier Pas',
    description: 'Jouer votre première partie',
    icon: '🎮',
    category: 'general',
    xpReward: 50,
    requirement: { type: 'games_played', value: 1 },
    rarity: 'common'
  },
  {
    id: 'games_10',
    name: 'Joueur Assidu',
    description: 'Jouer 10 parties',
    icon: '🎯',
    category: 'general',
    xpReward: 100,
    requirement: { type: 'games_played', value: 10 },
    rarity: 'common'
  },
  {
    id: 'games_50',
    name: 'Vétéran',
    description: 'Jouer 50 parties',
    icon: '⭐',
    category: 'general',
    xpReward: 250,
    requirement: { type: 'games_played', value: 50 },
    rarity: 'uncommon'
  },
  {
    id: 'games_100',
    name: 'Centurion',
    description: 'Jouer 100 parties',
    icon: '💯',
    category: 'general',
    xpReward: 500,
    requirement: { type: 'games_played', value: 100 },
    rarity: 'rare'
  },
  {
    id: 'games_500',
    name: 'Légende Vivante',
    description: 'Jouer 500 parties',
    icon: '🏛️',
    category: 'general',
    xpReward: 1000,
    requirement: { type: 'games_played', value: 500 },
    rarity: 'epic'
  },
  {
    id: 'level_5',
    name: 'Apprenti',
    description: 'Atteindre le niveau 5',
    icon: '📚',
    category: 'general',
    xpReward: 100,
    requirement: { type: 'level', value: 5 },
    rarity: 'common'
  },
  {
    id: 'level_10',
    name: 'Compétent',
    description: 'Atteindre le niveau 10',
    icon: '🎓',
    category: 'general',
    xpReward: 200,
    requirement: { type: 'level', value: 10 },
    rarity: 'uncommon'
  },
  {
    id: 'level_25',
    name: 'Expert',
    description: 'Atteindre le niveau 25',
    icon: '🏆',
    category: 'general',
    xpReward: 500,
    requirement: { type: 'level', value: 25 },
    rarity: 'rare'
  },
  {
    id: 'level_50',
    name: 'Maître',
    description: 'Atteindre le niveau 50',
    icon: '👑',
    category: 'general',
    xpReward: 1000,
    requirement: { type: 'level', value: 50 },
    rarity: 'epic'
  },
  {
    id: 'level_100',
    name: 'Grand Maître',
    description: 'Atteindre le niveau 100',
    icon: '🌟',
    category: 'general',
    xpReward: 2000,
    requirement: { type: 'level', value: 100 },
    rarity: 'legendary'
  },

  // ===== VICTOIRES (10) =====
  {
    id: 'first_win',
    name: 'Première Victoire',
    description: 'Remporter votre première partie',
    icon: '🥇',
    category: 'achievement',
    xpReward: 75,
    requirement: { type: 'wins', value: 1 },
    rarity: 'common'
  },
  {
    id: 'wins_10',
    name: 'Gagnant en Série',
    description: 'Remporter 10 parties',
    icon: '🏅',
    category: 'achievement',
    xpReward: 150,
    requirement: { type: 'wins', value: 10 },
    rarity: 'common'
  },
  {
    id: 'wins_25',
    name: 'Champion Local',
    description: 'Remporter 25 parties',
    icon: '🎖️',
    category: 'achievement',
    xpReward: 300,
    requirement: { type: 'wins', value: 25 },
    rarity: 'uncommon'
  },
  {
    id: 'wins_50',
    name: 'Champion Régional',
    description: 'Remporter 50 parties',
    icon: '🏆',
    category: 'achievement',
    xpReward: 500,
    requirement: { type: 'wins', value: 50 },
    rarity: 'rare'
  },
  {
    id: 'wins_100',
    name: 'Champion National',
    description: 'Remporter 100 parties',
    icon: '🌍',
    category: 'achievement',
    xpReward: 750,
    requirement: { type: 'wins', value: 100 },
    rarity: 'epic'
  },
  {
    id: 'wins_250',
    name: 'Champion Mondial',
    description: 'Remporter 250 parties',
    icon: '🌏',
    category: 'achievement',
    xpReward: 1500,
    requirement: { type: 'wins', value: 250 },
    rarity: 'legendary'
  },
  {
    id: 'streak_3',
    name: 'Triplé',
    description: 'Gagner 3 parties d\'affilée',
    icon: '🔥',
    category: 'achievement',
    xpReward: 100,
    requirement: { type: 'win_streak', value: 3 },
    rarity: 'common'
  },
  {
    id: 'streak_5',
    name: 'Série de Feu',
    description: 'Gagner 5 parties d\'affilée',
    icon: '💥',
    category: 'achievement',
    xpReward: 200,
    requirement: { type: 'win_streak', value: 5 },
    rarity: 'uncommon'
  },
  {
    id: 'streak_10',
    name: 'Imbattable',
    description: 'Gagner 10 parties d\'affilée',
    icon: '⚡',
    category: 'achievement',
    xpReward: 500,
    requirement: { type: 'win_streak', value: 10 },
    rarity: 'rare'
  },
  {
    id: 'streak_20',
    name: 'Invincible',
    description: 'Gagner 20 parties d\'affilée',
    icon: '🌩️',
    category: 'achievement',
    xpReward: 1000,
    requirement: { type: 'win_streak', value: 20 },
    rarity: 'legendary'
  },

  // ===== UNO SPÉCIFIQUE (15) =====
  {
    id: 'uno_first_win',
    name: 'As du UNO',
    description: 'Gagner votre première partie de UNO',
    icon: '🃏',
    category: 'uno',
    xpReward: 75,
    requirement: { type: 'wins', value: 1, gameId: 'uno' },
    rarity: 'common'
  },
  {
    id: 'uno_wins_10',
    name: 'Joueur de UNO',
    description: 'Gagner 10 parties de UNO',
    icon: '🎴',
    category: 'uno',
    xpReward: 150,
    requirement: { type: 'wins', value: 10, gameId: 'uno' },
    rarity: 'common'
  },
  {
    id: 'uno_wins_50',
    name: 'Expert UNO',
    description: 'Gagner 50 parties de UNO',
    icon: '🂡',
    category: 'uno',
    xpReward: 400,
    requirement: { type: 'wins', value: 50, gameId: 'uno' },
    rarity: 'rare'
  },
  {
    id: 'uno_wins_100',
    name: 'Maître du UNO',
    description: 'Gagner 100 parties de UNO',
    icon: '👑',
    category: 'uno',
    xpReward: 800,
    requirement: { type: 'wins', value: 100, gameId: 'uno' },
    rarity: 'epic'
  },
  {
    id: 'uno_call_10',
    name: 'Crieur',
    description: 'Appeler UNO 10 fois',
    icon: '📢',
    category: 'uno',
    xpReward: 100,
    requirement: { type: 'uno_calls', value: 10 },
    rarity: 'common'
  },
  {
    id: 'uno_call_50',
    name: 'Voix de Stentor',
    description: 'Appeler UNO 50 fois',
    icon: '📣',
    category: 'uno',
    xpReward: 250,
    requirement: { type: 'uno_calls', value: 50 },
    rarity: 'uncommon'
  },
  {
    id: 'uno_call_100',
    name: 'Mégaphone Vivant',
    description: 'Appeler UNO 100 fois',
    icon: '🔊',
    category: 'uno',
    xpReward: 500,
    requirement: { type: 'uno_calls', value: 100 },
    rarity: 'rare'
  },
  {
    id: 'cards_played_100',
    name: 'Distributeur',
    description: 'Jouer 100 cartes',
    icon: '🎰',
    category: 'uno',
    xpReward: 100,
    requirement: { type: 'cards_played', value: 100 },
    rarity: 'common'
  },
  {
    id: 'cards_played_500',
    name: 'Croupier',
    description: 'Jouer 500 cartes',
    icon: '🎪',
    category: 'uno',
    xpReward: 250,
    requirement: { type: 'cards_played', value: 500 },
    rarity: 'uncommon'
  },
  {
    id: 'cards_played_1000',
    name: 'Maître des Cartes',
    description: 'Jouer 1000 cartes',
    icon: '🎭',
    category: 'uno',
    xpReward: 500,
    requirement: { type: 'cards_played', value: 1000 },
    rarity: 'rare'
  },
  {
    id: 'cards_played_5000',
    name: 'Archiviste des Cartes',
    description: 'Jouer 5000 cartes',
    icon: '📚',
    category: 'uno',
    xpReward: 1000,
    requirement: { type: 'cards_played', value: 5000 },
    rarity: 'epic'
  },
  {
    id: 'uno_no_mercy_win',
    name: 'Sans Pitié',
    description: 'Gagner une partie UNO No Mercy',
    icon: '😈',
    category: 'uno',
    xpReward: 150,
    requirement: { type: 'wins', value: 1, gameId: 'uno-no-mercy' },
    rarity: 'uncommon'
  },
  {
    id: 'uno_no_mercy_10',
    name: 'Tortionnaire',
    description: 'Gagner 10 parties UNO No Mercy',
    icon: '💀',
    category: 'uno',
    xpReward: 400,
    requirement: { type: 'wins', value: 10, gameId: 'uno-no-mercy' },
    rarity: 'rare'
  },
  {
    id: 'uno_comeback',
    name: 'Retour en Force',
    description: 'Gagner avec plus de 10 cartes en main à un moment',
    icon: '🔄',
    category: 'uno',
    xpReward: 200,
    requirement: { type: 'special', value: 1 },
    rarity: 'rare'
  },
  {
    id: 'uno_speed_win',
    name: 'Éclair',
    description: 'Gagner une partie en moins de 2 minutes',
    icon: '⚡',
    category: 'uno',
    xpReward: 300,
    requirement: { type: 'special', value: 1 },
    rarity: 'rare'
  },

  // ===== SOCIAL (10) =====
  {
    id: 'first_friend',
    name: 'Ami Fidèle',
    description: 'Ajouter votre premier ami',
    icon: '🤝',
    category: 'social',
    xpReward: 50,
    requirement: { type: 'friends', value: 1 },
    rarity: 'common'
  },
  {
    id: 'friends_5',
    name: 'Sociable',
    description: 'Avoir 5 amis',
    icon: '👥',
    category: 'social',
    xpReward: 100,
    requirement: { type: 'friends', value: 5 },
    rarity: 'common'
  },
  {
    id: 'friends_10',
    name: 'Populaire',
    description: 'Avoir 10 amis',
    icon: '🎉',
    category: 'social',
    xpReward: 200,
    requirement: { type: 'friends', value: 10 },
    rarity: 'uncommon'
  },
  {
    id: 'friends_25',
    name: 'Influenceur',
    description: 'Avoir 25 amis',
    icon: '🌟',
    category: 'social',
    xpReward: 400,
    requirement: { type: 'friends', value: 25 },
    rarity: 'rare'
  },
  {
    id: 'friends_50',
    name: 'Célébrité',
    description: 'Avoir 50 amis',
    icon: '💫',
    category: 'social',
    xpReward: 750,
    requirement: { type: 'friends', value: 50 },
    rarity: 'epic'
  },
  {
    id: 'friends_100',
    name: 'Star Mondiale',
    description: 'Avoir 100 amis',
    icon: '🌍',
    category: 'social',
    xpReward: 1500,
    requirement: { type: 'friends', value: 100 },
    rarity: 'legendary'
  },
  {
    id: 'play_with_friend',
    name: 'Entre Amis',
    description: 'Jouer une partie avec un ami',
    icon: '👫',
    category: 'social',
    xpReward: 75,
    requirement: { type: 'special', value: 1 },
    rarity: 'common'
  },
  {
    id: 'win_against_friend',
    name: 'Rivalité Amicale',
    description: 'Battre un ami',
    icon: '🎭',
    category: 'social',
    xpReward: 100,
    requirement: { type: 'special', value: 1 },
    rarity: 'common'
  },
  {
    id: 'group_game_4',
    name: 'Quatuor',
    description: 'Jouer une partie à 4 joueurs',
    icon: '4️⃣',
    category: 'social',
    xpReward: 100,
    requirement: { type: 'special', value: 1 },
    rarity: 'common'
  },
  {
    id: 'group_game_8',
    name: 'Grande Tablée',
    description: 'Jouer une partie à 8 joueurs',
    icon: '8️⃣',
    category: 'social',
    xpReward: 250,
    requirement: { type: 'special', value: 1 },
    rarity: 'rare'
  },

  // ===== RARES & LÉGENDAIRES (5) =====
  {
    id: 'perfect_game',
    name: 'Perfection',
    description: 'Gagner sans jamais piocher',
    icon: '💎',
    category: 'rare',
    xpReward: 500,
    requirement: { type: 'special', value: 1 },
    rarity: 'epic'
  },
  {
    id: 'comeback_king',
    name: 'Roi du Comeback',
    description: 'Gagner après avoir eu 15+ cartes',
    icon: '👑',
    category: 'rare',
    xpReward: 750,
    requirement: { type: 'special', value: 1 },
    rarity: 'epic'
  },
  {
    id: 'destroyer',
    name: 'Destructeur',
    description: 'Faire piocher 20 cartes à un adversaire en une partie',
    icon: '💥',
    category: 'rare',
    xpReward: 400,
    requirement: { type: 'special', value: 1 },
    rarity: 'rare'
  },
  {
    id: 'collector',
    name: 'Collectionneur',
    description: 'Débloquer 25 trophées',
    icon: '🏛️',
    category: 'legendary',
    xpReward: 1000,
    requirement: { type: 'special', value: 25 },
    rarity: 'epic'
  },
  {
    id: 'completionist',
    name: 'Complétionniste',
    description: 'Débloquer tous les trophées',
    icon: '🌈',
    category: 'legendary',
    xpReward: 5000,
    requirement: { type: 'special', value: 50 },
    rarity: 'legendary'
  }
]

export function getTrophyById(id: string): TrophyDefinition | undefined {
  return TROPHIES.find(t => t.id === id)
}

export function getTrophiesByCategory(category: TrophyDefinition['category']): TrophyDefinition[] {
  return TROPHIES.filter(t => t.category === category)
}

export function getTrophiesByRarity(rarity: TrophyDefinition['rarity']): TrophyDefinition[] {
  return TROPHIES.filter(t => t.rarity === rarity)
}

import React from 'react'
import { api, TrophyWithStatus, UserDetailedStats, isBackendConfigured } from '../lib/api'
import Card from './Card'

type TrophyCategory = 'all' | 'general' | 'uno' | 'social' | 'achievement' | 'rare' | 'legendary'

const CATEGORY_LABELS: Record<TrophyCategory, string> = {
  all: 'Tous',
  general: 'Général',
  uno: 'UNO',
  social: 'Social',
  achievement: 'Succès',
  rare: 'Rare',
  legendary: 'Légendaire'
}

const CATEGORY_ICONS: Record<TrophyCategory, string> = {
  all: '🎯',
  general: '⭐',
  uno: '🃏',
  social: '👥',
  achievement: '🏆',
  rare: '💎',
  legendary: '👑'
}

const RARITY_COLORS: Record<string, { bg: string; border: string; glow: string }> = {
  common: { bg: 'from-slate-100 to-slate-200', border: 'border-slate-300', glow: '' },
  uncommon: { bg: 'from-emerald-50 to-emerald-100', border: 'border-emerald-400', glow: 'shadow-emerald-200' },
  rare: { bg: 'from-blue-50 to-blue-100', border: 'border-blue-400', glow: 'shadow-blue-200' },
  epic: { bg: 'from-purple-50 to-purple-100', border: 'border-purple-400', glow: 'shadow-purple-200' },
  legendary: { bg: 'from-amber-50 via-yellow-100 to-orange-100', border: 'border-yellow-400', glow: 'shadow-yellow-300 shadow-lg' }
}

const RARITY_TEXT: Record<string, string> = {
  common: 'text-slate-500',
  uncommon: 'text-emerald-600',
  rare: 'text-blue-600',
  epic: 'text-purple-600',
  legendary: 'text-amber-600'
}

const RARITY_LABELS: Record<string, string> = {
  common: 'Commun',
  uncommon: 'Peu commun',
  rare: 'Rare',
  epic: 'Épique',
  legendary: 'Légendaire'
}

const RARITY_BADGE_BG: Record<string, string> = {
  common: 'bg-slate-100 text-slate-600',
  uncommon: 'bg-emerald-100 text-emerald-700',
  rare: 'bg-blue-100 text-blue-700',
  epic: 'bg-purple-100 text-purple-700',
  legendary: 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700'
}

// Trophées par défaut pour le mode offline
const DEFAULT_TROPHIES: TrophyWithStatus[] = [
  // GÉNÉRAL (10)
  { id: 'first_game', name: 'Premier Pas', description: 'Jouer votre première partie', icon: '🎮', category: 'general', xpReward: 50, rarity: 'common', unlocked: false, unlockedAt: null },
  { id: 'games_10', name: 'Joueur Assidu', description: 'Jouer 10 parties', icon: '🎯', category: 'general', xpReward: 100, rarity: 'common', unlocked: false, unlockedAt: null },
  { id: 'games_50', name: 'Vétéran', description: 'Jouer 50 parties', icon: '⭐', category: 'general', xpReward: 250, rarity: 'uncommon', unlocked: false, unlockedAt: null },
  { id: 'games_100', name: 'Centurion', description: 'Jouer 100 parties', icon: '💯', category: 'general', xpReward: 500, rarity: 'rare', unlocked: false, unlockedAt: null },
  { id: 'games_500', name: 'Légende Vivante', description: 'Jouer 500 parties', icon: '🏛️', category: 'general', xpReward: 1000, rarity: 'epic', unlocked: false, unlockedAt: null },
  { id: 'level_5', name: 'Apprenti', description: 'Atteindre le niveau 5', icon: '📚', category: 'general', xpReward: 100, rarity: 'common', unlocked: false, unlockedAt: null },
  { id: 'level_10', name: 'Compétent', description: 'Atteindre le niveau 10', icon: '🎓', category: 'general', xpReward: 200, rarity: 'uncommon', unlocked: false, unlockedAt: null },
  { id: 'level_25', name: 'Expert', description: 'Atteindre le niveau 25', icon: '🏆', category: 'general', xpReward: 500, rarity: 'rare', unlocked: false, unlockedAt: null },
  { id: 'level_50', name: 'Maître', description: 'Atteindre le niveau 50', icon: '👑', category: 'general', xpReward: 1000, rarity: 'epic', unlocked: false, unlockedAt: null },
  { id: 'level_100', name: 'Grand Maître', description: 'Atteindre le niveau 100', icon: '🌟', category: 'general', xpReward: 2000, rarity: 'legendary', unlocked: false, unlockedAt: null },
  
  // VICTOIRES (10)
  { id: 'first_win', name: 'Première Victoire', description: 'Remporter votre première partie', icon: '🥇', category: 'achievement', xpReward: 75, rarity: 'common', unlocked: false, unlockedAt: null },
  { id: 'wins_10', name: 'Gagnant en Série', description: 'Remporter 10 parties', icon: '🏅', category: 'achievement', xpReward: 150, rarity: 'common', unlocked: false, unlockedAt: null },
  { id: 'wins_25', name: 'Champion Local', description: 'Remporter 25 parties', icon: '🎖️', category: 'achievement', xpReward: 300, rarity: 'uncommon', unlocked: false, unlockedAt: null },
  { id: 'wins_50', name: 'Champion Régional', description: 'Remporter 50 parties', icon: '🏆', category: 'achievement', xpReward: 500, rarity: 'rare', unlocked: false, unlockedAt: null },
  { id: 'wins_100', name: 'Champion National', description: 'Remporter 100 parties', icon: '🌍', category: 'achievement', xpReward: 750, rarity: 'epic', unlocked: false, unlockedAt: null },
  { id: 'wins_250', name: 'Champion Mondial', description: 'Remporter 250 parties', icon: '🌏', category: 'achievement', xpReward: 1500, rarity: 'legendary', unlocked: false, unlockedAt: null },
  { id: 'streak_3', name: 'Triplé', description: 'Gagner 3 parties d\'affilée', icon: '🔥', category: 'achievement', xpReward: 100, rarity: 'common', unlocked: false, unlockedAt: null },
  { id: 'streak_5', name: 'Série de Feu', description: 'Gagner 5 parties d\'affilée', icon: '💥', category: 'achievement', xpReward: 200, rarity: 'uncommon', unlocked: false, unlockedAt: null },
  { id: 'streak_10', name: 'Imbattable', description: 'Gagner 10 parties d\'affilée', icon: '⚡', category: 'achievement', xpReward: 500, rarity: 'rare', unlocked: false, unlockedAt: null },
  { id: 'streak_20', name: 'Invincible', description: 'Gagner 20 parties d\'affilée', icon: '🌩️', category: 'achievement', xpReward: 1000, rarity: 'legendary', unlocked: false, unlockedAt: null },
  
  // UNO (15)
  { id: 'uno_first_win', name: 'As du UNO', description: 'Gagner votre première partie de UNO', icon: '🃏', category: 'uno', xpReward: 75, rarity: 'common', unlocked: false, unlockedAt: null },
  { id: 'uno_wins_10', name: 'Joueur de UNO', description: 'Gagner 10 parties de UNO', icon: '🎴', category: 'uno', xpReward: 150, rarity: 'common', unlocked: false, unlockedAt: null },
  { id: 'uno_wins_50', name: 'Expert UNO', description: 'Gagner 50 parties de UNO', icon: '🂡', category: 'uno', xpReward: 400, rarity: 'rare', unlocked: false, unlockedAt: null },
  { id: 'uno_wins_100', name: 'Maître du UNO', description: 'Gagner 100 parties de UNO', icon: '👑', category: 'uno', xpReward: 800, rarity: 'epic', unlocked: false, unlockedAt: null },
  { id: 'uno_call_10', name: 'Crieur', description: 'Appeler UNO 10 fois', icon: '📢', category: 'uno', xpReward: 100, rarity: 'common', unlocked: false, unlockedAt: null },
  { id: 'uno_call_50', name: 'Voix de Stentor', description: 'Appeler UNO 50 fois', icon: '📣', category: 'uno', xpReward: 250, rarity: 'uncommon', unlocked: false, unlockedAt: null },
  { id: 'uno_call_100', name: 'Mégaphone Vivant', description: 'Appeler UNO 100 fois', icon: '🔊', category: 'uno', xpReward: 500, rarity: 'rare', unlocked: false, unlockedAt: null },
  { id: 'cards_played_100', name: 'Distributeur', description: 'Jouer 100 cartes', icon: '🎰', category: 'uno', xpReward: 100, rarity: 'common', unlocked: false, unlockedAt: null },
  { id: 'cards_played_500', name: 'Croupier', description: 'Jouer 500 cartes', icon: '🎪', category: 'uno', xpReward: 250, rarity: 'uncommon', unlocked: false, unlockedAt: null },
  { id: 'cards_played_1000', name: 'Maître des Cartes', description: 'Jouer 1000 cartes', icon: '🎭', category: 'uno', xpReward: 500, rarity: 'rare', unlocked: false, unlockedAt: null },
  { id: 'cards_played_5000', name: 'Archiviste des Cartes', description: 'Jouer 5000 cartes', icon: '📚', category: 'uno', xpReward: 1000, rarity: 'epic', unlocked: false, unlockedAt: null },
  { id: 'uno_no_mercy_win', name: 'Sans Pitié', description: 'Gagner une partie UNO No Mercy', icon: '😈', category: 'uno', xpReward: 150, rarity: 'uncommon', unlocked: false, unlockedAt: null },
  { id: 'uno_no_mercy_10', name: 'Tortionnaire', description: 'Gagner 10 parties UNO No Mercy', icon: '💀', category: 'uno', xpReward: 400, rarity: 'rare', unlocked: false, unlockedAt: null },
  { id: 'uno_comeback', name: 'Retour en Force', description: 'Gagner avec plus de 10 cartes en main à un moment', icon: '🔄', category: 'uno', xpReward: 200, rarity: 'rare', unlocked: false, unlockedAt: null },
  { id: 'uno_speed_win', name: 'Éclair', description: 'Gagner une partie en moins de 2 minutes', icon: '⚡', category: 'uno', xpReward: 300, rarity: 'rare', unlocked: false, unlockedAt: null },
  
  // SOCIAL (10)
  { id: 'first_friend', name: 'Ami Fidèle', description: 'Ajouter votre premier ami', icon: '🤝', category: 'social', xpReward: 50, rarity: 'common', unlocked: false, unlockedAt: null },
  { id: 'friends_5', name: 'Sociable', description: 'Avoir 5 amis', icon: '👥', category: 'social', xpReward: 100, rarity: 'common', unlocked: false, unlockedAt: null },
  { id: 'friends_10', name: 'Populaire', description: 'Avoir 10 amis', icon: '🎉', category: 'social', xpReward: 200, rarity: 'uncommon', unlocked: false, unlockedAt: null },
  { id: 'friends_25', name: 'Influenceur', description: 'Avoir 25 amis', icon: '🌟', category: 'social', xpReward: 400, rarity: 'rare', unlocked: false, unlockedAt: null },
  { id: 'friends_50', name: 'Célébrité', description: 'Avoir 50 amis', icon: '💫', category: 'social', xpReward: 750, rarity: 'epic', unlocked: false, unlockedAt: null },
  { id: 'friends_100', name: 'Star Mondiale', description: 'Avoir 100 amis', icon: '🌍', category: 'social', xpReward: 1500, rarity: 'legendary', unlocked: false, unlockedAt: null },
  { id: 'play_with_friend', name: 'Entre Amis', description: 'Jouer une partie avec un ami', icon: '👫', category: 'social', xpReward: 75, rarity: 'common', unlocked: false, unlockedAt: null },
  { id: 'win_against_friend', name: 'Rivalité Amicale', description: 'Battre un ami', icon: '🎭', category: 'social', xpReward: 100, rarity: 'common', unlocked: false, unlockedAt: null },
  { id: 'group_game_4', name: 'Quatuor', description: 'Jouer une partie à 4 joueurs', icon: '4️⃣', category: 'social', xpReward: 100, rarity: 'common', unlocked: false, unlockedAt: null },
  { id: 'group_game_8', name: 'Grande Tablée', description: 'Jouer une partie à 8 joueurs', icon: '8️⃣', category: 'social', xpReward: 250, rarity: 'rare', unlocked: false, unlockedAt: null },
  
  // RARE & LÉGENDAIRES (5)
  { id: 'perfect_game', name: 'Perfection', description: 'Gagner sans jamais piocher', icon: '💎', category: 'rare', xpReward: 500, rarity: 'epic', unlocked: false, unlockedAt: null },
  { id: 'comeback_king', name: 'Roi du Comeback', description: 'Gagner après avoir eu 15+ cartes', icon: '👑', category: 'rare', xpReward: 750, rarity: 'epic', unlocked: false, unlockedAt: null },
  { id: 'destroyer', name: 'Destructeur', description: 'Faire piocher 20 cartes à un adversaire en une partie', icon: '💥', category: 'rare', xpReward: 400, rarity: 'rare', unlocked: false, unlockedAt: null },
  { id: 'collector', name: 'Collectionneur', description: 'Débloquer 25 trophées', icon: '🏛️', category: 'legendary', xpReward: 1000, rarity: 'epic', unlocked: false, unlockedAt: null },
  { id: 'completionist', name: 'Complétionniste', description: 'Débloquer tous les trophées', icon: '🌈', category: 'legendary', xpReward: 5000, rarity: 'legendary', unlocked: false, unlockedAt: null },
]

type TrophiesProps = {
  userId?: string
  showStats?: boolean
}

export default function Trophies({ userId, showStats = true }: TrophiesProps) {
  const [trophies, setTrophies] = React.useState<TrophyWithStatus[]>(DEFAULT_TROPHIES)
  const [stats, setStats] = React.useState<UserDetailedStats | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [category, setCategory] = React.useState<TrophyCategory>('all')
  const [unlockedCount, setUnlockedCount] = React.useState(0)
  const [selectedTrophy, setSelectedTrophy] = React.useState<TrophyWithStatus | null>(null)

  React.useEffect(() => {
    const loadData = async () => {
      if (!isBackendConfigured()) {
        // Mode offline - utiliser les trophées par défaut
        setTrophies(DEFAULT_TROPHIES)
        setUnlockedCount(0)
        setLoading(false)
        return
      }

      try {
        const [trophiesData, statsData] = await Promise.all([
          userId ? api.getUserTrophies(userId) : api.getMyTrophies(),
          userId ? api.getUserStats(userId) : api.getMyStats()
        ])
        setTrophies(trophiesData.items)
        setUnlockedCount(trophiesData.unlockedCount)
        setStats(statsData)
      } catch (err) {
        console.error('Failed to load trophies:', err)
        // En cas d'erreur, utiliser les trophées par défaut
        setTrophies(DEFAULT_TROPHIES)
        setUnlockedCount(0)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [userId])

  const filteredTrophies = React.useMemo(() => {
    if (category === 'all') return trophies
    return trophies.filter(t => t.category === category)
  }, [trophies, category])

  const unlockedTrophies = filteredTrophies.filter(t => t.unlocked)
  const lockedTrophies = filteredTrophies.filter(t => !t.unlocked)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-10 w-10 animate-spin rounded-full border-3 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header avec stats rapides */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-txt">Mes Trophées</h2>
          <p className="text-sm text-muted">{unlockedCount} sur {trophies.length} débloqués</p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-100 to-yellow-100 px-4 py-2">
          <span className="text-2xl">🏆</span>
          <span className="text-lg font-bold text-amber-700">{unlockedCount}</span>
        </div>
      </div>

      {/* Barre de progression globale */}
      <div className="relative">
        <div className="h-4 w-full overflow-hidden rounded-full bg-gray-100">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 transition-all duration-700 ease-out"
            style={{ width: `${(unlockedCount / trophies.length) * 100}%` }}
          />
        </div>
        <p className="mt-2 text-center text-sm font-medium text-muted">
          {Math.round((unlockedCount / trophies.length) * 100)}% de la collection
        </p>
      </div>

      {/* Statistiques rapides */}
      {showStats && stats && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-blue-600">Parties</p>
            <p className="text-2xl font-bold text-blue-700">{stats.totalGamesPlayed}</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-green-50 to-green-100 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-green-600">Victoires</p>
            <p className="text-2xl font-bold text-green-700">{stats.totalWins}</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-orange-600">Meilleure série</p>
            <p className="text-2xl font-bold text-orange-700">{stats.bestWinStreak} 🔥</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-purple-600">Niveau</p>
            <p className="text-2xl font-bold text-purple-700">{stats.level}</p>
          </div>
        </div>
      )}

      {/* Filtres par catégorie - chips horizontaux scrollables */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
        {(Object.keys(CATEGORY_LABELS) as TrophyCategory[]).map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`flex-shrink-0 flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium transition-all active:scale-95 ${
              category === cat
                ? 'bg-primary text-white shadow-lg shadow-primary/25'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-primary/30'
            }`}
          >
            <span>{CATEGORY_ICONS[cat]}</span>
            <span>{CATEGORY_LABELS[cat]}</span>
          </button>
        ))}
      </div>

      {/* Grille de trophées */}
      <div className="space-y-6">
        {/* Trophées débloqués */}
        {unlockedTrophies.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">✨</span>
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary">
                Débloqués ({unlockedTrophies.length})
              </h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {unlockedTrophies.map((trophy) => (
                <TrophyCard 
                  key={trophy.id} 
                  trophy={trophy} 
                  onClick={() => setSelectedTrophy(trophy)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Trophées verrouillés */}
        {lockedTrophies.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔒</span>
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted">
                À débloquer ({lockedTrophies.length})
              </h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {lockedTrophies.map((trophy) => (
                <TrophyCard 
                  key={trophy.id} 
                  trophy={trophy} 
                  onClick={() => setSelectedTrophy(trophy)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal de détail du trophée */}
      {selectedTrophy && (
        <TrophyDetailModal 
          trophy={selectedTrophy} 
          onClose={() => setSelectedTrophy(null)} 
        />
      )}
    </div>
  )
}

function TrophyCard({ trophy, onClick }: { trophy: TrophyWithStatus; onClick: () => void }) {
  const isUnlocked = trophy.unlocked
  const rarity = RARITY_COLORS[trophy.rarity] || RARITY_COLORS.common

  return (
    <button
      onClick={onClick}
      className={`relative aspect-square overflow-hidden rounded-2xl border-2 bg-gradient-to-br p-3 transition-all active:scale-95 ${
        isUnlocked 
          ? `${rarity.bg} ${rarity.border} ${rarity.glow}` 
          : 'border-gray-200 from-gray-50 to-gray-100'
      }`}
    >
      {/* Icône du trophée */}
      <div className={`flex h-full flex-col items-center justify-center ${!isUnlocked ? 'opacity-30 grayscale' : ''}`}>
        <span className="text-4xl drop-shadow-sm">{trophy.icon}</span>
      </div>

      {/* Badge XP */}
      {isUnlocked && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-primary shadow-sm">
          +{trophy.xpReward} XP
        </div>
      )}

      {/* Indicateur de rareté (petit point coloré) */}
      <div className={`absolute right-2 top-2 h-2 w-2 rounded-full ${
        isUnlocked ? {
          common: 'bg-slate-400',
          uncommon: 'bg-emerald-500',
          rare: 'bg-blue-500',
          epic: 'bg-purple-500',
          legendary: 'bg-amber-500 animate-pulse'
        }[trophy.rarity] : 'bg-gray-300'
      }`} />

      {/* Icône de verrouillage */}
      {!isUnlocked && (
        <div className="absolute bottom-2 right-2 text-base text-gray-300">
          🔒
        </div>
      )}
    </button>
  )
}

function TrophyDetailModal({ trophy, onClose }: { trophy: TrophyWithStatus; onClose: () => void }) {
  const isUnlocked = trophy.unlocked
  const rarity = RARITY_COLORS[trophy.rarity] || RARITY_COLORS.common
  const rarityText = RARITY_TEXT[trophy.rarity] || RARITY_TEXT.common

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg animate-slide-up rounded-t-3xl bg-white p-6 pb-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="mx-auto mb-6 h-1 w-12 rounded-full bg-gray-300" />

        {/* Contenu */}
        <div className="flex flex-col items-center text-center">
          {/* Icône grande */}
          <div className={`relative mb-4 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br ${rarity.bg} ${rarity.border} border-2 ${rarity.glow}`}>
            <span className={`text-5xl ${!isUnlocked ? 'grayscale opacity-50' : ''}`}>
              {trophy.icon}
            </span>
            {!isUnlocked && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl">🔒</span>
              </div>
            )}
          </div>

          {/* Badge rareté */}
          <span className={`mb-3 rounded-full px-3 py-1 text-xs font-bold uppercase ${RARITY_BADGE_BG[trophy.rarity]}`}>
            {RARITY_LABELS[trophy.rarity]}
          </span>

          {/* Nom */}
          <h3 className={`text-xl font-bold ${isUnlocked ? 'text-txt' : 'text-gray-400'}`}>
            {trophy.name}
          </h3>

          {/* Description */}
          <p className={`mt-2 text-sm ${isUnlocked ? 'text-muted' : 'text-gray-400'}`}>
            {trophy.description}
          </p>

          {/* XP Reward */}
          <div className={`mt-4 flex items-center gap-2 rounded-full px-4 py-2 ${
            isUnlocked ? 'bg-primary/10' : 'bg-gray-100'
          }`}>
            <span className="text-lg">⭐</span>
            <span className={`font-bold ${isUnlocked ? 'text-primary' : 'text-gray-400'}`}>
              +{trophy.xpReward} XP
            </span>
          </div>

          {/* Date de déblocage */}
          {isUnlocked && trophy.unlockedAt && (
            <p className="mt-4 text-xs text-muted">
              Débloqué le {new Date(trophy.unlockedAt).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </p>
          )}

          {/* Bouton fermer */}
          <button
            onClick={onClose}
            className="mt-6 w-full rounded-2xl bg-gray-100 py-3 font-semibold text-gray-700 transition active:scale-98 hover:bg-gray-200"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}

// Export du composant TrophyCard pour une utilisation ailleurs si nécessaire
export { TrophyCard }

import { SessionPlayer } from '../store/games'
import { User } from '../store/app'
import { nanoid } from './nanoid'

export function buildSessionPlayer(user: User | null, overrides: Partial<SessionPlayer> = {}): SessionPlayer {
  if (user) {
    return {
      id: overrides.id ?? `user-${user.name.toLowerCase().replace(/\s+/g, '-')}`,
      name: overrides.name ?? user.name,
      avatar: overrides.avatar ?? (user.avatar || user.name.slice(0, 2).toUpperCase()),
      isHost: overrides.isHost ?? false,
      status: overrides.status ?? 'waiting',
      rating: overrides.rating ?? 1200,
      isBot: overrides.isBot
    }
  }

  const guestId = overrides.id ?? `guest-${nanoid(6)}`
  return {
    id: guestId,
    name: overrides.name ?? 'Invite',
    avatar: overrides.avatar ?? 'IN',
    isHost: overrides.isHost ?? false,
    status: overrides.status ?? 'waiting',
    rating: overrides.rating,
    isBot: overrides.isBot
  }
}

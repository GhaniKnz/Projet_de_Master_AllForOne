import { create } from 'zustand'

export type User = {
  id: string
  email: string
  displayName: string
  handle: string
  avatarUrl?: string
  bannerUrl?: string
  role: 'user' | 'admin'
  xp: number
  level: number
  stats: { wins: number; losses: number }
  friends: string[]
}

export type Room = { id: string; members: Array<{ id: string; name: string; avatar: string }> }

export type Preferences = {
  darkMode: boolean
  notifications: boolean
  compactFeed: boolean
  language: 'fr' | 'en'
}

type AppState = {
  user: User | null
  room: Room | null
  ui: { sheetOpen: boolean; launcherOpen: boolean }
  preferences: Preferences
  setUser: (user: User | null) => void
  enterAsGuest: (name: string) => void
  toggleSheet: () => void
  openLauncher: () => void
  closeLauncher: () => void
  setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void
  logout: () => void
}

const PREFERENCES_STORAGE_KEY = 'afo_preferences'

const defaultPreferences: Preferences = {
  darkMode: false,
  notifications: true,
  compactFeed: false,
  language: 'fr'
}

function loadPreferences(): Preferences {
  try {
    const stored = localStorage.getItem(PREFERENCES_STORAGE_KEY)
    if (!stored) return defaultPreferences
    const parsed = JSON.parse(stored)
    return { ...defaultPreferences, ...parsed }
  } catch {
    return defaultPreferences
  }
}

function persistPreferences(preferences: Preferences) {
  try {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences))
  } catch {
    // ignore
  }
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  room: null,
  ui: { sheetOpen: false, launcherOpen: false },
  preferences: loadPreferences(),
  setUser: (user) => set({ user }),
  enterAsGuest: (name: string) =>
    set(() => ({
      user: {
        id: `guest-${name.toLowerCase()}`,
        email: '',
        displayName: name,
        handle: `@${name.toLowerCase()}`,
        avatarUrl: undefined,
        bannerUrl: undefined,
        role: 'user',
        xp: 0,
        level: 1,
        stats: { wins: 0, losses: 0 },
        friends: []
      }
    })),
  toggleSheet: () => set((state) => ({ ui: { ...state.ui, sheetOpen: !state.ui.sheetOpen } })),
  openLauncher: () => set((state) => ({ ui: { ...state.ui, launcherOpen: true } })),
  closeLauncher: () => set((state) => ({ ui: { ...state.ui, launcherOpen: false } })),
  setPreference: (key, value) =>
    set((state) => {
      const next = { ...state.preferences, [key]: value }
      persistPreferences(next)
      return { preferences: next }
    }),
  logout: () =>
    set(() => ({
      user: null,
      room: null
    }))
}))

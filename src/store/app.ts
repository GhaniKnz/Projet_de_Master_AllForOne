import { create } from 'zustand'

export type User = { name: string; avatar: string; xp: number; level: number }
export type Room = { id: string; members: Array<{ id: string; name: string; avatar: string }> }

type AppState = {
  user: User | null
  room: Room | null
  ui: { sheetOpen: boolean; launcherOpen: boolean }
  enterAsGuest: (name: string) => void
  toggleSheet: () => void
  openLauncher: () => void
  closeLauncher: () => void
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  room: null,
  ui: { sheetOpen: false, launcherOpen: false },
  enterAsGuest: (name: string) =>
    set(() => ({
      user: { name, avatar: name.slice(0, 1).toUpperCase(), xp: 0, level: 1 }
    })),
  toggleSheet: () => set((s) => ({ ui: { ...s.ui, sheetOpen: !s.ui.sheetOpen } })),
  openLauncher: () => set((s) => ({ ui: { ...s.ui, launcherOpen: true } })),
  closeLauncher: () => set((s) => ({ ui: { ...s.ui, launcherOpen: false } }))
}))

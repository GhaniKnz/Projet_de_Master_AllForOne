import { create } from 'zustand'

type UIState = {
  launcherOpen: boolean
  openLauncher: () => void
  closeLauncher: () => void
  toggleLauncher: () => void
}

export const useUIStore = create<UIState>((set) => ({
  launcherOpen: false,
  openLauncher: () => set({ launcherOpen: true }),
  closeLauncher: () => set({ launcherOpen: false }),
  toggleLauncher: () => set((s) => ({ launcherOpen: !s.launcherOpen }))
}))

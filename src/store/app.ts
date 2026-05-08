import { create } from 'zustand'
import type { PlatformConnection, ContentJob } from '@/types/database'

interface AppState {
  connections: PlatformConnection[]
  activeJobs: ContentJob[]
  sidebarCollapsed: boolean
  setConnections: (c: PlatformConnection[]) => void
  setActiveJobs: (j: ContentJob[]) => void
  setSidebarCollapsed: (v: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  connections: [],
  activeJobs: [],
  sidebarCollapsed: false,
  setConnections: (connections) => set({ connections }),
  setActiveJobs: (activeJobs) => set({ activeJobs }),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
}))

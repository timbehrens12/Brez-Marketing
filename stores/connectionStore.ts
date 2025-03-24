import { create } from 'zustand'
import type { PlatformConnection } from '@/types/platformConnection'

interface ConnectionStore {
  connections: PlatformConnection[]
  setConnections: (connections: PlatformConnection[]) => void
}

export const useConnectionStore = create<ConnectionStore>((set) => ({
  connections: [],
  setConnections: (connections) => set({ connections })
})) 
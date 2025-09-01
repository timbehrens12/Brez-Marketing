import { create } from 'zustand'

interface BrandStore {
  selectedBrandId: string | null
  setSelectedBrandId: (id: string | null) => void
}

export const useBrandStore = create<BrandStore>((set) => ({
  selectedBrandId: null,
  setSelectedBrandId: (id) => set({ selectedBrandId: id })
})) 
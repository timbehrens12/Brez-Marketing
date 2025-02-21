"use client"

import { createContext, useContext, useState } from 'react'

type BrandContextType = {
  selectedBrandId: string | null
  setSelectedBrandId: (id: string | null) => void
}

const BrandContext = createContext<BrandContextType>({
  selectedBrandId: null,
  setSelectedBrandId: () => {}
})

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null)

  return (
    <BrandContext.Provider value={{ selectedBrandId, setSelectedBrandId }}>
      {children}
    </BrandContext.Provider>
  )
}

export const useBrandContext = () => useContext(BrandContext)

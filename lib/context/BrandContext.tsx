"use client"

import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Brand {
  id: string
  name: string
}

interface BrandContextType {
  selectedBrandId: string | null
  setSelectedBrandId: (id: string | null) => void
  brands: Brand[]
  refreshBrands: () => Promise<void>
}

const BrandContext = createContext<BrandContextType>({
  selectedBrandId: null,
  setSelectedBrandId: () => {},
  brands: [],
  refreshBrands: async () => {}
})

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null)
  const [brands, setBrands] = useState<Brand[]>([])

  const loadBrands = async () => {
    const { data: brandsData, error } = await supabase
      .from('brands')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error loading brands:', error)
      return
    }
    
    setBrands(brandsData || [])
  }

  useEffect(() => {
    loadBrands()
  }, [])

  return (
    <BrandContext.Provider value={{ 
      selectedBrandId, 
      setSelectedBrandId,
      brands,
      refreshBrands: loadBrands
    }}>
      {children}
    </BrandContext.Provider>
  )
}

export const useBrandContext = () => useContext(BrandContext)

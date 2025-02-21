"use client"

import { createContext, useContext, useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const BrandContext = createContext<{
  selectedBrandId: string | null
  setSelectedBrandId: (id: string) => void
}>({
  selectedBrandId: null,
  setSelectedBrandId: () => {}
})

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    // Load initial brand
    const loadInitialBrand = async () => {
      console.log('Loading initial brand...')
      const { data: brands, error } = await supabase
        .from('brands')
        .select('*')
        .limit(1)
      
      if (error) {
        console.error('Error loading brands:', error)
        return
      }
      
      console.log('Loaded brands:', brands)
      if (brands && brands.length > 0) {
        console.log('Setting initial brand:', brands[0].id)
        setSelectedBrandId(brands[0].id)
      }
    }

    loadInitialBrand()
  }, [supabase])

  return (
    <BrandContext.Provider value={{ selectedBrandId, setSelectedBrandId }}>
      {children}
    </BrandContext.Provider>
  )
}

export const useBrandContext = () => useContext(BrandContext)

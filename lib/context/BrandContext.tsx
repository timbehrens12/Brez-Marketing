"use client"

import { createContext, useContext, useState, useEffect } from 'react'
import { useUser } from "@clerk/nextjs"
import { supabase } from '@/lib/supabaseClient'

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
  const { user } = useUser()
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null)
  const [brands, setBrands] = useState<Brand[]>([])

  const loadBrands = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('user_id', user.id)
        .order('name')

      if (error) throw error
      setBrands(data || [])
    } catch (error) {
      console.error('Error loading brands:', error)
    }
  }

  useEffect(() => {
    loadBrands()
  }, [user])

  const refreshBrands = () => loadBrands()

  return (
    <BrandContext.Provider value={{ 
      selectedBrandId, 
      setSelectedBrandId,
      brands,
      refreshBrands
    }}>
      {children}
    </BrandContext.Provider>
  )
}

export const useBrandContext = () => useContext(BrandContext)

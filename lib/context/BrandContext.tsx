"use client"

import { createContext, useContext, useState, useEffect } from 'react'
import { useUser } from "@clerk/nextjs"
import { supabase } from '@/lib/supabaseClient'

export interface Brand {
  id: string
  name: string
  image_url?: string
}

interface BrandContextType {
  brands: Brand[]
  selectedBrandId: string | null
  setSelectedBrandId: (id: string | null) => void
  refreshBrands: () => Promise<void>
}

const BrandContext = createContext<BrandContextType | undefined>(undefined)

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

export function useBrandContext() {
  const context = useContext(BrandContext)
  if (!context) throw new Error('useBrandContext must be used within BrandProvider')
  return context
}

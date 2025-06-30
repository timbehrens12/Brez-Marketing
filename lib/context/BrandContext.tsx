"use client"

import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { useAuth } from "@clerk/nextjs"
import { getSupabaseClient } from '@/lib/supabase/client'

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
  selectedBrand: Brand | null
  isLoading: boolean
}

const BrandContext = createContext<BrandContextType | undefined>(undefined)

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const { userId, isLoaded } = useAuth()
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null)
  const [brands, setBrands] = useState<Brand[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false;

    const handleLoadBrands = async () => {
      if (!isLoaded || cancelled) {
        return;
      }

      if (!userId) {
        console.log('No user ID, skipping brand load');
        if (!cancelled) {
          setIsLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setIsLoading(true);
      }

      try {
        console.log('Loading brands for user:', userId);
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('brands')
          .select('*')
          .eq('user_id', userId)
          .order('name');

        if (cancelled) return;

        if (error) {
          console.error('Error loading brands:', error);
          throw error;
        }

        console.log('Loaded brands:', data);
        setBrands((data as unknown as Brand[]) || []);
      } catch (error) {
        if (!cancelled) {
          console.error('Error in loadBrands:', error);
          setBrands([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    if (isLoaded) {
      handleLoadBrands();
    }

    return () => {
      cancelled = true;
    };
  }, [userId, isLoaded])

  const refreshBrands = async () => {
    if (!isLoaded) {
      console.log('Auth not loaded yet, waiting...')
      return
    }

    if (!userId) {
      console.log('No user ID, skipping brand load')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      console.log('Loading brands for user:', userId)
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('user_id', userId)
        .order('name')

      if (error) {
        console.error('Error loading brands:', error)
        throw error
      }

      console.log('Loaded brands:', data)
      setBrands((data as unknown as Brand[]) || [])
    } catch (error) {
      console.error('Error in loadBrands:', error)
      setBrands([])
    } finally {
      setIsLoading(false)
    }
  }

  const selectedBrand = brands.find(brand => brand.id === selectedBrandId) || null

  const contextValue = useMemo(() => ({
    selectedBrandId, 
    setSelectedBrandId,
    brands,
    refreshBrands,
    selectedBrand,
    isLoading
  }), [selectedBrandId, brands, selectedBrand, isLoading])

  return (
    <BrandContext.Provider value={contextValue}>
      {children}
    </BrandContext.Provider>
  )
}

export function useBrandContext() {
  const context = useContext(BrandContext)
  if (!context) throw new Error('useBrandContext must be used within BrandProvider')
  return context
}

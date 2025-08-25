"use client"

import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { useAuth } from "@clerk/nextjs"
import { getSupabaseClient } from '@/lib/supabase/client'

export interface Brand {
  id: string
  name: string
  image_url?: string
  niche?: string
  user_id?: string // Owner of the brand
  is_critical?: boolean
  agency_info?: {
    name: string
    logo_url?: string
    owner_id: string
  }
  shared_access?: {
    role: 'admin' | 'media_buyer' | 'viewer'
    granted_at: string
    can_manage_platforms: boolean
    can_generate_reports?: boolean
  }
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

  // Auto-restore brand selection from sessionStorage (persists during navigation, clears on refresh)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('selectedBrandId')
      
      if (saved) {
        setSelectedBrandId(saved)
        // console.log('[BrandContext] Restored brand selection from session:', saved)
      } else {
        // console.log('[BrandContext] No brand selection in session - user must select brand manually')
      }
    }
  }, [])

  // Custom setter that saves to sessionStorage (persists during navigation, clears on refresh)
  const setSelectedBrandIdWithPersistence = (id: string | null) => {
    setSelectedBrandId(id)
    if (typeof window !== 'undefined') {
      if (id) {
        sessionStorage.setItem('selectedBrandId', id)
        // console.log('[BrandContext] Saved brand selection to session:', id)
      } else {
        sessionStorage.removeItem('selectedBrandId')
        // console.log('[BrandContext] Cleared brand selection from session')
      }
    }
  }

  // Function to refresh brands (can be called externally)
  const refreshBrands = async () => {
    if (!isLoaded || !userId) return

    setIsLoading(true)
    try {
      const supabase = getSupabaseClient()
      
      // Load owned brands
      const { data: ownedBrands, error: ownedError } = await supabase
        .from('brands')
        .select('*')
        .eq('user_id', userId)
        .order('name')

      if (ownedError) {
        console.error('Error loading owned brands:', ownedError)
        throw ownedError
      }

      // Load shared brands access records
      const { data: sharedAccess, error: sharedError } = await supabase
        .from('brand_access')
        .select('brand_id, role, granted_at, can_manage_platforms, can_generate_reports')
        .eq('user_id', userId)
        .is('revoked_at', null)
        .order('granted_at')

      if (sharedError) {
        console.error('Error loading shared brands access:', sharedError)
        throw sharedError
      }

              // If we have shared access, get the brand details with agency info
      let sharedBrands: Brand[] = []
      if (sharedAccess && sharedAccess.length > 0) {
        const sharedBrandIds = sharedAccess.map(access => access.brand_id)
        
        const { data: sharedBrandDetails, error: sharedBrandError } = await supabase
          .from('brands')
          .select('*')
          .in('id', sharedBrandIds)

        if (sharedBrandError) {
          console.error('Error loading shared brand details:', sharedBrandError)
        } else {
                      // Get agency info for shared brands
            const agencyOwnerIds = [...new Set((sharedBrandDetails || []).map(brand => brand.user_id))]
            const { data: agencyInfo, error: agencyError } = await supabase
              .from('agency_settings')
              .select('user_id, agency_name, agency_logo_url')
              .in('user_id', agencyOwnerIds)

            if (agencyError) {
              console.error('Error loading agency info:', agencyError)
            }

                      // Combine access info with brand details and agency info
          sharedBrands = (sharedBrandDetails || []).map(brand => {
            const access = sharedAccess.find(a => a.brand_id === brand.id)
              const agency = (agencyInfo || []).find(a => a.user_id === brand.user_id)
              

              
            return {
              ...brand,
                agency_info: agency ? {
                  name: agency.agency_name,
                  logo_url: agency.agency_logo_url,
                  owner_id: agency.user_id
                } : undefined,
              shared_access: access ? {
                role: access.role,
                granted_at: access.granted_at,
                can_manage_platforms: access.can_manage_platforms || false,
                can_generate_reports: access.can_generate_reports !== false
              } : undefined
            }
          })
        }
      }

      // Combine owned and shared brands
      const owned = (ownedBrands as unknown as Brand[]) || []
      const loadedBrands = [...owned, ...sharedBrands]
      
      console.log('Loaded brands:', loadedBrands.length, 'owned:', owned.length, 'shared:', sharedBrands.length)
      setBrands(loadedBrands)
      
      // Validate that the selected brand still exists
      if (selectedBrandId && !loadedBrands.some(brand => brand.id === selectedBrandId)) {
        // Selected brand no longer exists, clear it
        setSelectedBrandIdWithPersistence(null)
      }
    } catch (error) {
      console.error('Error in refreshBrands:', error)
      setBrands([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false;

    const handleLoadBrands = async () => {
      if (!isLoaded || cancelled) {
        return;
      }

      if (!userId) {
        // console.log('No user ID, skipping brand load');
        if (!cancelled) {
          setIsLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setIsLoading(true);
      }

      try {
        // console.log('Loading brands for user:', userId);
        const supabase = getSupabaseClient();
        
        // Load owned brands
        const { data: ownedBrands, error: ownedError } = await supabase
          .from('brands')
          .select('*, is_critical')
          .eq('user_id', userId)
          .order('name');

        if (cancelled) return;

        if (ownedError) {
          console.error('Error loading owned brands:', ownedError);
          throw ownedError;
        }

        // Load shared brands access records
        const { data: sharedAccess, error: sharedError } = await supabase
          .from('brand_access')
          .select('brand_id, role, granted_at, can_manage_platforms, can_generate_reports')
          .eq('user_id', userId)
          .is('revoked_at', null)
          .order('granted_at');

        if (cancelled) return;

        if (sharedError) {
          console.error('Error loading shared brands access:', sharedError);
          throw sharedError;
        }

        // If we have shared access, get the brand details with agency info
        let sharedBrands: Brand[] = []
        if (sharedAccess && sharedAccess.length > 0) {
          const sharedBrandIds = sharedAccess.map(access => access.brand_id)
          
          const { data: sharedBrandDetails, error: sharedBrandError } = await supabase
            .from('brands')
            .select('*, is_critical')
            .in('id', sharedBrandIds)

          if (cancelled) return;

          if (sharedBrandError) {
            console.error('Error loading shared brand details:', sharedBrandError)
          } else {
            // Get agency info for shared brands
            const agencyOwnerIds = [...new Set((sharedBrandDetails || []).map(brand => brand.user_id))]
            const { data: agencyInfo, error: agencyError } = await supabase
              .from('agency_settings')
              .select('user_id, agency_name, agency_logo_url')
              .in('user_id', agencyOwnerIds)

            if (cancelled) return;

            if (agencyError) {
              console.error('Error loading agency info:', agencyError)
            }

            // Combine access info with brand details and agency info
            sharedBrands = (sharedBrandDetails || []).map(brand => {
              const access = sharedAccess.find(a => a.brand_id === brand.id)
              const agency = (agencyInfo || []).find(a => a.user_id === brand.user_id)
              

              
              return {
                ...brand,
                agency_info: agency ? {
                  name: agency.agency_name,
                  logo_url: agency.agency_logo_url,
                  owner_id: agency.user_id
                } : undefined,
                shared_access: access ? {
                  role: access.role,
                  granted_at: access.granted_at,
                  can_manage_platforms: access.can_manage_platforms || false,
                  can_generate_reports: access.can_generate_reports !== false
                } : undefined
              }
            })
          }
        }

        // Combine owned and shared brands
        const owned = (ownedBrands as unknown as Brand[]) || [];
        const loadedBrands = [...owned, ...sharedBrands];
        
        // console.log('Initial load - brands:', loadedBrands.length, 'owned:', owned.length, 'shared:', sharedBrands.length)
        setBrands(loadedBrands);
        
        // Validate that the selected brand still exists
        if (selectedBrandId && !loadedBrands.some(brand => brand.id === selectedBrandId)) {
          // Selected brand no longer exists, clear it
          setSelectedBrandIdWithPersistence(null);
        }
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
  }, [userId, isLoaded, selectedBrandId]);

  // Listen for brand access granted events
  useEffect(() => {
    const handleBrandAccessGranted = (event: CustomEvent) => {
      console.log('Brand access granted event received:', event.detail)
      // Add a small delay to ensure database is updated
      setTimeout(() => {
        console.log('Refreshing brands after access granted...')
        refreshBrands()
      }, 1000)
    }

    const handleBrandSelected = (event: CustomEvent) => {
      console.log('Brand selected event received:', event.detail)
      // Refresh brands when a brand is selected (in case data changed)
      refreshBrands()
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('brandAccessGranted', handleBrandAccessGranted as EventListener)
      window.addEventListener('brandSelected', handleBrandSelected as EventListener)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('brandAccessGranted', handleBrandAccessGranted as EventListener)
        window.removeEventListener('brandSelected', handleBrandSelected as EventListener)
      }
    }
  }, [refreshBrands])

  const selectedBrand = brands.find(brand => brand.id === selectedBrandId) || null

  const contextValue = useMemo(() => ({
    selectedBrandId, 
    setSelectedBrandId: setSelectedBrandIdWithPersistence,
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

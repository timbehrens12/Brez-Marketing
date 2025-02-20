'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { supabase } from '@/lib/supabaseClient'

interface Brand {
  id: string
  name: string
  platform_connections: Array<{
    id: string
    platform_type: string
    store_url?: string
    account_id?: string
  }>
}

export default function BrandSelector() {
  const { userId, isLoaded } = useAuth()
  const [brands, setBrands] = useState<Brand[]>([])
  const [selectedBrand, setSelectedBrand] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUserBrands = async () => {
      if (!userId) return
      
      try {
        // Query brands directly with Clerk userId
        const { data, error } = await supabase
          .from('brands')
          .select(`
            id,
            name,
            platform_connections (*)
          `)
          .eq('user_id', userId)

        if (error) throw error
        console.log('Loaded brands:', data)
        setBrands(data || [])
      } catch (error) {
        console.error('Error loading brands:', error)
      } finally {
        setLoading(false)
      }
    }

    if (isLoaded) {
      loadUserBrands()
    }
  }, [userId, isLoaded])

  const handleBrandChange = (brandId: string) => {
    setSelectedBrand(brandId)
    const brand = brands.find(b => b.id === brandId)
    if (!brand) return

    // Dispatch event with connections
    window.dispatchEvent(new CustomEvent('brandSelected', {
      detail: { brandId, connections: brand.platform_connections }
    }))
  }

  if (!isLoaded || loading) {
    return <div className="text-white bg-[#222222] p-2 rounded">Loading brands...</div>
  }

  if (brands.length === 0) {
    return <div className="text-white bg-[#222222] p-2 rounded">No brands found</div>
  }

  return (
    <div className="w-full max-w-xs">
      <select
        value={selectedBrand}
        onChange={(e) => handleBrandChange(e.target.value)}
        className="w-full p-2 border rounded-md bg-white/10 text-white"
      >
        <option value="">Select a Brand</option>
        {brands.map((brand) => (
          <option key={brand.id} value={brand.id}>
            {brand.name}
          </option>
        ))}
      </select>
    </div>
  )
}

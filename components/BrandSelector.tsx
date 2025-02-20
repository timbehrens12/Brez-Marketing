'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthContext'

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
  const { user, loading: authLoading } = useAuth()
  const [brands, setBrands] = useState<Brand[]>([])
  const [selectedBrand, setSelectedBrand] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUserBrands = async () => {
      if (!user) return

      try {
        console.log('Loading brands for user:', user.email)
        const { data: brands, error } = await supabase
          .from('brands')
          .select(`
            id,
            name,
            platform_connections (
              id,
              platform_type,
              store_url,
              account_id
            )
          `)
          .eq('user_id', user.id)

        if (error) {
          console.error('Error fetching brands:', error)
          return
        }

        console.log('Fetched brands:', brands)
        setBrands(brands || [])
      } catch (error) {
        console.error('Error in loadUserBrands:', error)
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) {
      loadUserBrands()
    }
  }, [user, authLoading])

  const handleBrandChange = (brandId: string) => {
    setSelectedBrand(brandId)
    const brand = brands.find(b => b.id === brandId)
    if (!brand) return

    // Emit event for parent components
    const event = new CustomEvent('brandSelected', { 
      detail: { 
        brandId,
        connections: brand.platform_connections 
      }
    })
    window.dispatchEvent(event)
  }

  if (loading) return <div>Loading brands...</div>

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

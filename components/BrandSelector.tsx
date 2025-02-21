'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { supabase } from '@/lib/supabaseClient'

interface Brand {
  id: string;
  name: string;
}

export default function BrandSelector({ onSelect }: { onSelect: (brandId: string) => void }) {
  const { userId } = useAuth()
  const [brands, setBrands] = useState<Brand[]>([])
  const [selectedBrand, setSelectedBrand] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadBrands = async () => {
      if (!userId) return
      
      try {
        console.log('Loading brands for user:', userId)
        const { data, error } = await supabase
          .from('brands')
          .select('*')
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

    loadBrands()
  }, [userId])

  const handleChange = (brandId: string) => {
    setSelectedBrand(brandId)
    onSelect(brandId)
  }

  if (loading) {
    return <div className="text-white bg-[#222222] p-2 rounded">Loading brands...</div>
  }

  if (brands.length === 0) {
    return <div className="text-white bg-[#222222] p-2 rounded">No brands found</div>
  }

  return (
    <select
      value={selectedBrand}
      onChange={(e) => handleChange(e.target.value)}
      className="bg-[#222222] text-white border border-[#333333] rounded p-2 w-full"
    >
      <option value="">Select a Brand</option>
      {brands.map((brand: any) => (
        <option key={brand.id} value={brand.id}>
          {brand.name}
        </option>
      ))}
    </select>
  )
}

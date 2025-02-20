import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

const API_URL = process.env.NEXT_PUBLIC_API_URL

if (!API_URL) {
  console.error("NEXT_PUBLIC_API_URL is not defined in the environment variables.")
}

interface Brand {
  id: string;
  name: string;
  // Add other brand properties as needed
}

interface PlatformData {
  shopify?: {
    orders: any[];
    products: any[];
    totalSales: number;
  };
  meta?: {
    // Meta (Facebook) specific data
    campaigns: any[];
    adsets: any[];
    insights: any[];
  };
  // Add other platforms as needed
}

export default function BrandSelector() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [selectedBrand, setSelectedBrand] = useState<string>('')
  const [platformData, setPlatformData] = useState<PlatformData>({})

  // Fetch brands for current user
  const loadUserBrands = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: brands, error } = await supabase
      .from('brands')
      .select('*')
      .eq('user_id', user.id)

    if (error) {
      console.error('Error loading brands:', error)
      return
    }

    setBrands(brands)
  }

  // Fetch all platform data for selected brand
  const fetchBrandData = async (brandId: string) => {
    try {
      // Fetch Shopify data
      const shopifyResponse = await fetch(`${API_URL}/api/shopify/sales?brandId=${brandId}`)
      const shopifyData = await shopifyResponse.json()

      // Fetch Meta data
      const metaResponse = await fetch(`${API_URL}/api/meta/insights?brandId=${brandId}`)
      const metaData = await metaResponse.json()

      setPlatformData({
        shopify: shopifyData,
        meta: metaData,
        // Add other platforms as needed
      })
    } catch (error) {
      console.error('Error fetching brand data:', error)
    }
  }

  const handleBrandChange = (brandId: string) => {
    setSelectedBrand(brandId)
    fetchBrandData(brandId)
  }

  useEffect(() => {
    loadUserBrands()
  }, [])

  return (
    <div className="w-full">
      <select
        value={selectedBrand}
        onChange={(e) => handleBrandChange(e.target.value)}
        className="w-full p-2 border rounded"
      >
        <option value="">Select a Brand</option>
        {brands.map((brand) => (
          <option key={brand.id} value={brand.id}>
            {brand.name}
          </option>
        ))}
      </select>

      {selectedBrand && platformData.shopify && (
        <div className="mt-4">
          <h3>Shopify Data</h3>
          <p>Total Sales: ${Number(platformData.shopify.totalSales).toFixed(2)}</p>
          <p>Total Orders: {platformData.shopify.orders.length}</p>
        </div>
      )}

      {selectedBrand && platformData.meta && (
        <div className="mt-4">
          <h3>Meta Data</h3>
          {/* Display Meta metrics */}
        </div>
      )}
    </div>
  )
}

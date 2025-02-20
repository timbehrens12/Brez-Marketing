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

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event)
        if (session?.user) {
          console.log('User is authenticated:', session.user)
          await loadUserBrands()
        }
      }
    )

    // Initial load attempt
    loadUserBrands()

    // Cleanup subscription
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const loadUserBrands = async () => {
    console.log('Loading brands...')
    const { data: { user } } = await supabase.auth.getUser()
    console.log('Current user:', user)

    if (!user) {
      console.log('No user found')
      return
    }

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

    console.log('Brands data:', brands)
    console.log('Query error:', error)

    if (error) {
      console.error('Error loading brands:', error)
      return
    }

    setBrands(brands || [])
  }

  // Fetch all platform data for selected brand
  const fetchBrandData = async (brandId: string) => {
    console.log('Fetching data for brand:', brandId)
    try {
      // Fetch Shopify data
      const shopifyResponse = await fetch(`${API_URL}/api/shopify/sales?brandId=${brandId}`)
      const shopifyData = await shopifyResponse.json()
      console.log('Shopify data:', shopifyData)

      // Fetch Meta data
      const metaResponse = await fetch(`${API_URL}/api/meta/insights?brandId=${brandId}`)
      const metaData = await metaResponse.json()
      console.log('Meta data:', metaData)

      setPlatformData({
        shopify: shopifyData,
        meta: metaData,
      })
    } catch (error) {
      console.error('Error fetching brand data:', error)
    }
  }

  const handleBrandChange = (brandId: string) => {
    setSelectedBrand(brandId)
    fetchBrandData(brandId)
  }

  return (
    <div className="w-full max-w-xs">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Select Brand
      </label>
      <select
        value={selectedBrand}
        onChange={(e) => handleBrandChange(e.target.value)}
        className="w-full p-2 border rounded-md bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Choose a brand...</option>
        {brands.map((brand) => (
          <option key={brand.id} value={brand.id}>
            {brand.name}
          </option>
        ))}
      </select>
      {brands.length === 0 && (
        <p className="mt-2 text-sm text-gray-500">No brands found. Please create a brand in settings.</p>
      )}

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

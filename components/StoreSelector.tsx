"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/utils/supabase"
import { useUser } from "@clerk/nextjs"

export function StoreSelector({ onStoreSelect }: { onStoreSelect: (store: string) => void }) {
  const [stores, setStores] = useState<string[]>([])
  const { user } = useUser()

  useEffect(() => {
    if (user) {
      loadUserStores()
    }
  }, [user])

  const loadUserStores = async () => {
    console.log('Loading stores for user:', user?.id)
    
    const { data, error } = await supabase
      .from('brands')
      .select(`
        id,
        platform_connections (
          store_url
        )
      `)
      .eq('user_id', user?.id)

    console.log('User brands:', data)

    if (!error && data) {
      const storeUrls = data
        .flatMap(brand => brand.platform_connections || [])
        .filter(conn => conn?.store_url)
        .map(conn => conn.store_url)
      
      console.log('Processed store URLs:', storeUrls)
      setStores(storeUrls)
    }
  }

  const createTestConnection = async () => {
    const brandId = '299e66f2-7b67-4f71-b45f-a2c299843330' // This is your Test brand ID
    
    const { data, error } = await supabase
      .from('platform_connections')
      .insert([
        {
          brand_id: brandId,
          platform_type: 'shopify',
          store_url: 'https://test-store.myshopify.com',
          access_token: 'test_token', // Required for platform connection
          connected_at: new Date().toISOString()
        }
      ])
      .select()

    if (error) {
      console.error('Error creating connection:', error)
    } else {
      console.log('Created connection:', data)
      // Reload the stores
      loadUserStores()
    }
  }

  return (
    <div>
      <Select onValueChange={onStoreSelect}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select a store" />
        </SelectTrigger>
        <SelectContent>
          {stores.map((store) => (
            <SelectItem key={store} value={store}>
              {store}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <button 
        onClick={createTestConnection}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Add Test Connection
      </button>
    </div>
  )
}


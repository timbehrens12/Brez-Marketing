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
        platform_connections!inner (
          store_url
        )
      `)
      .eq('user_id', user?.id)

    console.log('Raw Supabase response:', data)

    if (!error && data) {
      const storeUrls = data
        .flatMap(brand => brand.platform_connections || [])
        .filter(conn => conn?.store_url)
        .map(conn => conn.store_url)
      
      console.log('Processed store URLs:', storeUrls)
      setStores(storeUrls)
    }
  }

  return (
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
  )
}


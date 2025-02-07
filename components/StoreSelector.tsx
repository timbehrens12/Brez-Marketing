"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ShopifyConnect } from "@/components/ShopifyConnect"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.brezmarketingdashboard.com"

interface StoreSelectorProps {
  onStoreSelect: (store: string) => void
}

export function StoreSelector({ onStoreSelect }: StoreSelectorProps) {
  const [stores, setStores] = useState<string[]>([])
  const [selectedStore, setSelectedStore] = useState<string | null>(null)

  useEffect(() => {
    fetchStores()
  }, [])

  async function fetchStores() {
    try {
      const response = await fetch(`${API_URL}/api/stores`)
      const data = await response.json()
      setStores(data)
      if (data.length > 0 && !selectedStore) {
        setSelectedStore(data[0])
        onStoreSelect(data[0])
      }
    } catch (err) {
      console.error("Error fetching stores:", err)
    }
  }

  function handleStoreSelect(store: string) {
    setSelectedStore(store)
    onStoreSelect(store)
  }

  return (
    <div className="flex items-center gap-4">
      {stores.length > 0 ? (
        <Select value={selectedStore || ""} onValueChange={handleStoreSelect}>
          <SelectTrigger className="w-[250px]">
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
      ) : (
        <ShopifyConnect />
      )}
    </div>
  )
}


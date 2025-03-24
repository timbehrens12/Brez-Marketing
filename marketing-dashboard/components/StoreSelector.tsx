"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const API_URL = process.env.NEXT_PUBLIC_API_URL

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

  return (
    <Select value={selectedStore || ""} onValueChange={(store) => {
      setSelectedStore(store)
      onStoreSelect(store)
    }}>
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
  )
}


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
    <Select onValueChange={onStoreSelect}>
      <SelectTrigger className="w-[200px] bg-[#111111] text-white border-[#222222] hover:bg-[#222222]">
        <SelectValue placeholder="Select a store" />
      </SelectTrigger>
      <SelectContent className="bg-[#111111] border-[#222222]">
        {stores.map((store) => (
          <SelectItem 
            key={store} 
            value={store} 
            className="text-white hover:bg-[#222222]"
          >
            {store}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}


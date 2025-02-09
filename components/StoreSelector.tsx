"use client"

import { useState, useEffect } from "react"
import { Store } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

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

  function handleAddStore() {
    const newStore = prompt("Enter the URL of your Shopify store (e.g., mystore.myshopify.com):")
    if (newStore) {
      const shopUrl = newStore.includes(".myshopify.com") ? newStore : `${newStore}.myshopify.com`
      window.location.href = `${API_URL}/shopify/auth?shop=${encodeURIComponent(shopUrl)}`
    }
  }

  return (
    <div className="flex items-center gap-4">
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
      <Button onClick={handleAddStore} variant="outline" size="sm">
        <Store className="mr-2 h-4 w-4" />
        Add Store
      </Button>
    </div>
  )
}


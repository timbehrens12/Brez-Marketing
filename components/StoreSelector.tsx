"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ShopifyConnect } from "@/components/ShopifyConnect"
import { useSearchParams } from "next/navigation"

interface StoreSelectorProps {
  onStoreSelect: (store: string) => void
}

export function StoreSelector({ onStoreSelect }: StoreSelectorProps) {
  const [stores, setStores] = useState<string[]>([])
  const [selectedStore, setSelectedStore] = useState<string | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    const shop = searchParams.get("shop")
    if (shop) {
      setStores([shop])
      setSelectedStore(shop)
      onStoreSelect(shop)
    }
  }, [searchParams, onStoreSelect])

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


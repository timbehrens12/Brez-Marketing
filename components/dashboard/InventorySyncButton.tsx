"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"

interface InventorySyncButtonProps {
  connectionId: string
  className?: string
}

export function InventorySyncButton({ connectionId, className }: InventorySyncButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false)

  const handleSync = async () => {
    if (!connectionId) {
      toast.error("No connection ID provided")
      return
    }

    try {
      setIsSyncing(true)
      toast.info("Starting inventory sync...")

      const response = await fetch('/api/shopify/inventory/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ connectionId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to sync inventory')
      }

      const data = await response.json()
      toast.success(`Inventory sync completed! Processed ${data.totalProducts} products.`)
    } catch (error) {
      console.error('Error syncing inventory:', error)
      toast.error(`Failed to sync inventory: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleSync} 
      disabled={isSyncing}
      className={className}
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
      {isSyncing ? 'Syncing...' : 'Sync Inventory'}
    </Button>
  )
} 
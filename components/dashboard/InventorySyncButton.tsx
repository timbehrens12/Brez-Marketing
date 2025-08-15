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
      console.log(`Starting inventory sync for connection: ${connectionId}`)

      const response = await fetch('/api/shopify/inventory/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ connectionId })
      })

      const responseText = await response.text()
      console.log(`Inventory sync response: ${responseText.substring(0, 200)}...`)
      
      let data
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error('Error parsing sync response:', parseError)
        throw new Error(`Failed to parse sync response: ${responseText.substring(0, 100)}...`)
      }

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to sync inventory')
      }

      console.log('Inventory sync completed successfully:', data)
      toast.success(`Inventory sync completed! Processed ${data.totalProducts} products.`)
      
      // Force a page refresh to show the new data
      window.location.reload()
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
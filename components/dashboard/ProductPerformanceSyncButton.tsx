"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"

interface ProductPerformanceSyncButtonProps {
  connectionId: string
  className?: string
}

export function ProductPerformanceSyncButton({ connectionId, className }: ProductPerformanceSyncButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false)

  const handleSync = async () => {
    if (!connectionId) {
      toast.error("No connection ID provided")
      return
    }

    try {
      setIsSyncing(true)
      toast.info("Starting product performance sync...")
      console.log(`Starting product performance sync for connection: ${connectionId}`)

      const response = await fetch('/api/shopify/products/performance/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ connectionId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to sync product performance data')
      }

      const data = await response.json()
      console.log('Product performance sync completed successfully:', data)
      
      toast.success(`Product performance sync completed! Processed ${data.metrics} products, ${data.relationships} relationships, and ${data.reviews} reviews.`)
      
      // Force a page refresh to show the new data
      window.location.reload()
    } catch (error) {
      console.error('Error syncing product performance data:', error)
      toast.error(`Failed to sync product performance data: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
      {isSyncing ? 'Syncing...' : 'Sync Product Data'}
    </Button>
  )
} 
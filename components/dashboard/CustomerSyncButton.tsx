"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Users } from 'lucide-react'
import { toast } from 'sonner'

interface CustomerSyncButtonProps {
  connectionId: string
  className?: string
}

export function CustomerSyncButton({ connectionId, className }: CustomerSyncButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false)

  const handleSync = async () => {
    if (isSyncing) return
    
    setIsSyncing(true)
    
    try {
      const response = await fetch('/api/shopify/customers/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ connectionId })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync customer data')
      }
      
      toast.success('Customer data sync initiated successfully')
      
      // Dispatch a custom event to notify other components that customer data has been refreshed
      const event = new CustomEvent('refreshCustomerData', {
        detail: { connectionId }
      })
      window.dispatchEvent(event)
      
    } catch (error) {
      console.error('Error syncing customer data:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to sync customer data')
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <Button 
      onClick={handleSync} 
      variant="outline" 
      size="sm" 
      className={className}
      disabled={isSyncing}
    >
      {isSyncing ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Syncing Customers...
        </>
      ) : (
        <>
          <Users className="h-4 w-4 mr-2" />
          Sync Customers
        </>
      )}
    </Button>
  )
} 
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
    console.log('Starting customer sync for connection ID:', connectionId)
    
    try {
      console.log('Sending request to /api/shopify/customers/sync')
      const response = await fetch('/api/shopify/customers/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ connectionId })
      })
      
      console.log('Response status:', response.status)
      const data = await response.json()
      console.log('Response data:', data)
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync customer data')
      }
      
      if (data.count === 0) {
        toast.info('No customers found in your Shopify store')
      } else if (data.saved === 0 && data.errors > 0) {
        toast.error(`Failed to save customer data. ${data.errors} errors occurred.`)
      } else if (data.saved > 0) {
        toast.success(`Successfully synced ${data.saved} customers`)
      } else {
        toast.success('Customer data sync completed')
      }
      
      // Dispatch a custom event to notify other components that customer data has been refreshed
      const event = new CustomEvent('refreshCustomerData', {
        detail: { connectionId, syncResult: data }
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
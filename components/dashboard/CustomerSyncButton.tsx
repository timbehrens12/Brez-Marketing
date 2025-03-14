"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

interface CustomerSyncButtonProps {
  connectionId: string
  className?: string
}

export function CustomerSyncButton({ connectionId, className }: CustomerSyncButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [showErrorDialog, setShowErrorDialog] = useState(false)
  const [syncDetails, setSyncDetails] = useState<any>(null)

  const handleSync = async () => {
    if (isSyncing) return
    
    setIsSyncing(true)
    setSyncError(null)
    setSyncDetails(null)
    
    console.log('Starting customer sync for connection ID:', connectionId)
    toast.info('Starting customer sync...', { duration: 3000 })
    
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
      setSyncDetails(data)
      
      if (!response.ok) {
        const errorMessage = data.error || 'Failed to sync customer data'
        console.error('Sync error:', errorMessage)
        
        if (data.details) {
          console.error('Error details:', data.details)
        }
        
        if (data.solution) {
          console.info('Suggested solution:', data.solution)
        }
        
        setSyncError(errorMessage)
        setShowErrorDialog(true)
        throw new Error(errorMessage)
      }
      
      if (data.count === 0) {
        toast.info('No customers found in your Shopify store')
      } else if (data.saved === 0 && data.errors > 0) {
        toast.error(`Failed to save customer data. ${data.errors} errors occurred.`)
        setSyncError(`Failed to save customer data. ${data.errors} errors occurred.`)
        setShowErrorDialog(true)
      } else if (data.saved > 0) {
        toast.success(`Successfully synced ${data.saved} customers`)
        
        // Show more detailed information
        if (data.verified_count !== undefined) {
          console.log(`Verified ${data.verified_count} customers in database`)
          
          if (data.verified_count < data.saved) {
            console.warn(`Warning: Only ${data.verified_count} of ${data.saved} customers were verified in the database`)
          }
        }
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
      const errorMessage = error instanceof Error ? error.message : 'Failed to sync customer data'
      toast.error(errorMessage)
      
      if (!syncError) {
        setSyncError(errorMessage)
        setShowErrorDialog(true)
      }
    } finally {
      setIsSyncing(false)
    }
  }

  const closeErrorDialog = () => {
    setShowErrorDialog(false)
  }

  const retrySync = () => {
    closeErrorDialog()
    setTimeout(() => {
      handleSync()
    }, 500)
  }

  return (
    <>
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
      
      <AlertDialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Customer Sync Error</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-2">
                <p className="text-red-500 font-medium">{syncError}</p>
                
                {syncDetails?.details && (
                  <div className="mt-2">
                    <p className="font-medium">Error Details:</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{syncDetails.details}</p>
                  </div>
                )}
                
                {syncDetails?.solution && (
                  <div className="mt-2 p-2 bg-muted rounded-md">
                    <p className="font-medium">Suggested Solution:</p>
                    <pre className="text-xs overflow-auto p-2 bg-background rounded mt-1">{syncDetails.solution}</pre>
                  </div>
                )}
                
                <p className="mt-4">Would you like to try again or check your Shopify connection?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeErrorDialog}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={retrySync}>Try Again</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
} 
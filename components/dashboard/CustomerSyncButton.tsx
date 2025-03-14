"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useSupabase } from '@/lib/hooks/useSupabase'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface CustomerSyncButtonProps {
  brandId: string
  connectionId?: string
  className?: string
}

export function CustomerSyncButton({ brandId, connectionId, className }: CustomerSyncButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [showErrorDialog, setShowErrorDialog] = useState(false)
  const [syncDetails, setSyncDetails] = useState<any>(null)
  const [showShopUrlDialog, setShowShopUrlDialog] = useState(false)
  const [shopUrl, setShopUrl] = useState('')
  const supabase = useSupabase()

  const handleSync = async () => {
    if (!connectionId) {
      toast.error('No Shopify connection found')
      return
    }

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
        console.error('Customer sync error:', data)
        
        // Check if the error is related to missing shop URL
        if (data.error === 'Invalid connection data' && data.details?.includes('Shop URL is missing')) {
          setSyncError('Shop URL is missing. Please provide your Shopify store URL to fix this issue.')
          setShowShopUrlDialog(true)
          return
        }
        
        throw new Error(data.error || 'Failed to sync customers')
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

  const handleFixConnection = async () => {
    if (!connectionId || !shopUrl) {
      toast.error('Connection ID and Shop URL are required')
      return
    }

    setIsSyncing(true)
    setSyncError(null)

    try {
      // Clean up the shop URL (remove https:// if present)
      const cleanShopUrl = shopUrl.replace(/^https?:\/\//, '')
      
      const response = await fetch('/api/shopify/customers/fix-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          connectionId,
          shopUrl: cleanShopUrl
        })
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('Fix connection error:', data)
        throw new Error(data.error || 'Failed to fix connection')
      }

      toast.success('Connection fixed and customer sync started successfully!')
      setShowShopUrlDialog(false)
    } catch (error) {
      console.error('Error fixing connection:', error)
      setSyncError(error instanceof Error ? error.message : 'Failed to fix connection')
      toast.error(`Fix Connection Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
        disabled={isSyncing || !connectionId}
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
      
      {/* Shop URL Dialog */}
      <Dialog open={showShopUrlDialog} onOpenChange={setShowShopUrlDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fix Shopify Connection</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Your Shopify connection is missing the shop URL. Please enter your Shopify store URL to fix this issue.
            </p>
            <div className="space-y-2">
              <Label htmlFor="shopUrl">Shopify Store URL</Label>
              <Input
                id="shopUrl"
                placeholder="your-store.myshopify.com"
                value={shopUrl}
                onChange={(e) => setShopUrl(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowShopUrlDialog(false)}
              disabled={isSyncing}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleFixConnection}
              disabled={isSyncing || !shopUrl}
            >
              {isSyncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fixing...
                </>
              ) : (
                'Fix & Sync'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
} 
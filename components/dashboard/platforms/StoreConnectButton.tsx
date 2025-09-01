"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { Store, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "react-hot-toast"
import { useSupabase } from "@/lib/hooks/useSupabase"

const API_URL = process.env.NEXT_PUBLIC_API_URL

if (!API_URL) {
  console.error("NEXT_PUBLIC_API_URL is not defined in the environment variables.")
}

interface StoreConnectButtonProps {
  onConnect: (data: any) => Promise<void>
  isConnected: boolean
  connectionId?: string
}

export function StoreConnectButton({ onConnect, isConnected, connectionId }: StoreConnectButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [storeUrl, setStoreUrl] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsConnecting(true)

    try {
      const newConnectionId = crypto.randomUUID() // Rename to avoid confusion
      const response = await fetch('/api/shopify/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          connectionId: newConnectionId,  // Use the renamed variable
          storeUrl: storeUrl
        })
      })

      if (!response.ok) {
        throw new Error("Failed to connect store")
      }

      const data = await response.json()
      console.log('Connection successful:', data)
      toast.success('Store connected successfully')
      onConnect(data)
    } catch (error) {
      console.error('Connection error:', error)
      setError("Failed to connect store. Please try again.")
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      // Use the proper disconnect API instead of direct database access
      const response = await fetch('/api/disconnect-platform/force', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          brandId: connectionId, // Assuming connectionId is the brandId here
          platformType: 'shopify' 
        }),
      })
      
      if (!response.ok) {
        const responseData = await response.json()
        throw new Error(responseData.error || 'Failed to disconnect store')
      }

      toast.success('Store disconnected successfully')
      window.location.reload() // Refresh to update UI
    } catch (error) {
      console.error('Error disconnecting store:', error)
      toast.error('Failed to disconnect store')
    }
  }

  const handleSync = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/shopify/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ storeUrl })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Sync error:', errorData)
        throw new Error(errorData.error || 'Failed to sync')
      }

      const data = await response.json()
      console.log('Sync successful:', data)
      toast.success('Store synced successfully')
    } catch (error) {
      console.error('Sync failed:', error)
      toast.error('Failed to sync store')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)}
        className="bg-[#96BF48] hover:bg-[#85AB3F] text-white"
      >
        <Store className="mr-2 h-4 w-4" />
        Connect Shopify Store
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Shopify Store</DialogTitle>
            <DialogDescription>
              Enter your Shopify store URL to begin the connection process.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConnect} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="store-url">Store URL</Label>
              <div className="flex gap-2">
                <Input
                  id="store-url"
                  placeholder="your-store.myshopify.com"
                  value={storeUrl}
                  onChange={(e) => setStoreUrl(e.target.value)}
                  disabled={isConnecting}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>

            <Button 
              type="submit" 
              className="w-full bg-[#96BF48] hover:bg-[#85AB3F] text-white"
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect Store'
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

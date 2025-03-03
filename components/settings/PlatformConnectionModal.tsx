"use client"

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "react-hot-toast"
import { useSupabase } from '@/lib/hooks/useSupabase'
import { useUser } from "@clerk/nextjs"
import { Loader2 } from "lucide-react"

interface PlatformConnectionModalProps {
  platform: 'shopify' | 'meta'
  brandId: string
  children: React.ReactNode
  onSuccess?: () => void
}

export function PlatformConnectionModal({ 
  platform, 
  brandId, 
  children,
  onSuccess
}: PlatformConnectionModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [shopUrl, setShopUrl] = useState('')
  const [metaCheckInterval, setMetaCheckInterval] = useState<NodeJS.Timeout | null>(null)
  const shopifyCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const authWindowRef = useRef<Window | null>(null)
  const supabase = useSupabase()
  const { user } = useUser()

  // Clean up intervals on unmount
  useEffect(() => {
    return () => {
      if (metaCheckInterval) {
        clearInterval(metaCheckInterval)
      }
      if (shopifyCheckIntervalRef.current) {
        clearInterval(shopifyCheckIntervalRef.current)
      }
      // Close any open auth windows
      if (authWindowRef.current && !authWindowRef.current.closed) {
        authWindowRef.current.close()
      }
    }
  }, [metaCheckInterval])

  const handleShopifyConnect = async () => {
    if (!shopUrl) {
      toast.error('Shop URL is required')
      return
    }

    setIsLoading(true)
    try {
      // Format the shop URL if needed
      let formattedShopUrl = shopUrl.trim()
      if (!formattedShopUrl.includes('.myshopify.com')) {
        formattedShopUrl = `${formattedShopUrl}.myshopify.com`
      }
      
      // Create a connection record
      const { data: connection, error } = await supabase
        .from('platform_connections')
        .insert({
          platform_type: 'shopify',
          brand_id: brandId,
          user_id: user?.id,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select()
        .single()
          
      if (error) {
        console.error('Error creating Shopify connection:', error)
        toast.error('Failed to create Shopify connection')
        return
      }
      
      // Open the Shopify auth URL in a new window
      const authUrl = `/api/shopify/auth?brandId=${brandId}&connectionId=${connection.id}&shop=${formattedShopUrl}`
      const authWindow = window.open(authUrl, 'shopify-auth', 'width=600,height=700')
      authWindowRef.current = authWindow
      
      if (!authWindow) {
        toast.error('Popup blocked. Please allow popups for this site.')
        setIsLoading(false)
        return
      }
      
      // Check periodically if the connection is successful
      const checkInterval = setInterval(async () => {
        // First check if the window is still open
        if (authWindow && authWindow.closed) {
          // Window was closed, check if connection was successful
          const { data, error } = await supabase
            .from('platform_connections')
            .select('status')
            .eq('id', connection.id)
            .single()
            
          if (data && data.status === 'active') {
            clearInterval(checkInterval)
            shopifyCheckIntervalRef.current = null
            setIsOpen(false)
            toast.success('Shopify connected successfully')
            if (onSuccess) onSuccess()
          } else {
            // Window closed but connection not active
            clearInterval(checkInterval)
            shopifyCheckIntervalRef.current = null
            setIsLoading(false)
            toast.error('Connection process was interrupted. Please try again.')
          }
          return
        }
        
        // If window is still open, check connection status
        const { data, error } = await supabase
          .from('platform_connections')
          .select('status')
          .eq('id', connection.id)
          .single()
          
        if (data && data.status === 'active') {
          clearInterval(checkInterval)
          shopifyCheckIntervalRef.current = null
          if (authWindow && !authWindow.closed) authWindow.close()
          authWindowRef.current = null
          setIsOpen(false)
          toast.success('Shopify connected successfully')
          if (onSuccess) onSuccess()
        }
      }, 2000)
      
      shopifyCheckIntervalRef.current = checkInterval
      
      // Clear interval after 2 minutes (timeout)
      setTimeout(() => {
        if (shopifyCheckIntervalRef.current) {
          clearInterval(shopifyCheckIntervalRef.current)
          shopifyCheckIntervalRef.current = null
        }
        // If still loading after timeout, show error
        if (isLoading) {
          setIsLoading(false)
          toast.error('Connection timed out. Please try again.')
        }
      }, 120000)
      
    } catch (error) {
      console.error('Connection error:', error)
      toast.error('Failed to initiate connection')
    } finally {
      setIsLoading(false)
    }
  }

  const handleMetaConnect = async () => {
    setIsLoading(true)
    try {
      // Create a pending connection record first
      const { data: connection, error } = await supabase
        .from('platform_connections')
        .insert({
          platform_type: 'meta',
          brand_id: brandId,
          user_id: user?.id,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select()
        .single()
          
      if (error) {
        console.error('Error creating Meta connection:', error)
        toast.error('Failed to create Meta connection')
        return
      }
      
      // Open the Meta auth URL in a new window
      const authUrl = `/api/auth/meta?brandId=${brandId}`
      const authWindow = window.open(authUrl, 'meta-auth', 'width=600,height=700')
      authWindowRef.current = authWindow
      
      if (!authWindow) {
        toast.error('Popup blocked. Please allow popups for this site.')
        setIsLoading(false)
        return
      }
      
      // Check periodically if the connection is successful
      const interval = setInterval(async () => {
        // First check if the window is still open
        if (authWindow && authWindow.closed) {
          // Window was closed, check if connection was successful
          const { data, error } = await supabase
            .from('platform_connections')
            .select('status')
            .eq('brand_id', brandId)
            .eq('platform_type', 'meta')
            .eq('status', 'active')
            
          if (data && data.length > 0) {
            clearInterval(interval)
            setMetaCheckInterval(null)
            setIsOpen(false)
            toast.success('Meta connected successfully')
            if (onSuccess) onSuccess()
          } else {
            // Window closed but connection not active
            clearInterval(interval)
            setMetaCheckInterval(null)
            setIsLoading(false)
            toast.error('Connection process was interrupted. Please try again.')
          }
          return
        }
        
        // If window is still open, check connection status
        const { data, error } = await supabase
          .from('platform_connections')
          .select('status')
          .eq('brand_id', brandId)
          .eq('platform_type', 'meta')
          .eq('status', 'active')
          
        if (data && data.length > 0) {
          clearInterval(interval)
          setMetaCheckInterval(null)
          if (authWindow && !authWindow.closed) authWindow.close()
          authWindowRef.current = null
          setIsOpen(false)
          toast.success('Meta connected successfully')
          if (onSuccess) onSuccess()
        }
      }, 2000)
      
      setMetaCheckInterval(interval)
      
      // Clear interval after 2 minutes (timeout)
      setTimeout(() => {
        clearInterval(interval)
        setMetaCheckInterval(null)
        // If still loading after timeout, show error
        if (isLoading) {
          setIsLoading(false)
          toast.error('Connection timed out. Please check if Meta was connected and try again if needed.')
        }
      }, 120000)
      
    } catch (error) {
      console.error('Connection error:', error)
      toast.error('Failed to initiate connection')
      setIsLoading(false)
    }
  }

  const handleConnect = () => {
    if (platform === 'shopify') {
      handleShopifyConnect()
    } else if (platform === 'meta') {
      handleMetaConnect()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // If closing the dialog while loading, clean up
      if (!open && isLoading) {
        setIsLoading(false)
        if (metaCheckInterval) {
          clearInterval(metaCheckInterval)
          setMetaCheckInterval(null)
        }
        if (shopifyCheckIntervalRef.current) {
          clearInterval(shopifyCheckIntervalRef.current)
          shopifyCheckIntervalRef.current = null
        }
        if (authWindowRef.current && !authWindowRef.current.closed) {
          authWindowRef.current.close()
          authWindowRef.current = null
        }
      }
      setIsOpen(open)
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-[#1A1A1A] border-[#333] text-white">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Connect {platform === 'shopify' ? 'Shopify' : 'Meta Ads'}
          </DialogTitle>
        </DialogHeader>
        
        {platform === 'shopify' && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="shop-url">Shopify Store URL</Label>
              <Input
                id="shop-url"
                placeholder="your-store.myshopify.com"
                value={shopUrl}
                onChange={(e) => setShopUrl(e.target.value)}
                className="bg-[#222] border-[#444] text-white"
              />
              <p className="text-xs text-gray-400">
                Enter your Shopify store URL. We'll only request read access to your store data.
              </p>
            </div>
          </div>
        )}
        
        {platform === 'meta' && (
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-300">
              You'll be redirected to Meta to authorize access to your ad account data.
              We only request read access to your ads and insights.
            </p>
          </div>
        )}
        
        <DialogFooter className="sm:justify-end">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            className="bg-transparent border-[#444] text-white hover:bg-[#333] hover:text-white"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConnect}
            disabled={isLoading || (platform === 'shopify' && !shopUrl)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              'Connect'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 
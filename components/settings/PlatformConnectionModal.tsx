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

  // Add message event listener for direct communication from popup windows
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Handle Shopify connection success message
      if (event.data && event.data.type === 'SHOPIFY_CONNECTION_SUCCESS') {
        console.log('Received success message from Shopify popup:', event.data);
        
        // Clear any existing check intervals
        if (shopifyCheckIntervalRef.current) {
          clearInterval(shopifyCheckIntervalRef.current);
          shopifyCheckIntervalRef.current = null;
        }
        
        // Close the auth window if it's still open
        try {
          if (authWindowRef.current && !authWindowRef.current.closed) {
            authWindowRef.current.close();
          }
        } catch (e) {
          console.error('Error closing auth window:', e);
        }
        
        authWindowRef.current = null;
        setIsLoading(false);
        setIsOpen(false);
        toast.success('Shopify connected successfully');
        if (onSuccess) onSuccess();
      }
      
      // Handle Shopify connection error message
      if (event.data && event.data.type === 'SHOPIFY_CONNECTION_ERROR') {
        console.log('Received error message from Shopify popup:', event.data);
        
        // Clear any existing check intervals
        if (shopifyCheckIntervalRef.current) {
          clearInterval(shopifyCheckIntervalRef.current);
          shopifyCheckIntervalRef.current = null;
        }
        
        // Close the auth window if it's still open
        try {
          if (authWindowRef.current && !authWindowRef.current.closed) {
            authWindowRef.current.close();
          }
        } catch (e) {
          console.error('Error closing auth window:', e);
        }
        
        authWindowRef.current = null;
        setIsLoading(false);
        toast.error('Shopify connection failed. Please try again.');
        
        // Clean up the pending connection if we have a connectionId
        if (event.data.connectionId) {
          (async () => {
            try {
              await supabase
                .from('platform_connections')
                .delete()
                .eq('id', event.data.connectionId)
                .eq('status', 'pending');
              console.log('Cleaned up pending connection after error');
            } catch (err: unknown) {
              console.error('Error cleaning up connection:', err);
            }
          })();
        }
      }
    };
    
    // Add the event listener
    window.addEventListener('message', handleMessage);
    
    // Clean up
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [onSuccess, supabase]);

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
        setIsLoading(false)
        return
      }
      
      // Open the Shopify auth URL in a new window
      const authUrl = `/api/shopify/auth?brandId=${brandId}&connectionId=${connection.id}&shop=${formattedShopUrl}`
      console.log('Opening auth window with URL:', authUrl)
      
      // Use a more reliable way to open the popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const features = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=1`;
      
      // Try to open the window
      let authWindow: Window | null = null;
      try {
        authWindow = window.open(authUrl, 'shopify-auth', features);
        authWindowRef.current = authWindow;
      } catch (e) {
        console.error('Error opening popup window:', e);
      }
      
      if (!authWindow) {
        toast.error('Popup blocked. Please allow popups for this site and try again.')
        
        // Clean up the pending connection
        await supabase
          .from('platform_connections')
          .delete()
          .eq('id', connection.id)
          
        setIsLoading(false)
        return
      }
      
      // Focus the popup window
      try {
        authWindow.focus();
      } catch (e) {
        console.error('Error focusing popup window:', e);
      }
      
      // Check periodically if the connection is successful
      const checkInterval = setInterval(async () => {
        // First check if the window is still open
        let isClosed = false;
        try {
          isClosed = authWindow?.closed || false;
        } catch (e) {
          console.error('Error checking if window is closed:', e);
          isClosed = true;
        }
        
        if (isClosed) {
          console.log('Auth window was closed')
          // Window was closed, check if connection was successful
          try {
            const { data, error } = await supabase
              .from('platform_connections')
              .select('status')
              .eq('id', connection.id)
              .single()
              
            if (data && data.status === 'active') {
              console.log('Connection is active')
              clearInterval(checkInterval)
              shopifyCheckIntervalRef.current = null
              setIsLoading(false)
              setIsOpen(false)
              toast.success('Shopify connected successfully')
              if (onSuccess) onSuccess()
            } else {
              // Window closed but connection not active
              console.log('Window closed but connection not active')
              clearInterval(checkInterval)
              shopifyCheckIntervalRef.current = null
              setIsLoading(false)
              toast.error('Connection process was interrupted. Please try again.')
              
              // Clean up the pending connection
              await supabase
                .from('platform_connections')
                .delete()
                .eq('id', connection.id)
                .eq('status', 'pending')
            }
          } catch (err) {
            console.error('Error checking connection status after window close:', err);
            clearInterval(checkInterval);
            shopifyCheckIntervalRef.current = null;
            setIsLoading(false);
            toast.error('Error checking connection status. Please try again.');
          }
          return
        }
        
        // If window is still open, check connection status
        try {
          const { data, error } = await supabase
            .from('platform_connections')
            .select('status')
            .eq('id', connection.id)
            .single()
            
          if (error) {
            console.error('Error checking connection status:', error)
            return
          }
            
          if (data && data.status === 'active') {
            console.log('Connection is active')
            clearInterval(checkInterval)
            shopifyCheckIntervalRef.current = null
            
            // Try to close the window
            try {
              if (authWindow && !authWindow.closed) {
                authWindow.close();
              }
            } catch (e) {
              console.error('Error closing auth window:', e);
            }
            
            authWindowRef.current = null
            setIsLoading(false)
            setIsOpen(false)
            toast.success('Shopify connected successfully')
            if (onSuccess) onSuccess()
          }
        } catch (err) {
          console.error('Error in check interval:', err)
        }
      }, 2000)
      
      shopifyCheckIntervalRef.current = checkInterval
      
      // Clear interval after 2 minutes (timeout)
      setTimeout(async () => {
        if (shopifyCheckIntervalRef.current) {
          clearInterval(shopifyCheckIntervalRef.current)
          shopifyCheckIntervalRef.current = null
        }
        
        // If still loading after timeout, show error and clean up
        if (isLoading) {
          setIsLoading(false)
          toast.error('Connection timed out. Please try again.')
          
          // Close the auth window if it's still open
          try {
            if (authWindowRef.current && !authWindowRef.current.closed) {
              authWindowRef.current.close()
            }
          } catch (e) {
            console.error('Error closing auth window on timeout:', e);
          }
          
          authWindowRef.current = null
          
          // Clean up the pending connection
          try {
            await supabase
              .from('platform_connections')
              .delete()
              .eq('id', connection.id)
              .eq('status', 'pending')
            console.log('Cleaned up pending connection after timeout')
          } catch (err: unknown) {
            console.error('Error cleaning up connection:', err)
          }
        }
      }, 120000)
      
    } catch (error) {
      console.error('Connection error:', error)
      toast.error('Failed to initiate connection')
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
"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { getSupabaseClient } from "@/lib/supabase/client"

interface PlatformCardProps {
  name: string
  icon: string
  platformType: 'shopify' | 'meta' | 'google' | 'tiktok'
  brandId: string
  isConnected: boolean
  connectionDetails?: any
}

export function PlatformCard({ 
  name, 
  icon, 
  platformType,
  brandId,
  isConnected,
  connectionDetails 
}: PlatformCardProps) {
  const [loading, setLoading] = useState(false)

  const handleConnect = async () => {
    setLoading(true)
    switch(platformType) {
      case 'shopify':
        const shopifyAuthUrl = `https://accounts.shopify.com/oauth/authorize?` +
          `client_id=${process.env.NEXT_PUBLIC_SHOPIFY_CLIENT_ID}` +
          `&scope=read_products,read_orders` +
          `&redirect_uri=${encodeURIComponent('https://brezmarketingdashboard.com/api/auth/callback/shopify')}` +
          `&state=${brandId}`
        window.location.href = shopifyAuthUrl
        break
        
      case 'meta':
        window.location.href = `/api/auth/meta?brandId=${brandId}`
        break
        
      // Add other platform connections as needed
    }
  }

  const handleDisconnect = async () => {
    try {
      setLoading(true)
      const supabase = getSupabaseClient()
      const { error } = await supabase
        .from('platform_connections')
        .delete()
        .match({ brand_id: brandId, platform_type: platformType })

      if (error) throw error
      window.location.reload() // Refresh to update UI
    } catch (error) {
      console.error('Error disconnecting platform:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleManage = () => {
    // Open management modal/page based on platform type
    switch(platformType) {
      case 'shopify':
        window.open(connectionDetails?.store_url, '_blank')
        break
      case 'meta':
        window.open('https://business.facebook.com/adsmanager', '_blank')
        break
    }
  }

  return (
    <div className="flex items-center justify-between p-4 bg-[#222222] rounded-lg">
      <div className="flex items-center gap-3">
        <img src={icon} alt={name} className="w-8 h-8" />
        <span>{name}</span>
      </div>
      {isConnected ? (
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="bg-transparent"
            onClick={handleManage}
            disabled={loading}
          >
            Manage
          </Button>
          <Button 
            variant="outline" 
            className="bg-transparent text-red-500"
            onClick={handleDisconnect}
            disabled={loading}
          >
            Disconnect
          </Button>
        </div>
      ) : (
        <Button 
          className="bg-blue-600 hover:bg-blue-700"
          onClick={handleConnect}
          disabled={loading}
        >
          Connect
        </Button>
      )}
    </div>
  )
} 
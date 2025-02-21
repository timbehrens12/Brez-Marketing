"use client"

import { useState, useEffect } from "react"
import BrandSelector from "@/components/BrandSelector"
import { BrandDialog } from "@/components/settings/BrandDialog"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from "@clerk/nextjs"

export default function SettingsPage() {
  const { userId } = useAuth()
  const [showBrandDialog, setShowBrandDialog] = useState(false)
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null)
  const [connections, setConnections] = useState<any[]>([])

  useEffect(() => {
    const loadConnections = async () => {
      if (!selectedBrandId) return
      
      const { data, error } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('brand_id', selectedBrandId)

      if (!error) {
        setConnections(data || [])
      }
    }

    loadConnections()
  }, [selectedBrandId])

  const handleConnect = async (platformType: string) => {
    if (platformType === 'shopify') {
      const shopifyAuthUrl = `https://accounts.shopify.com/oauth/authorize?` +
        `client_id=${process.env.NEXT_PUBLIC_SHOPIFY_CLIENT_ID}` +
        `&scope=read_products,read_orders` +
        `&redirect_uri=${encodeURIComponent('https://brezmarketingdashboard.com/api/auth/callback/shopify')}` +
        `&response_type=code` +
        `&state=${selectedBrandId}`
      window.location.href = shopifyAuthUrl
    } else if (platformType === 'meta') {
      // Create a proper Meta authentication flow
      window.location.href = `https://www.facebook.com/v18.0/dialog/oauth?` +
        `client_id=${process.env.NEXT_PUBLIC_META_APP_ID}` +
        `&redirect_uri=${encodeURIComponent('https://brezmarketingdashboard.com/api/auth/callback/meta')}` +
        `&scope=ads_read,ads_management` +
        `&state=${selectedBrandId}`
    }
  }

  const handleDisconnect = async (platformType: string) => {
    const { error } = await supabase
      .from('platform_connections')
      .delete()
      .match({ 
        brand_id: selectedBrandId,
        platform_type: platformType 
      })

    if (!error) {
      window.location.reload()
    }
  }

  const platforms = [
    {
      name: 'Shopify',
      icon: '/shopify-icon.png',
      type: 'shopify'
    },
    {
      name: 'Meta Ads',
      icon: '/meta-icon.png',
      type: 'meta'
    }
  ]

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="bg-[#111111] p-6 rounded-lg mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Brands</h2>
          <Button 
            onClick={() => setShowBrandDialog(true)}
            className="bg-[#222222] hover:bg-[#333333]"
          >
            Add Brand
          </Button>
        </div>
        <BrandSelector onSelect={setSelectedBrandId} />
      </div>

      {selectedBrandId && (
        <div className="bg-[#111111] p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-6">Platform Integrations</h2>
          <div className="space-y-4">
            {platforms.map(platform => {
              const isConnected = connections.some(c => c.platform_type === platform.type)
              return (
                <div key={platform.type} className="flex items-center justify-between p-4 bg-[#222222] rounded-lg">
                  <div className="flex items-center gap-3">
                    <img src={platform.icon} alt={platform.name} className="w-8 h-8" />
                    <span>{platform.name}</span>
                  </div>
                  {isConnected ? (
                    <Button 
                      variant="destructive"
                      onClick={() => handleDisconnect(platform.type)}
                    >
                      Disconnect
                    </Button>
                  ) : (
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => handleConnect(platform.type)}
                    >
                      Connect
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <BrandDialog 
        open={showBrandDialog} 
        onOpenChange={setShowBrandDialog}
        onBrandCreate={async (brand) => {
          const { data, error } = await supabase
            .from('brands')
            .insert([{
              ...brand,
              user_id: userId
            }])
            .select()
            .single()
          
          if (!error && data) {
            setSelectedBrandId(data.id)
          }
          setShowBrandDialog(false)
        }}
      />
    </div>
  )
}
"use client"

import { useState, useEffect } from "react"
import BrandSelector from "@/components/BrandSelector"
import { BrandDialog } from "@/components/settings/BrandDialog"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from "@clerk/nextjs"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export default function SettingsPage() {
  const { userId } = useAuth()
  const [showBrandDialog, setShowBrandDialog] = useState(false)
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null)
  const [connections, setConnections] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null)

  const loadConnections = async () => {
    if (!selectedBrandId) return
    setLoading(true)
    
    try {
      const { data, error } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('brand_id', selectedBrandId)

      if (error) throw error
      setConnections(data || [])
    } catch (error) {
      toast.error('Failed to load platform connections')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConnections()
  }, [selectedBrandId])

  const handleConnect = async (platformType: string) => {
    if (platformType === 'shopify') {
      const storeUrl = prompt('Enter your Shopify store URL (e.g., my-store.myshopify.com):')
      if (!storeUrl) return

      try {
        // Redirect to our auth route first
        window.location.href = `/api/auth/shopify?` +
          `shop=${encodeURIComponent(storeUrl)}` +
          `&brandId=${selectedBrandId}`
      } catch (error) {
        console.error('Error connecting Shopify:', error)
        toast.error('Failed to connect to Shopify')
      }
    } else if (platformType === 'meta') {
      const { error } = await supabase
        .from('platform_connections')
        .insert([{
          brand_id: selectedBrandId,
          platform_type: 'meta',
          connected_at: new Date().toISOString()
        }])

      if (error) throw error
      toast.success('Successfully connected Meta Ads')
      await loadConnections()
    }
  }

  const handleDisconnect = async (platformType: string) => {
    if (!window.confirm(`Are you sure you want to disconnect ${platformType}?`)) {
      return
    }

    try {
      setConnectingPlatform(platformType)
      const { error } = await supabase
        .from('platform_connections')
        .delete()
        .match({ 
          brand_id: selectedBrandId,
          platform_type: platformType 
        })

      if (error) throw error
      toast.success(`Successfully disconnected ${platformType}`)
      await loadConnections()
    } catch (error) {
      toast.error(`Failed to disconnect ${platformType}`)
      console.error(error)
    } finally {
      setConnectingPlatform(null)
    }
  }

  // Platform config for easy maintenance
  const platforms = [
    {
      type: 'shopify',
      name: 'Shopify',
      icon: '/shopify-icon.png',
      description: 'Connect your Shopify store to sync orders and products'
    },
    {
      type: 'meta',
      name: 'Meta Ads',
      icon: '/meta-icon.png',
      description: 'Connect Meta Ads to track ad performance'
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
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {platforms.map(platform => (
                <div key={platform.type} className="flex items-center justify-between p-4 bg-[#222222] rounded-lg">
                  <div className="flex items-center gap-3">
                    <img src={platform.icon} alt={platform.name} className="w-8 h-8" />
                    <div>
                      <h3 className="font-medium">{platform.name}</h3>
                      <p className="text-sm text-gray-400">{platform.description}</p>
                    </div>
                  </div>
                  {connections.some(c => c.platform_type === platform.type) ? (
                    <Button 
                      variant="outline" 
                      className="bg-transparent text-red-500"
                      onClick={() => handleDisconnect(platform.type)}
                      disabled={connectingPlatform === platform.type}
                    >
                      {connectingPlatform === platform.type ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Disconnect'
                      )}
                    </Button>
                  ) : (
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => handleConnect(platform.type)}
                      disabled={connectingPlatform === platform.type}
                    >
                      {connectingPlatform === platform.type ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Connect'
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <BrandDialog 
        open={showBrandDialog} 
        onOpenChange={setShowBrandDialog}
        onBrandCreate={async (brand) => {
          try {
            const { data, error } = await supabase
              .from('brands')
              .insert([{
                ...brand,
                user_id: userId,
                created_at: new Date().toISOString()
              }])
              .select()
              .single()
            
            if (error) throw error
            if (data) {
              setSelectedBrandId(data.id)
              toast.success('Brand created successfully')
            }
          } catch (error) {
            toast.error('Failed to create brand')
            console.error(error)
          } finally {
            setShowBrandDialog(false)
          }
        }}
      />
    </div>
  )
}
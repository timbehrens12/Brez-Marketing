"use client"

import { useState, useEffect } from "react"
import { UserButton, useUser } from "@clerk/nextjs"
import BrandSelector from "@/components/BrandSelector"
import { BrandDialog } from "@/components/settings/BrandDialog"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabaseClient"
import { toast } from "sonner"
import { Loader2, Plus } from "lucide-react"
import { useBrandContext } from "@/lib/context/BrandContext"
import { Separator } from "@/components/ui/separator"

export default function SettingsPage() {
  const { user } = useUser()
  const [showBrandDialog, setShowBrandDialog] = useState(false)
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null)
  const [connections, setConnections] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null)
  const { refreshBrands } = useBrandContext()

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
        const backendUrl = 'https://api.brezmarketingdashboard.com'
        window.location.href = `${backendUrl}/shopify/auth?shop=${encodeURIComponent(storeUrl)}&brandId=${selectedBrandId}`
      } catch (error) {
        console.error('Error connecting Shopify:', error)
        toast.error('Failed to connect to Shopify')
      }
    } else if (platformType === 'meta') {
      try {
        // Redirect to Meta OAuth flow
        window.location.href = `/api/auth/meta?brandId=${selectedBrandId}`
      } catch (error) {
        console.error('Error connecting Meta:', error)
        toast.error('Failed to connect to Meta')
      }
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

  const handleBrandAdded = async () => {
    // Your existing brand creation logic
    // ...
    
    // After successful creation, refresh the brands list
    await refreshBrands()
  }

  return (
    <div className="container max-w-6xl mx-auto p-8 space-y-8">
      {/* User Section */}
      <div className="bg-[#111111] p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">Account Settings</h1>
            <p className="text-sm text-gray-400">
              Manage your account and connected platforms
            </p>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
        
        <Separator className="my-6 bg-[#222222]" />
        
        <div className="grid gap-4">
          <div className="space-y-2">
            <h2 className="text-sm font-medium">Email</h2>
            <p className="text-sm text-gray-400">{user?.emailAddresses[0].emailAddress}</p>
          </div>
          <div className="space-y-2">
            <h2 className="text-sm font-medium">Name</h2>
            <p className="text-sm text-gray-400">{user?.fullName || 'Not set'}</p>
          </div>
        </div>
      </div>

      {/* Brand Management Section */}
      <div className="bg-[#111111] p-6 rounded-lg">
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Brand Management</h2>
            <p className="text-sm text-gray-400">
              Select and manage your brands and their integrations
            </p>
          </div>
          <Button 
            onClick={() => setShowBrandDialog(true)}
            className="bg-[#222222] hover:bg-[#333333]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Brand
          </Button>
        </div>

        <div className="mb-8">
          <BrandSelector onSelect={setSelectedBrandId} />
        </div>

        <div className="space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-medium">Platform Integrations</h3>
            <p className="text-sm text-gray-400">
              Connect and manage your marketing platforms
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="grid gap-4">
              {platforms.map(platform => (
                <div key={platform.type} className="flex items-center justify-between p-4 bg-[#222222] rounded-lg">
                  <div className="flex items-center gap-3">
                    <img src={platform.icon} alt={platform.name} className="w-8 h-8" />
                    <div>
                      <h3 className="font-medium">{platform.name}</h3>
                      <p className="text-sm text-gray-400">
                        {connections.some(c => c.platform_type === platform.type) 
                          ? 'Connected and ready to use'
                          : platform.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {connections.some(c => c.platform_type === platform.type) ? (
                      <>
                        {platform.type === 'meta' && (
                          <Button
                            variant="outline"
                            className="bg-transparent text-white"
                            onClick={async () => {
                              try {
                                const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://brezmarketingdashboard.com'
                                const response = await fetch(`${baseUrl}/meta/insights?brandId=${selectedBrandId}`)
                                const data = await response.json()
                                console.log('Meta API Test Response:', data)
                                toast.success('Successfully fetched Meta Ads data!')
                              } catch (error) {
                                console.error('Meta API test failed:', error)
                                toast.error('Could not fetch Meta Ads data')
                              }
                            }}
                          >
                            Test
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          className="bg-transparent text-red-500"
                          onClick={() => handleDisconnect(platform.type)}
                          disabled={connectingPlatform === platform.type || !selectedBrandId}
                        >
                          {connectingPlatform === platform.type ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Disconnect'
                          )}
                        </Button>
                      </>
                    ) : (
                      <Button 
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => handleConnect(platform.type)}
                        disabled={connectingPlatform === platform.type || !selectedBrandId}
                      >
                        {connectingPlatform === platform.type ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Connect'
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BrandDialog 
        open={showBrandDialog} 
        onOpenChange={setShowBrandDialog}
        onBrandCreate={handleBrandAdded}
      />
    </div>
  )
}
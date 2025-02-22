"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MetaConnectButton } from "@/components/dashboard/platforms/MetaConnectButton"
import { StoreConnectButton } from "@/components/dashboard/platforms/StoreConnectButton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { BrandDialog } from "@/components/settings/BrandDialog"

interface BrandData {
  id: string
  name: string
  platform_connections: Array<{
    platform_type: string
    access_token: string
    store_url?: string
    metadata?: any
  }>
}

interface Brand {
  id: string
  name: string
  connections: {
    shopify?: {
      store_url: string
      access_token: string
    }
    meta?: {
      access_token: string
    }
  }
}

export function SettingsContent() {
  const { user } = useUser()
  const [selectedBrand, setSelectedBrand] = useState<string>("")
  const [isNewBrandDialogOpen, setIsNewBrandDialogOpen] = useState(false)
  const [brands, setBrands] = useState<Brand[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadBrands()
    }
  }, [user])

  const loadBrands = async () => {
    setIsLoading(true)
    const { data: brandsData, error } = await supabase
      .from('brands')
      .select(`
        id,
        name,
        platform_connections (
          platform_type,
          access_token,
          store_url,
          metadata
        )
      `)
      .eq('user_id', user?.id)

    if (!error && brandsData) {
      const formattedBrands = brandsData.map((brand: BrandData) => ({
        id: brand.id,
        name: brand.name,
        connections: brand.platform_connections.reduce((acc: Record<string, any>, conn: BrandData['platform_connections'][0]) => ({
          ...acc,
          [conn.platform_type]: {
            access_token: conn.access_token,
            store_url: conn.store_url,
            ...conn.metadata
          }
        }), {})
      }))
      setBrands(formattedBrands)
    }
    setIsLoading(false)
  }

  const handleBrandCreate = async (newBrand: { name: string }) => {
    const { data, error } = await supabase
      .from('brands')
      .insert([
        { name: newBrand.name, user_id: user?.id }
      ])
      .select()

    if (!error && data) {
      await loadBrands()
      setIsNewBrandDialogOpen(false)
    }
  }

  const handlePlatformConnect = async (platformType: 'shopify' | 'meta', connectionData: any) => {
    const { error } = await supabase
      .from('platform_connections')
      .insert([
        {
          brand_id: selectedBrand,
          platform_type: platformType,
          access_token: connectionData.access_token,
          store_url: connectionData.store_url,
          metadata: connectionData.metadata
        }
      ])

    if (!error) {
      await loadBrands()
    }
  }

  const selectedBrandData = brands.find(b => b.id === selectedBrand)

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <Button 
          onClick={() => setIsNewBrandDialogOpen(true)}
          className="bg-[#111111] text-white hover:bg-[#222222]"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Brand
        </Button>
      </div>

      <div className="flex items-center space-x-4">
        <Select value={selectedBrand} onValueChange={setSelectedBrand}>
          <SelectTrigger className="w-[300px] bg-[#111111] text-white border-[#222222]">
            <SelectValue placeholder="Select a brand to manage" />
          </SelectTrigger>
          <SelectContent className="bg-[#111111] border-[#222222]">
            {brands.map((brand) => (
              <SelectItem 
                key={brand.id} 
                value={brand.id}
                className="text-white hover:bg-[#222222]"
              >
                {brand.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedBrand && (
        <div className="grid gap-6">
          <Card className="bg-[#111111] border-[#222222]">
            <CardHeader>
              <CardTitle className="text-white">Platform Integrations</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="flex items-center justify-between p-4 border border-[#222222] rounded-lg">
                <div className="flex items-center space-x-3">
                  <img
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-Di8NeCzywloJqM3PWXj5VGVChVgmxi.png"
                    alt="Shopify"
                    className="h-8 w-8"
                  />
                  <div>
                    <h3 className="text-white font-medium">Shopify</h3>
                    <p className="text-sm text-gray-400">
                      {selectedBrandData?.connections.shopify 
                        ? `Connected to ${selectedBrandData.connections.shopify.store_url}`
                        : 'Connect your Shopify store'}
                    </p>
                  </div>
                </div>
                <StoreConnectButton 
                  onConnect={(data) => handlePlatformConnect('shopify', data)}
                  isConnected={!!selectedBrandData?.connections.shopify}
                />
              </div>

              <div className="flex items-center justify-between p-4 border border-[#222222] rounded-lg">
                <div className="flex items-center space-x-3">
                  <img
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-xNnLSFG1hEPttp3zbiVUSkeeKN3EXY.png"
                    alt="Meta"
                    className="h-8 w-8"
                  />
                  <div>
                    <h3 className="text-white font-medium">Meta Ads</h3>
                    <p className="text-sm text-gray-400">
                      {selectedBrandData?.connections.meta 
                        ? 'Connected to Meta Ads'
                        : 'Connect your Meta Ads account'}
                    </p>
                  </div>
                </div>
                <MetaConnectButton 
                  onConnect={(data) => handlePlatformConnect('meta', data)}
                  isConnected={!!selectedBrandData?.connections.meta}
                  brandId={selectedBrandData?.id || ''}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <BrandDialog 
        open={isNewBrandDialogOpen} 
        onOpenChange={setIsNewBrandDialogOpen}
        onBrandCreate={handleBrandCreate}
      />
    </div>
  )
}
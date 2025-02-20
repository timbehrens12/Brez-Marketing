"use client"

import { useUser } from "@clerk/nextjs"
import { useState, useEffect } from "react"
import { supabase } from "@/utils/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { BrandDialog } from "@/components/settings/BrandDialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StoreConnectButton } from "@/components/dashboard/platforms/StoreConnectButton"
import { MetaConnectButton } from "@/components/dashboard/platforms/MetaConnectButton"

interface Brand {
  id: string
  name: string
  connections?: {
    shopify?: any
    meta?: any
  }
}

interface PlatformConnection {
  platform_type: string
  access_token: string
  store_url?: string
  metadata?: any
}

export default function SettingsPage() {
  const { user } = useUser()
  const [testMessage, setTestMessage] = useState("")
  const [brands, setBrands] = useState<Brand[]>([])
  const [selectedBrand, setSelectedBrand] = useState<string>("")
  const [isNewBrandDialogOpen, setIsNewBrandDialogOpen] = useState(false)

  useEffect(() => {
    if (user) {
      testConnection()
      loadBrands()
    }
  }, [user])

  const testConnection = async () => {
    const { data, error } = await supabase
      .from('brands')
      .select('name')
      .limit(1)

    if (error) {
      setTestMessage("Database connection error: " + error.message)
    } else {
      setTestMessage("Database connected successfully!")
    }
  }

  const loadBrands = async () => {
    const { data, error } = await supabase
      .from('brands')
      .select(`
        *,
        platform_connections (
          platform_type,
          access_token,
          store_url,
          metadata
        )
      `)
      .eq('user_id', user?.id)

    if (!error && data) {
      setBrands(data.map(brand => ({
        ...brand,
        connections: brand.platform_connections.reduce((acc: Record<string, any>, conn: PlatformConnection) => ({
          ...acc,
          [conn.platform_type]: conn
        }), {})
      })))
    }
  }

  const handlePlatformConnect = async (platformType: 'shopify' | 'meta', connectionData: any) => {
    if (!selectedBrand) return

    console.log('Saving connection:', { platformType, connectionData, selectedBrand })

    const { error } = await supabase
      .from('platform_connections')
      .insert([
        {
          brand_id: selectedBrand,
          platform_type: platformType,
          store_url: connectionData.store_url,
          access_token: connectionData.access_token
        }
      ])

    console.log('Supabase save result:', { error })

    if (!error) {
      loadBrands()
    }
  }

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

      <div className="grid gap-6">
        {/* Connection Status */}
        <Card className="bg-[#111111] border-[#222222] text-white">
          <CardHeader>
            <CardTitle>Connection Status</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{testMessage}</p>
            <p>Logged in as: {user?.emailAddresses[0].emailAddress}</p>
          </CardContent>
        </Card>

        {/* Brand Management */}
        <Card className="bg-[#111111] border-[#222222] text-white">
          <CardHeader>
            <CardTitle>Brand Management</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedBrand} onValueChange={setSelectedBrand}>
              <SelectTrigger className="w-full mb-4">
                <SelectValue placeholder="Select a brand to manage" />
              </SelectTrigger>
              <SelectContent>
                {brands.map((brand) => (
                  <SelectItem key={brand.id} value={brand.id}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedBrand && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-[#222222] rounded-lg">
                  <div className="flex items-center space-x-3">
                    <img
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-Di8NeCzywloJqM3PWXj5VGVChVgmxi.png"
                      alt="Shopify"
                      className="h-8 w-8"
                    />
                    <div>
                      <h3 className="font-medium">Shopify</h3>
                      <p className="text-sm text-gray-400">Connect your Shopify store</p>
                    </div>
                  </div>
                  <StoreConnectButton 
                    onConnect={(data) => handlePlatformConnect('shopify', data)}
                    isConnected={!!brands.find(b => b.id === selectedBrand)?.connections?.shopify}
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
                      <h3 className="font-medium">Meta Ads</h3>
                      <p className="text-sm text-gray-400">Connect your Meta Ads account</p>
                    </div>
                  </div>
                  <MetaConnectButton 
                    onConnect={(data) => handlePlatformConnect('meta', data)}
                    isConnected={!!brands.find(b => b.id === selectedBrand)?.connections?.meta}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <BrandDialog 
        open={isNewBrandDialogOpen} 
        onOpenChange={setIsNewBrandDialogOpen}
        onBrandCreate={async (brand) => {
          const { data, error } = await supabase
            .from('brands')
            .insert([
              { name: brand.name, user_id: user?.id }
            ])
            .select()

          if (!error && data) {
            setBrands([...brands, data[0]])
            setIsNewBrandDialogOpen(false)
          }
        }}
      />
    </div>
  )
}
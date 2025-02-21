"use client"

import { useUser } from "@clerk/nextjs"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { BrandDialog } from "@/components/settings/BrandDialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StoreConnectButton } from "@/components/dashboard/platforms/StoreConnectButton"
import { MetaConnectButton } from "@/components/dashboard/platforms/MetaConnectButton"
import { PlatformConnections } from "@/components/settings/PlatformConnections"
import BrandSelector from "@/components/BrandSelector"

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
  const [showBrandDialog, setShowBrandDialog] = useState(false)

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
    <div className="p-8 max-w-4xl mx-auto">
      {/* Brands Section */}
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
        <BrandSelector />
      </div>

      {/* Integrations Section */}
      <div className="bg-[#111111] p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-6">Platform Integrations</h2>
        <div className="space-y-4">
          {/* Shopify */}
          <div className="flex items-center justify-between p-4 bg-[#222222] rounded-lg">
            <div className="flex items-center gap-3">
              <img src="/shopify-icon.png" alt="Shopify" className="w-8 h-8" />
              <span>Shopify</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="bg-transparent">Manage</Button>
              <Button variant="outline" className="bg-transparent text-red-500">Disconnect</Button>
            </div>
          </div>

          {/* Meta Ads */}
          <div className="flex items-center justify-between p-4 bg-[#222222] rounded-lg">
            <div className="flex items-center gap-3">
              <img src="/meta-icon.png" alt="Meta" className="w-8 h-8" />
              <span>Meta Ads</span>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700">Connect</Button>
          </div>

          {/* Google Ads */}
          <div className="flex items-center justify-between p-4 bg-[#222222] rounded-lg">
            <div className="flex items-center gap-3">
              <img src="/google-ads-icon.png" alt="Google Ads" className="w-8 h-8" />
              <span>Google Ads</span>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700">Connect</Button>
          </div>

          {/* TikTok */}
          <div className="flex items-center justify-between p-4 bg-[#222222] rounded-lg">
            <div className="flex items-center gap-3">
              <img src="/tiktok-icon.png" alt="TikTok" className="w-8 h-8" />
              <span>TikTok</span>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700">Connect</Button>
          </div>
        </div>
      </div>

      <BrandDialog 
        open={showBrandDialog} 
        onOpenChange={setShowBrandDialog}
        onBrandCreate={(brand) => {
          console.log('Created brand:', brand)
          setShowBrandDialog(false)
        }}
      />
    </div>
  )
}
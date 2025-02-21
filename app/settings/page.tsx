"use client"

import { useState, useEffect } from "react"
import BrandSelector from "@/components/BrandSelector"
import { BrandDialog } from "@/components/settings/BrandDialog"
import { Button } from "@/components/ui/button"
import { PlatformCard } from "@/components/settings/PlatformCard"
import { supabase } from "@/lib/supabaseClient"

export default function SettingsPage() {
  const [showBrandDialog, setShowBrandDialog] = useState(false)
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null)
  const [connections, setConnections] = useState<any[]>([])

  useEffect(() => {
    const loadConnections = async () => {
      if (!selectedBrandId) return
      
      const { data } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('brand_id', selectedBrandId)
      
      setConnections(data || [])
    }

    loadConnections()
  }, [selectedBrandId])

  const platforms = [
    {
      name: 'Shopify',
      icon: '/shopify-icon.png',
      type: 'shopify' as const
    },
    {
      name: 'Meta Ads',
      icon: '/meta-icon.png',
      type: 'meta' as const
    },
    {
      name: 'Google Ads',
      icon: '/google-ads-icon.png',
      type: 'google' as const
    },
    {
      name: 'TikTok',
      icon: '/tiktok-icon.png',
      type: 'tiktok' as const
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
              const connection = connections.find(c => c.platform_type === platform.type)
              return (
                <PlatformCard
                  key={platform.type}
                  name={platform.name}
                  icon={platform.icon}
                  platformType={platform.type}
                  brandId={selectedBrandId}
                  isConnected={!!connection}
                  connectionDetails={connection}
                />
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
            .insert([brand])
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
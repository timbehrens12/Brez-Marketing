"use client"

import { useState } from "react"
import BrandSelector from "@/components/BrandSelector"
import { BrandDialog } from "@/components/settings/BrandDialog"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from "@clerk/nextjs"

export default function SettingsPage() {
  const { userId } = useAuth()
  const [showBrandDialog, setShowBrandDialog] = useState(false)
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null)

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
            {platforms.map(platform => (
              <div key={platform.type} className="flex items-center justify-between p-4 bg-[#222222] rounded-lg">
                <div className="flex items-center gap-3">
                  <img src={platform.icon} alt={platform.name} className="w-8 h-8" />
                  <span>{platform.name}</span>
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  Connect
                </Button>
              </div>
            ))}
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
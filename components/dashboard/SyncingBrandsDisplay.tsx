"use client"

import { BarChart3 } from 'lucide-react'
import { SyncStatusIndicator } from '@/components/ui/SyncStatusIndicator'
import { useSyncStatus } from '@/lib/hooks/useSyncStatus'

interface Brand {
  id: string
  name: string
}

interface SyncingBrandsDisplayProps {
  brands: Brand[]
}

export function SyncingBrandsDisplay({ brands }: SyncingBrandsDisplayProps) {
  // Get sync status for each brand
  const brandsWithSync = brands.map(brand => ({
    ...brand,
    syncStatus: useSyncStatus(brand.id)
  }))

  const syncingBrands = brandsWithSync.filter(brand => brand.syncStatus.shouldHideData)

  if (syncingBrands.length > 0) {
    return (
      <div className="space-y-6">
        <div>
          <BarChart3 className="h-16 w-16 text-blue-400 mx-auto mb-4" />
          <h3 className="font-medium text-white mb-2">Loading Brand Data</h3>
          <p className="text-[#9ca3af] text-sm mb-6">
            Syncing historical data for {syncingBrands.length} brand{syncingBrands.length > 1 ? 's' : ''}. 
            This may take a few minutes.
          </p>
        </div>
        
        <div className="space-y-3 max-w-lg mx-auto">
          {syncingBrands.map(brand => (
            <div key={brand.id} className="flex items-center gap-3 p-3 bg-[#1a1a1a] rounded-lg border border-[#333]">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#333] to-[#222] flex items-center justify-center text-xs font-medium text-white">
                {brand.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-white">{brand.name}</div>
                <SyncStatusIndicator brandId={brand.id} className="mt-1" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  } else {
    return (
      <div>
        <BarChart3 className="h-16 w-16 text-gray-600 mx-auto mb-4" />
        <h3 className="font-medium text-white mb-2">No Brands with Ad Platforms</h3>
        <p className="text-[#9ca3af] text-sm">Connect Meta, Google, or TikTok to brands to see performance insights.</p>
      </div>
    )
  }
}

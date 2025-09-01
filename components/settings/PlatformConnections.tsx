"use client"

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'

export function PlatformConnections({ brandId }: { brandId: string }) {
  const [connections, setConnections] = useState<any[]>([])

  useEffect(() => {
    let cancelled = false;
    
    const loadConnections = async () => {
      if (cancelled) return;
      
      const supabase = getSupabaseClient()
      const { data } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('brand_id', brandId)
      
      if (!cancelled) {
        setConnections(data || [])
      }
    }

    loadConnections()
    
    return () => {
      cancelled = true;
    }
  }, [brandId])

  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold mb-2">Connected Platforms</h3>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">Shopify:</span>
          {connections.some(c => c.platform_type === 'shopify') ? (
            <span className="text-green-500">Connected ✓ (Auto-syncing all historical data)</span>
          ) : (
            <span className="text-gray-400">Not connected</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">Meta Ads:</span>
          {connections.some(c => c.platform_type === 'meta') ? (
            <span className="text-green-500">Connected ✓</span>
          ) : (
            <span className="text-gray-400">Not connected</span>
          )}
        </div>
      </div>
    </div>
  )
} 
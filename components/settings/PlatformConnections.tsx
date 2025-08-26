"use client"

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Calendar, RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function PlatformConnections({ brandId }: { brandId: string }) {
  const [connections, setConnections] = useState<any[]>([])
  const [isBackfilling, setIsBackfilling] = useState(false)
  const { toast } = useToast()

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

  const handleShopifyBackfill = async () => {
    setIsBackfilling(true)
    
    try {
      toast({
        title: "Starting Complete Historical Sync",
        description: "Syncing ALL historical data from Shopify. This may take a few minutes...",
      })
      
      const response = await fetch('/api/shopify/historical-backfill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          brandId,
          forceRefresh: true // Force complete refresh to ensure all data is synced
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        const totalOrders = result.results?.reduce((sum: number, r: any) => sum + (r.ordersAdded || 0), 0) || 0
        
        toast({
          title: "Complete Sync Finished!",
          description: `Successfully synced ${totalOrders} orders from Shopify. All historical data is now up to date!`,
        })
        
        // Trigger widget refresh
        window.dispatchEvent(new CustomEvent('shopify-sync-completed'))
        
      } else {
        throw new Error(result.error || 'Unknown error')
      }
      
    } catch (error) {
      console.error('Backfill error:', error)
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Failed to complete historical sync",
        variant: "destructive"
      })
    } finally {
      setIsBackfilling(false)
    }
  }

  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold mb-2">Connected Platforms</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium">Shopify:</span>
            {connections.some(c => c.platform_type === 'shopify') ? (
              <span className="text-green-500">Connected ✓</span>
            ) : (
              <span className="text-gray-400">Not connected</span>
            )}
          </div>
          
          {connections.some(c => c.platform_type === 'shopify') && (
            <Button
              onClick={handleShopifyBackfill}
              disabled={isBackfilling}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              {isBackfilling ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Calendar className="h-4 w-4" />
              )}
              {isBackfilling ? 'Syncing All Data...' : 'Sync All Historical Data'}
            </Button>
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
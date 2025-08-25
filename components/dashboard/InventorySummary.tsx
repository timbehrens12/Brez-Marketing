"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MetricCard } from "@/components/metrics/MetricCard"
import { Package, AlertTriangle, CheckCircle, BarChart2, Layers } from "lucide-react"
import { InventorySummary as InventorySummaryType, ShopifyInventoryItem } from '@/types/shopify-inventory'
import { toast } from "sonner"
import { ScrollArea } from "@/components/ui/scroll-area"

interface InventorySummaryProps {
  brandId: string
  isLoading?: boolean
  isRefreshingData?: boolean
}

export function InventorySummary({ 
  brandId, 
  isLoading = false, 
  isRefreshingData = false 
}: InventorySummaryProps) {
  const [inventorySummary, setInventorySummary] = useState<InventorySummaryType | null>(null)
  const [inventoryItems, setInventoryItems] = useState<ShopifyInventoryItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [initialLoadComplete, setInitialLoadComplete] = useState<boolean>(false)
  const [retryCount, setRetryCount] = useState<number>(0)
  const MAX_RETRIES = 3

  const fetchInventoryData = async (forceRefresh = false) => {
    if (!brandId) {
      // console.log('No brandId provided to InventorySummary component')
      return
    }

    try {
      // console.log(`Fetching inventory data for brandId: ${brandId}${forceRefresh ? ' (forced refresh)' : ''}`)
      setLoading(true)
      
      // Add cache-busting parameter and refresh flag if needed
      const refreshParam = forceRefresh ? '&refresh=true' : ''
      const cacheBuster = `&t=${new Date().getTime()}`
      const response = await fetch(`/api/shopify/inventory?brandId=${brandId}${refreshParam}${cacheBuster}`)
      
      const responseText = await response.text()
      // console.log(`Inventory API response: ${responseText.substring(0, 200)}...`)
      
      let data
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error('Error parsing inventory response:', parseError)
        throw new Error(`Failed to parse inventory response: ${responseText.substring(0, 100)}...`)
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch inventory data: ${data.error || response.statusText}`)
      }
      
      // Check if we got empty data after a reconnection (might need retry)
      const isEmpty = data.items?.length === 0 && data.summary?.totalProducts === 0
      if (isEmpty && forceRefresh && retryCount < MAX_RETRIES) {
        // console.log(`Received empty inventory data on attempt ${retryCount + 1}, scheduling retry...`)
        setRetryCount(prev => prev + 1)
        
        // Schedule a retry with exponential backoff
        setTimeout(() => {
          // console.log(`Retrying inventory fetch (attempt ${retryCount + 1} of ${MAX_RETRIES})`)
          fetchInventoryData(true)
        }, Math.pow(2, retryCount) * 1000) // 1s, 2s, 4s backoff
        
        // Don't update state yet, wait for retry
        setLoading(false)
        return
      }
      
      // Either got data or exhausted retries, update state
      // console.log('Inventory data fetched successfully:', data)
      setInventorySummary(data.summary)
      setInventoryItems(data.items || [])
      setError(null)
      setInitialLoadComplete(true)
      setRetryCount(0) // Reset retry counter on success
    } catch (err) {
      console.error('Error fetching inventory data:', err)
      
      // Implement retry logic for errors too
      if (retryCount < MAX_RETRIES) {
        // console.log(`Fetch error on attempt ${retryCount + 1}, scheduling retry...`)
        setRetryCount(prev => prev + 1)
        
        // Schedule a retry with exponential backoff
        setTimeout(() => {
          // console.log(`Retrying inventory fetch after error (attempt ${retryCount + 1} of ${MAX_RETRIES})`)
          fetchInventoryData(forceRefresh)
        }, Math.pow(2, retryCount) * 1000) // 1s, 2s, 4s backoff
      } else {
        // Exhausted retries, show error
      setError('Failed to load inventory data')
      setInventorySummary(null)
      setInventoryItems([])
      toast.error(`Error loading inventory data: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    } finally {
      setLoading(false)
    }
  }

  // Initial data load when component mounts or brandId changes
  useEffect(() => {
    fetchInventoryData()
  }, [brandId])
  
  // Handle refresh requests
  useEffect(() => {
    if (isRefreshingData && brandId) {
      // console.log('Refreshing inventory data due to isRefreshingData change')
      fetchInventoryData(true)
    }
  }, [brandId, isRefreshingData])

  // Force a data load if we haven't loaded data yet and we have a brandId
  useEffect(() => {
    if (!initialLoadComplete && brandId && !loading) {
      // console.log('Forcing initial inventory data load')
      fetchInventoryData()
    }
  }, [initialLoadComplete, brandId, loading])

  // Listen for custom refresh event
  useEffect(() => {
    const handleRefreshEvent = (event: CustomEvent) => {
      if (event.detail?.brandId === brandId) {
        // console.log('Received refreshInventory event, refreshing inventory data')
        fetchInventoryData(true)
      }
    }

    window.addEventListener('refreshInventory', handleRefreshEvent as EventListener)
    
    // Also listen for global refresh events
    window.addEventListener('force-shopify-refresh', handleRefreshEvent as EventListener)
    window.addEventListener('global-refresh-all', handleRefreshEvent as EventListener)
    window.addEventListener('refresh-all-widgets', handleRefreshEvent as EventListener)
    
    return () => {
      window.removeEventListener('refreshInventory', handleRefreshEvent as EventListener)
      window.removeEventListener('force-shopify-refresh', handleRefreshEvent as EventListener)
      window.removeEventListener('global-refresh-all', handleRefreshEvent as EventListener)
      window.removeEventListener('refresh-all-widgets', handleRefreshEvent as EventListener)
    }
  }, [brandId])

  const isDataLoading = isLoading || loading

  // Group inventory items by product and sum quantities
  const productInventory = inventoryItems.reduce((acc, item) => {
    const existingProduct = acc.find(p => p.product_id === item.product_id);
    if (existingProduct) {
      existingProduct.inventory_quantity += item.inventory_quantity;
    } else {
      acc.push({
        product_id: item.product_id,
        product_title: item.product_title,
        inventory_quantity: item.inventory_quantity
      });
    }
    return acc;
  }, [] as Array<{product_id: string, product_title: string, inventory_quantity: number}>);

  // Sort by inventory quantity (highest first)
  const sortedProducts = [...productInventory].sort((a, b) => 
    b.inventory_quantity - a.inventory_quantity
  );

  return (
    <div className="space-y-4">
      {error && !isDataLoading && (
        <div className="bg-red-900/30 border border-red-700 p-4 rounded-md text-red-200 mb-4">
          {error}
        </div>
      )}
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Inventory"
          value={inventorySummary?.totalInventory || 0}
          change={0}
          data={[]}
          loading={isDataLoading}
          refreshing={isRefreshingData}
          platform="shopify"
          hidePercentageChange={true}
          brandId={brandId}
          className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border-[#333] hover:border-[#444] transition-all duration-200"
        />
        
        {/* Product Inventory Levels Widget */}
        <Card className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border-[#333] hover:border-[#444] transition-all duration-200 shadow-lg overflow-hidden">
          <CardHeader className="py-1.5 px-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
                <span>Product Inventory</span>
                <Layers className="h-4 w-4" />
              </CardTitle>
              {isDataLoading && <Package className="h-4 w-4 animate-spin text-gray-500" />}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isDataLoading ? (
              <div className="px-4 py-2 h-[140px]">
                {/* Skeleton loading lines */}
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="flex justify-between items-center py-1 border-b border-gray-800 last:border-0">
                    <div className="w-24 h-3 bg-gray-800 rounded animate-pulse"></div>
                    <div className="w-8 h-3 bg-gray-800/50 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            ) : sortedProducts.length === 0 ? (
              <div className="flex items-center justify-center h-[140px] text-gray-400 text-sm bg-transparent">
                No inventory data available
              </div>
            ) : (
              <ScrollArea className="h-[140px] bg-transparent">
                <div className="px-4 py-2">
                  {sortedProducts.map((product, index) => (
                    <div key={product.product_id} className="flex justify-between items-center py-1 text-xs border-b border-gray-800 last:border-0">
                      <div className="truncate pr-2 text-gray-300" style={{ maxWidth: '70%' }}>
                        {product.product_title}
                      </div>
                      <div className="font-medium text-emerald-500">
                        {product.inventory_quantity}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
        
        <MetricCard
          title="Out of Stock"
          value={inventorySummary?.outOfStockItems || 0}
          change={0}
          data={[]}
          loading={isDataLoading}
          refreshing={isRefreshingData}
          platform="shopify"
          hidePercentageChange={true}
          brandId={brandId}
          className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border-[#333] hover:border-[#444] transition-all duration-200"
        />
        
        <MetricCard
          title="Low Stock"
          value={inventorySummary?.lowStockItems || 0}
          change={0}
          data={[]}
          loading={isDataLoading}
          refreshing={isRefreshingData}
          platform="shopify"
          hidePercentageChange={true}
          brandId={brandId}
          className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border-[#333] hover:border-[#444] transition-all duration-200"
        />
      </div>
    </div>
  )
}
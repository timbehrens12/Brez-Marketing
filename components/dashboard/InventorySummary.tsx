"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MetricCard } from "@/components/metrics/MetricCard"
import { Package, AlertTriangle, CheckCircle, BarChart2, Layers } from "lucide-react"
import Image from "next/image"
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

  const fetchInventoryData = async (forceRefresh = false) => {
    if (!brandId) {
      console.log('No brandId provided to InventorySummary component')
      return
    }

    try {
      console.log(`Fetching inventory data for brandId: ${brandId}${forceRefresh ? ' (forced refresh)' : ''}`)
      setLoading(true)
      
      // Add cache-busting parameter and refresh flag if needed
      const refreshParam = forceRefresh ? '&refresh=true' : ''
      const cacheBuster = `&t=${new Date().getTime()}`
      const response = await fetch(`/api/shopify/inventory?brandId=${brandId}${refreshParam}${cacheBuster}`)
      
      const responseText = await response.text()
      console.log(`Inventory API response: ${responseText.substring(0, 200)}...`)
      
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
      
      console.log('Inventory data fetched successfully:', data)
      setInventorySummary(data.summary)
      setInventoryItems(data.items || [])
      setError(null)
      setInitialLoadComplete(true)
    } catch (err) {
      console.error('Error fetching inventory data:', err)
      setError('Failed to load inventory data')
      setInventorySummary(null)
      setInventoryItems([])
      toast.error(`Error loading inventory data: ${err instanceof Error ? err.message : 'Unknown error'}`)
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
      console.log('Refreshing inventory data due to isRefreshingData change')
      fetchInventoryData(true)
    }
  }, [brandId, isRefreshingData])

  // Force a data load if we haven't loaded data yet and we have a brandId
  useEffect(() => {
    if (!initialLoadComplete && brandId && !loading) {
      console.log('Forcing initial inventory data load')
      fetchInventoryData()
    }
  }, [initialLoadComplete, brandId, loading])

  // Listen for custom refresh event
  useEffect(() => {
    const handleRefreshEvent = (event: CustomEvent) => {
      if (event.detail?.brandId === brandId) {
        console.log('Received refreshInventory event, refreshing inventory data')
        fetchInventoryData(true)
      }
    }

    window.addEventListener('refreshInventory', handleRefreshEvent as EventListener)
    
    return () => {
      window.removeEventListener('refreshInventory', handleRefreshEvent as EventListener)
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
          title={
            <div className="flex items-center gap-2">
              <div className="relative w-4 h-4">
                <Image 
                  src="https://i.imgur.com/cnCcupx.png" 
                  alt="Shopify logo" 
                  width={16} 
                  height={16} 
                  className="object-contain"
                />
              </div>
              <span>Total Inventory</span>
              <Package className="h-4 w-4" />
            </div>
          }
          value={inventorySummary?.totalInventory || 0}
          change={0}
          data={[]}
          loading={isDataLoading}
          refreshing={isRefreshingData}
          platform="shopify"
          hidePercentageChange={true}
          brandId={brandId}
        />
        
        {/* Product Inventory Levels Widget */}
        <Card className="bg-[#1a1a1a] border-[#333] shadow-lg overflow-hidden">
          <CardHeader className="py-2 px-4">
            <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
              <div className="relative w-4 h-4">
                <Image 
                  src="https://i.imgur.com/cnCcupx.png" 
                  alt="Shopify logo" 
                  width={16} 
                  height={16} 
                  className="object-contain"
                />
              </div>
              <span>Product Inventory</span>
              <Layers className="h-4 w-4" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isDataLoading ? (
              <div className="flex items-center justify-center h-[120px] bg-[#1a1a1a]">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-gray-400"></div>
              </div>
            ) : sortedProducts.length === 0 ? (
              <div className="flex items-center justify-center h-[120px] text-gray-400 text-sm bg-[#1a1a1a]">
                No inventory data available
              </div>
            ) : (
              <ScrollArea className="h-[120px] bg-[#1a1a1a]">
                <div className="px-4 py-2">
                  {sortedProducts.slice(0, 8).map((product, index) => (
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
          title={
            <div className="flex items-center gap-2">
              <div className="relative w-4 h-4">
                <Image 
                  src="https://i.imgur.com/cnCcupx.png" 
                  alt="Shopify logo" 
                  width={16} 
                  height={16} 
                  className="object-contain"
                />
              </div>
              <span>Out of Stock</span>
              <AlertTriangle className="h-4 w-4" />
            </div>
          }
          value={inventorySummary?.outOfStockItems || 0}
          change={0}
          data={[]}
          loading={isDataLoading}
          refreshing={isRefreshingData}
          platform="shopify"
          hidePercentageChange={true}
          brandId={brandId}
        />
        
        <MetricCard
          title={
            <div className="flex items-center gap-2">
              <div className="relative w-4 h-4">
                <Image 
                  src="https://i.imgur.com/cnCcupx.png" 
                  alt="Shopify logo" 
                  width={16} 
                  height={16} 
                  className="object-contain"
                />
              </div>
              <span>Low Stock</span>
              <BarChart2 className="h-4 w-4" />
            </div>
          }
          value={inventorySummary?.lowStockItems || 0}
          change={0}
          data={[]}
          loading={isDataLoading}
          refreshing={isRefreshingData}
          platform="shopify"
          hidePercentageChange={true}
          brandId={brandId}
        />
      </div>
    </div>
  )
}
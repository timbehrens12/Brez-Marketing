"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MetricCard } from "@/components/metrics/MetricCard"
import { Package, AlertTriangle, CheckCircle, BarChart2 } from "lucide-react"
import Image from "next/image"
import { InventorySummary as InventorySummaryType } from '@/types/shopify-inventory'

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
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    if (!brandId) return

    const fetchInventoryData = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/shopify/inventory?brandId=${brandId}`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch inventory data: ${response.statusText}`)
        }
        
        const data = await response.json()
        setInventorySummary(data.summary)
        setError(null)
      } catch (err) {
        console.error('Error fetching inventory data:', err)
        setError('Failed to load inventory data')
        setInventorySummary(null)
      } finally {
        setLoading(false)
      }
    }

    fetchInventoryData()
  }, [brandId, isRefreshingData])

  const isDataLoading = isLoading || loading

  return (
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
            <span>Low Stock Items</span>
            <AlertTriangle className="h-4 w-4" />
          </div>
        }
        value={inventorySummary?.lowStockItems || 0}
        change={0}
        data={[]}
        loading={isDataLoading}
        refreshing={isRefreshingData}
        platform="shopify"
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
            <span>Total Products</span>
            <BarChart2 className="h-4 w-4" />
          </div>
        }
        value={inventorySummary?.totalProducts || 0}
        change={0}
        data={[]}
        loading={isDataLoading}
        refreshing={isRefreshingData}
        platform="shopify"
      />
    </div>
  )
} 
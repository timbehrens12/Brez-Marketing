"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MetricCard } from "@/components/metrics/MetricCard"
import { Package, AlertTriangle, CheckCircle, BarChart2 } from "lucide-react"
import Image from "next/image"
import { InventorySummary as InventorySummaryType } from '@/types/shopify-inventory'
import { toast } from "sonner"

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
    if (!brandId) {
      console.log('No brandId provided to InventorySummary component')
      return
    }

    const fetchInventoryData = async () => {
      try {
        console.log(`Fetching inventory data for brandId: ${brandId}`)
        setLoading(true)
        const response = await fetch(`/api/shopify/inventory?brandId=${brandId}`)
        
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
        setError(null)
      } catch (err) {
        console.error('Error fetching inventory data:', err)
        setError('Failed to load inventory data')
        setInventorySummary(null)
        toast.error(`Error loading inventory data: ${err instanceof Error ? err.message : 'Unknown error'}`)
      } finally {
        setLoading(false)
      }
    }

    fetchInventoryData()
  }, [brandId])
  
  useEffect(() => {
    if (isRefreshingData && brandId) {
      console.log('Refreshing inventory data due to isRefreshingData change')
      const fetchInventoryData = async () => {
        try {
          console.log(`Refreshing inventory data for brandId: ${brandId}`)
          const response = await fetch(`/api/shopify/inventory?brandId=${brandId}&refresh=true`)
          
          if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Failed to fetch inventory data: ${errorText}`)
          }
          
          const data = await response.json()
          console.log('Refreshed inventory data fetched successfully:', data)
          setInventorySummary(data.summary)
          setError(null)
        } catch (err) {
          console.error('Error refreshing inventory data:', err)
          // Don't show toast on refresh errors to avoid spamming the user
        }
      }
      
      fetchInventoryData()
    }
  }, [brandId, isRefreshingData])

  const isDataLoading = isLoading || loading

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
    </div>
  )
} 
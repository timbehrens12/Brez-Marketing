"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { MapPin } from "lucide-react"
import { useDataRefresh } from '@/lib/hooks/useDataRefresh'

interface SalesByRegionProps {
  brandId: string
  isLoading?: boolean
  isRefreshingData?: boolean
  dateRange?: {
    from: Date
    to: Date
  }
}

interface RegionData {
  city: string
  country: string
  totalSales: number
  orderCount: number
}

export function SalesByRegion({ 
  brandId, 
  isLoading = false, 
  isRefreshingData = false,
  dateRange
}: SalesByRegionProps) {
  const [regions, setRegions] = useState<RegionData[]>([])
  const [loading, setLoading] = useState<boolean>(isLoading)
  const [error, setError] = useState<string | null>(null)

  const fetchRegionData = async (forceRefresh = false) => {
    if (!brandId) return
    
    try {
      setLoading(true)
      setError(null)
      
      // Prepare date parameters
      let params = new URLSearchParams()
      params.append('brandId', brandId)
      
      if (dateRange?.from) {
        params.append('startDate', dateRange.from.toISOString())
      }
      
      if (dateRange?.to) {
        params.append('endDate', dateRange.to.toISOString())
      }
      
      if (forceRefresh) {
        params.append('refresh', 'true')
      }
      
      // Fetch data from API
      console.log(`Fetching sales by region data: /api/shopify/sales-by-region?${params.toString()}`)
      const response = await fetch(`/api/shopify/sales-by-region?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Sales by region API response:', data)
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      setRegions(data.regions || [])
    } catch (err) {
      console.error('Error fetching region data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setRegions([])
    } finally {
      setLoading(false)
    }
  }
  
  // Initial data fetch
  useEffect(() => {
    fetchRegionData()
  }, [brandId, dateRange?.from, dateRange?.to])
  
  // Set up periodic refresh
  useDataRefresh(fetchRegionData, 300, [brandId]) // Refresh every 5 minutes
  
  // Handle refresh event
  useEffect(() => {
    const handleRefreshEvent = (event: CustomEvent) => {
      if (event.detail?.brandId === brandId || !event.detail?.brandId) {
        fetchRegionData(true)
      }
    }
    
    window.addEventListener('refresh-dashboard' as any, handleRefreshEvent as EventListener)
    
    return () => {
      window.removeEventListener('refresh-dashboard' as any, handleRefreshEvent as EventListener)
    }
  }, [brandId])

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value)
  }

  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-0.5">
          <CardTitle className="text-base font-medium">Sales by Region</CardTitle>
          <CardDescription>Top regions by sales volume</CardDescription>
        </div>
        <MapPin className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading || isLoading || isRefreshingData ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : error ? (
          <div className="text-center py-4 text-muted-foreground">
            <p>Error loading region data: {error}</p>
          </div>
        ) : regions.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <p>No regional sales data available</p>
          </div>
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>City</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regions.map((region, index) => (
                  <TableRow key={`${region.city}-${region.country}-${index}`}>
                    <TableCell className="font-medium">{region.city}</TableCell>
                    <TableCell>{region.country}</TableCell>
                    <TableCell className="text-right">{region.orderCount}</TableCell>
                    <TableCell className="text-right">{formatCurrency(region.totalSales)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 
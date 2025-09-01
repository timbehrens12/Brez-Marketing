"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Mail, MessageSquare, MapPin, RefreshCcw } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface CustomerBehaviorData {
  overview: {
    totalCustomers: number
    acceptsMarketingCount: number
    emailMarketingConsentCount: number
    smsMarketingConsentCount: number
  }
  marketingConsentRates: {
    totalCustomers: number
    acceptsMarketing: number
    emailSubscribed: number
    smsSubscribed: number
  }
  topCustomerLocations: Array<{
    country: string
    province: string
    city: string
    customerCount: number
    totalSpent: number
    totalOrders: number
  }>
  recentCustomers: Array<{
    id: string
    email: string
    first_name: string
    last_name: string
    total_spent: string
    orders_count: number
    created_at: string
    city?: string
    country?: string
  }>
}

interface CustomerBehaviorWidgetProps {
  brandId: string
  isLoading?: boolean
  isRefreshingData?: boolean
}

export function CustomerBehaviorWidget({ 
  brandId, 
  isLoading = false, 
  isRefreshingData = false 
}: CustomerBehaviorWidgetProps) {
  const [data, setData] = useState<CustomerBehaviorData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isWidgetLoading, setIsWidgetLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!brandId) return
    
    try {
      setError(null)
      setIsWidgetLoading(true)
      
      // Add cache busting to ensure fresh data
      const url = `/api/shopify/analytics/customer-behavior?brandId=${brandId}&t=${Date.now()}&cache_bust=${Math.random()}`
      
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch customer behavior data')
      }
      
      if (result.success && result.data) {
        setData(result.data)
        console.log(`[CustomerBehavior] Loaded data successfully`)
      } else {
        console.warn('[CustomerBehavior] No data available')
        setError('No customer behavior data available')
      }
    } catch (err) {
      console.error('[CustomerBehavior] Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setIsWidgetLoading(false)
    }
  }, [brandId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = (event?: any) => {
      console.log('[CustomerBehavior] Refresh event received:', event?.detail?.source || 'unknown')
      // Force refresh regardless of cache state
      fetchData()
    }

    window.addEventListener('refresh-all-widgets', handleRefresh)
    window.addEventListener('force-shopify-refresh', handleRefresh)
    window.addEventListener('shopifyDataRefreshed', handleRefresh)
    window.addEventListener('global-refresh-all', handleRefresh)
    window.addEventListener('shopify-sync-completed', handleRefresh)
    window.addEventListener('force-widget-refresh', handleRefresh)

    return () => {
      window.removeEventListener('refresh-all-widgets', handleRefresh)
      window.removeEventListener('force-shopify-refresh', handleRefresh)
      window.removeEventListener('shopifyDataRefreshed', handleRefresh)
      window.removeEventListener('global-refresh-all', handleRefresh)
      window.removeEventListener('shopify-sync-completed', handleRefresh)
      window.removeEventListener('force-widget-refresh', handleRefresh)
    }
  }, [fetchData])

  const showLoading = isLoading || isWidgetLoading || isRefreshingData

  if (showLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Customer Behavior Analytics
          </CardTitle>
          <RefreshCcw className="h-4 w-4 animate-spin text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
            <Skeleton className="h-32" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Customer Behavior Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Customer Behavior Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No customer behavior data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4" />
          Customer Behavior Analytics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Overview Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{data.overview?.totalCustomers || 0}</div>
              <div className="text-xs text-muted-foreground">Total Customers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{data.overview?.acceptsMarketingCount || 0}</div>
              <div className="text-xs text-muted-foreground">Accept Marketing</div>
            </div>
          </div>

          {/* Marketing Consent Rates */}
          <div>
            <h4 className="text-sm font-medium mb-2">Marketing Consent Rates</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  Email Marketing
                </span>
                <span className="font-medium">{(data.marketingConsentRates?.emailSubscribed || 0).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  SMS Marketing
                </span>
                <span className="font-medium">{(data.marketingConsentRates?.smsSubscribed || 0).toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Top Customer Locations */}
          {data.topCustomerLocations && data.topCustomerLocations.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Top Customer Locations
              </h4>
              <div className="space-y-2">
                {(data.topCustomerLocations || []).slice(0, 3).map((location, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span className="truncate">
                      {location.city}, {location.country}
                    </span>
                    <div className="text-right">
                      <div className="font-medium">${(location.totalSpent || 0).toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">{location.customerCount} customers</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Customers */}
          {data.recentCustomers && data.recentCustomers.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Recent Customers</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {(data.recentCustomers || []).slice(0, 3).map((customer) => (
                  <div key={customer.id} className="flex justify-between items-center text-sm">
                    <span className="truncate">
                      {customer.first_name} {customer.last_name} ({customer.email})
                    </span>
                    <div className="text-right">
                      <div className="font-medium">${parseFloat(customer.total_spent || '0').toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">{customer.orders_count} orders</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

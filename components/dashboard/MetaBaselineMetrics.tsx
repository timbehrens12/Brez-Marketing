"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/utils/formatters'
import { fetchMetaMetrics } from '@/lib/services/meta-service'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface MetaBaselineMetricsProps {
  brandId: string
}

interface MetaMetricsData {
  budget?: number;
  adSpend?: number;
  adSpendGrowth?: number;
  roas?: number;
  roasGrowth?: number;
  conversions?: number;
  conversionGrowth?: number;
  costPerResult?: number;
  cprGrowth?: number;
  cpcLink?: number;
  ctr?: number;
  ctrGrowth?: number;
  frequency?: number;
  [key: string]: any;
}

const MetaBaselineMetrics: React.FC<MetaBaselineMetricsProps> = ({ brandId }) => {
  const [metrics, setMetrics] = useState<MetaMetricsData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const lastRefreshRef = useRef<number>(Date.now())
  const isFetchingRef = useRef<boolean>(false)
  const mountedRef = useRef<boolean>(true)

  // Function to refresh metrics with the latest data from the API
  const refreshAllMetricsDirectly = useCallback(async (forceRefresh = false) => {
    if (!brandId || !mountedRef.current) return
    
    // Prevent duplicate fetches
    if (isFetchingRef.current) {
      // console.log('Skipping Meta metrics refresh - already fetching')
      return
    }
    
    try {
      isFetchingRef.current = true
      setLoading(true)
      setError(null)
      
      // Only refresh if it's been at least 3 seconds since the last refresh
      // to prevent excessive API calls, unless force refresh is requested
      const now = Date.now()
      if (!forceRefresh && now - lastRefreshRef.current < 3000) {
        // console.log('Skipping refresh - too soon since last refresh')
        setLoading(false)
        return
      }
      
      lastRefreshRef.current = now
      // console.log('Refreshing Meta metrics directly')
      
      const data = await fetchMetaMetrics(brandId)
      
      // Initialize with default values for any missing properties
      setMetrics({
        budget: data?.budget || 0,
        adSpend: data?.adSpend || 0,
        adSpendGrowth: data?.adSpendGrowth || 0,
        roas: data?.roas || 0,
        roasGrowth: data?.roasGrowth || 0,
        conversions: data?.conversions || 0,
        conversionGrowth: data?.conversionGrowth || 0,
        costPerResult: data?.costPerResult || 0,
        cprGrowth: data?.cprGrowth || 0,
        cpcLink: data?.cpcLink || 0,
        ctr: data?.ctr || 0,
        ctrGrowth: data?.ctrGrowth || 0,
        frequency: data?.frequency || 0
      })
    } catch (err) {
      console.error('Error refreshing Meta metrics:', err)
      setError('Failed to refresh Meta metrics')
      
      // Set empty metrics to prevent null reference errors
      setMetrics({
        budget: 0,
        adSpend: 0,
        adSpendGrowth: 0,
        roas: 0,
        roasGrowth: 0,
        conversions: 0,
        conversionGrowth: 0,
        costPerResult: 0,
        cprGrowth: 0,
        cpcLink: 0,
        ctr: 0,
        ctrGrowth: 0,
        frequency: 0
      })
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
      isFetchingRef.current = false
    }
  }, [brandId])

  // Initial metrics load
  useEffect(() => {
    refreshAllMetricsDirectly(true)
  }, [brandId, refreshAllMetricsDirectly])
  
  // Listen for custom refresh events
  useEffect(() => {
    const handleMetaDataRefreshed = (event: CustomEvent) => {
      if (event.detail?.brandId === brandId && mountedRef.current) {
        console.log('Received metaDataRefreshed event for MetaBaselineMetrics')
        // Add small delay to prevent race conditions with other components
        setTimeout(() => {
          if (mountedRef.current) {
            refreshAllMetricsDirectly(true)
          }
        }, 100)
      }
    }
    
    // Add event listener for the custom event
    window.addEventListener('metaDataRefreshed', handleMetaDataRefreshed as EventListener)
    
    // Cleanup
    return () => {
      window.removeEventListener('metaDataRefreshed', handleMetaDataRefreshed as EventListener)
    }
  }, [brandId, refreshAllMetricsDirectly])
  
  // Cleanup effect to prevent memory leaks
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      isFetchingRef.current = false
    }
  }, [])

  // Helper function to render growth indicators
  const renderGrowth = (value: number = 0) => {
    if (value === 0) return null
    
    const arrow = value > 0 ? '▲' : '▼'
    const colorClass = value > 0 ? 'text-green-500' : 'text-red-500'
    
    return (
      <span className={`flex items-center ${colorClass} text-xs ml-2`}>
        <span className="mr-1">{arrow}</span>
        {formatPercentage(Math.abs(value))}
      </span>
    )
  }

  // Helper function to render a metric item with safe value handling
  const renderMetricItem = (
    label: string, 
    value: string | number | null | undefined, 
    growth: number = 0,
    isPercentage: boolean = false,
    isCurrency: boolean = false
  ) => {
    // Ensure the value is a number or default to 0
    const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0
    const safeGrowth = typeof growth === 'number' && !isNaN(growth) ? growth : 0
    
    return (
      <div className="flex flex-col py-3 border-b border-gray-700 last:border-0">
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">{label}</span>
          <div className="flex items-center">
            <span className="font-medium">
              {loading ? (
                <Skeleton className="h-5 w-16" />
              ) : (
                isPercentage 
                  ? formatPercentage(safeValue) 
                  : isCurrency 
                    ? formatCurrency(safeValue)
                    : formatNumber(safeValue)
              )}
            </span>
            {!loading && renderGrowth(safeGrowth)}
          </div>
        </div>
      </div>
    )
  }

  // Calculate conversion value safely
  const calculateConversionValue = () => {
    if (!metrics) return 0
    
    // Ensure both roas and adSpend are valid numbers
    const roas = typeof metrics.roas === 'number' && !isNaN(metrics.roas) ? metrics.roas : 0
    const adSpend = typeof metrics.adSpend === 'number' && !isNaN(metrics.adSpend) ? metrics.adSpend : 0
    
    return roas * adSpend
  }

  if (error) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Meta Ads Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500">{error}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Meta Ads Metrics</CardTitle>
        <p className="text-xs text-gray-400 mt-1">
          The dashboard refresh button will resync data directly from the Meta API to ensure accurate metrics.
        </p>
      </CardHeader>
      <CardContent>
        {renderMetricItem('Budget', metrics?.budget, 0, false, true)}
        {renderMetricItem('Amount Spent', metrics?.adSpend, metrics?.adSpendGrowth, false, true)}
        {renderMetricItem('Purchase ROAS', metrics?.roas, metrics?.roasGrowth, false, false)}
        {renderMetricItem('Conversion Value', calculateConversionValue(), 0, false, true)}
        {renderMetricItem('Results', metrics?.conversions, metrics?.conversionGrowth, false, false)}
        {renderMetricItem('Cost per Result', metrics?.costPerResult, metrics?.cprGrowth, false, true)}
        {renderMetricItem('CPC (Link)', metrics?.cpcLink, 0, false, true)}
        {renderMetricItem('CTR', metrics?.ctr, metrics?.ctrGrowth, true, false)}
        {renderMetricItem('Frequency', metrics?.frequency, 0, false, false)}
      </CardContent>
    </Card>
  )
}

export default MetaBaselineMetrics 
"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MetricCard } from "@/components/metrics/MetricCard"
import { Users, Clock, MousePointer, BarChart2 } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"

interface SessionsSummaryProps {
  brandId: string
  isLoading?: boolean
  isRefreshingData?: boolean
  dateRange?: { from: Date; to: Date }
}

interface SessionsData {
  sessionCount: number
  uniqueVisitors: number
  bounceRate: number
  avgSessionDuration: number
  sessionGrowth: number
  visitorGrowth: number
  sessionsByDay: Array<{
    date: string
    sessions: number
    visitors: number
    value: number
  }>
  isEstimate?: boolean
}

export function SessionsSummary({ 
  brandId, 
  isLoading = false, 
  isRefreshingData = false,
  dateRange
}: SessionsSummaryProps) {
  const [sessionsData, setSessionsData] = useState<SessionsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [initialLoadComplete, setInitialLoadComplete] = useState<boolean>(false)
  const [isEstimated, setIsEstimated] = useState<boolean>(false)

  const fetchSessionsData = async (forceRefresh = false) => {
    if (!brandId) {
      console.log('No brandId provided to SessionsSummary component')
      return
    }

    try {
      console.log(`Fetching sessions data for brandId: ${brandId}${forceRefresh ? ' (forced refresh)' : ''}`)
      setLoading(true)
      
      // Add date range parameters if available
      let url = `/api/shopify/sessions?brandId=${brandId}`
      if (dateRange?.from && dateRange?.to) {
        url += `&from=${dateRange.from.toISOString()}&to=${dateRange.to.toISOString()}`
      }
      
      // Add cache-busting parameter and refresh flag if needed
      const cacheBuster = `&t=${new Date().getTime()}`
      const response = await fetch(`${url}${cacheBuster}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to fetch sessions data: ${errorText}`)
      }
      
      const data = await response.json()
      console.log('Sessions data fetched successfully:', data)
      setSessionsData(data)
      setIsEstimated(data.isEstimate || false)
      setError(null)
      setInitialLoadComplete(true)
    } catch (err) {
      console.error('Error fetching sessions data:', err)
      setError('Failed to load sessions data')
      setSessionsData(null)
      toast.error(`Error loading sessions data: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  // Initial data load when component mounts or brandId changes
  useEffect(() => {
    fetchSessionsData()
  }, [brandId, dateRange])
  
  // Handle refresh requests
  useEffect(() => {
    if (isRefreshingData && brandId) {
      console.log('Refreshing sessions data due to isRefreshingData change')
      fetchSessionsData(true)
    }
  }, [brandId, isRefreshingData])

  // Force a data load if we haven't loaded data yet and we have a brandId
  useEffect(() => {
    if (!initialLoadComplete && brandId && !loading) {
      console.log('Forcing initial sessions data load')
      fetchSessionsData()
    }
  }, [initialLoadComplete, brandId, loading])

  // Listen for custom refresh event
  useEffect(() => {
    const handleRefreshEvent = (event: CustomEvent) => {
      if (event.detail?.brandId === brandId) {
        console.log('Received refreshSessions event, refreshing sessions data')
        fetchSessionsData(true)
      }
    }

    window.addEventListener('refreshSessions', handleRefreshEvent as EventListener)
    
    return () => {
      window.removeEventListener('refreshSessions', handleRefreshEvent as EventListener)
    }
  }, [brandId])

  const isDataLoading = isLoading || loading

  // Format session duration from seconds to minutes and seconds
  const formatSessionDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  return (
    <div className="space-y-4">
      {error && !isDataLoading && (
        <div className="bg-red-900/30 border border-red-700 p-4 rounded-md text-red-200 mb-4">
          {error}
        </div>
      )}
      
      {isEstimated && !isDataLoading && (
        <div className="bg-yellow-900/30 border border-yellow-700 p-2 rounded-md text-yellow-200 mb-4 text-xs">
          Note: This data is estimated based on your order history. For accurate analytics, please install the Shopify Analytics app.
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
              <span>Sessions</span>
              <Users className="h-4 w-4" />
            </div>
          }
          value={sessionsData?.sessionCount || 0}
          change={sessionsData?.sessionGrowth || 0}
          data={sessionsData?.sessionsByDay || []}
          loading={isDataLoading}
          refreshing={isRefreshingData}
          platform="shopify"
          dateRange={dateRange}
          infoTooltip="Total number of sessions on your store in the selected period"
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
              <span>Unique Visitors</span>
              <Users className="h-4 w-4" />
            </div>
          }
          value={sessionsData?.uniqueVisitors || 0}
          change={sessionsData?.visitorGrowth || 0}
          data={sessionsData?.sessionsByDay?.map(d => ({ ...d, value: d.visitors })) || []}
          loading={isDataLoading}
          refreshing={isRefreshingData}
          platform="shopify"
          dateRange={dateRange}
          infoTooltip="Number of unique visitors to your store in the selected period"
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
              <span>Bounce Rate</span>
              <MousePointer className="h-4 w-4" />
            </div>
          }
          value={sessionsData?.bounceRate ? sessionsData.bounceRate.toFixed(1) + '%' : '0%'}
          change={0}
          data={[]}
          loading={isDataLoading}
          refreshing={isRefreshingData}
          platform="shopify"
          hideChange={true}
          infoTooltip="Percentage of visitors who leave after viewing only one page"
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
              <span>Avg. Session Duration</span>
              <Clock className="h-4 w-4" />
            </div>
          }
          value={sessionsData?.avgSessionDuration ? formatSessionDuration(sessionsData.avgSessionDuration) : '0m 0s'}
          change={0}
          data={[]}
          loading={isDataLoading}
          refreshing={isRefreshingData}
          platform="shopify"
          hideChange={true}
          infoTooltip="Average time visitors spend on your store per session"
        />
      </div>
    </div>
  )
} 
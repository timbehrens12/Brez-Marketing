"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Metrics } from "@/types/metrics"
import type { DateRange } from "react-day-picker"
import { useState, useEffect } from "react"
import { DollarSign, TrendingUp, Target, MousePointer, BarChart2, Activity, Users } from "lucide-react"
import Image from "next/image"
import { MetricCard } from "@/components/metrics/MetricCard"

interface MetaTabProps {
  dateRange: DateRange | undefined
  metrics: any
  isLoading: boolean
  isRefreshingData?: boolean
  brandId: string
}

interface DailyDataItem {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  roas: number;
  value?: number;
  [key: string]: string | number | undefined;
}

export function MetaTab({ dateRange, metrics, isLoading, isRefreshingData = false, brandId }: MetaTabProps) {
  const [metaData, setMetaData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMetaData() {
      if (!brandId) return
      
      setLoading(true)
      try {
        const response = await fetch(`/api/metrics/meta?brandId=${brandId}`)
        if (!response.ok) {
          throw new Error(`Failed to fetch Meta data: ${response.status}`)
        }
        
        const data = await response.json()
        setMetaData(data)
      } catch (err) {
        console.error("Error fetching Meta data:", err)
        setError(err instanceof Error ? err.message : "Failed to load Meta data")
      } finally {
        setLoading(false)
      }
    }
    
    fetchMetaData()
  }, [brandId, dateRange])

  // Use either the passed metrics or the fetched data
  const data = metrics || metaData || {}
  const hasData = data && Object.keys(data).length > 0

  return (
    <div className="space-y-8">
      {/* Meta Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title={
            <div className="flex items-center gap-1.5">
              <div className="relative w-5 h-5 flex items-center justify-center">
                <Image 
                  src="https://i.imgur.com/6hyyRrs.png" 
                  alt="Meta logo" 
                  width={18} 
                  height={18} 
                  className="object-contain"
                />
              </div>
              <span className="ml-0.5">Ad Spend</span>
              <DollarSign className="h-4 w-4" />
            </div>
          }
          value={data.adSpend || 0}
          change={data.adSpendGrowth || 0}
          prefix="$"
          valueFormat="currency"
          data={data.dailyData || []}
          loading={loading}
          refreshing={isRefreshingData}
          platform="meta"
        />
        <MetricCard
          title={
            <div className="flex items-center gap-1.5">
              <div className="relative w-5 h-5 flex items-center justify-center">
                <Image 
                  src="https://i.imgur.com/6hyyRrs.png" 
                  alt="Meta logo" 
                  width={18} 
                  height={18} 
                  className="object-contain"
                />
              </div>
              <span className="ml-0.5">Impressions</span>
              <Users className="h-4 w-4" />
            </div>
          }
          value={data.impressions || 0}
          change={data.impressionGrowth || 0}
          data={data.dailyData?.map((d: DailyDataItem) => ({ ...d, value: d.impressions })) || []}
          loading={loading}
          refreshing={isRefreshingData}
          platform="meta"
        />
        <MetricCard
          title={
            <div className="flex items-center gap-1.5">
              <div className="relative w-5 h-5 flex items-center justify-center">
                <Image 
                  src="https://i.imgur.com/6hyyRrs.png" 
                  alt="Meta logo" 
                  width={18} 
                  height={18} 
                  className="object-contain"
                />
              </div>
              <span className="ml-0.5">Clicks</span>
              <MousePointer className="h-4 w-4" />
            </div>
          }
          value={data.clicks || 0}
          change={data.clickGrowth || 0}
          data={data.dailyData?.map((d: DailyDataItem) => ({ ...d, value: d.clicks })) || []}
          loading={loading}
          refreshing={isRefreshingData}
          platform="meta"
        />
        <MetricCard
          title={
            <div className="flex items-center gap-1.5">
              <div className="relative w-5 h-5 flex items-center justify-center">
                <Image 
                  src="https://i.imgur.com/6hyyRrs.png" 
                  alt="Meta logo" 
                  width={18} 
                  height={18} 
                  className="object-contain"
                />
              </div>
              <span className="ml-0.5">ROAS</span>
              <Activity className="h-4 w-4" />
            </div>
          }
          value={data.roas || 0}
          change={data.roasGrowth || 0}
          suffix="x"
          data={data.dailyData?.map((d: DailyDataItem) => ({ ...d, value: d.roas })) || []}
          loading={loading}
          refreshing={isRefreshingData}
          platform="meta"
        />
      </div>
    </div>
  )
}

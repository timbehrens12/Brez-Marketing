"use client"

import { PlatformTabs } from "./platforms/PlatformTabs"
import { useMetrics } from "@/lib/hooks/useMetrics"
import { DateRange } from "react-day-picker"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { PlatformConnection } from "@/types/platformConnection"
import { Metrics } from "@/types/metrics"
import { MetricCard } from "@/components/metrics/MetricCard"
import { DollarSign, TrendingUp, Eye, MousePointer } from "lucide-react"
import Image from "next/image"
import { RevenueByDay } from "@/components/dashboard/RevenueByDay"
import { RevenueCalendarNew } from "@/components/dashboard/RevenueCalendarNew"

interface WidgetManagerProps {
  dateRange: {
    from: Date;
    to: Date;
  };
  brandId: string;
  metrics: Metrics;
  isLoading: boolean;
  isRefreshingData?: boolean;
  platformStatus: {
    shopify: boolean;
    meta: boolean;
  };
  existingConnections: PlatformConnection[];
  children?: React.ReactNode;
}

export function WidgetManager({ 
  dateRange, 
  brandId, 
  metrics, 
  isLoading,
  isRefreshingData = false,
  platformStatus,
  existingConnections,
  children
}: WidgetManagerProps) {
  const { metrics: contextMetrics, isLoading: contextIsLoading } = useMetrics()
  const [localConnections, setLocalConnections] = useState<PlatformConnection[]>(existingConnections)
  const [activeTab, setActiveTab] = useState<string>("shopify")

  // Load platform connections for this brand
  useEffect(() => {
    const loadConnections = async () => {
      const { data, error } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('brand_id', brandId)

      if (error) {
        console.error('Error loading connections:', error)
        return
      }

      const typedData = data as PlatformConnection[] | null
      setLocalConnections(typedData || [])
    }

    loadConnections()
  }, [brandId])

  const localPlatformStatus = {
    shopify: localConnections.some(c => c.platform_type === 'shopify' && c.status === 'active'),
    meta: localConnections.some(c => c.platform_type === 'meta' && c.status === 'active')
  }

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <>
      <PlatformTabs 
        platforms={localPlatformStatus}
        dateRange={dateRange}
        metrics={metrics}
        isLoading={isLoading}
        isRefreshingData={isRefreshingData}
        brandId={brandId}
        connections={localConnections}
        onTabChange={handleTabChange}
      >
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
          value={`$${(metrics.adSpend || 0).toFixed(2)}`}
          change={metrics.adSpendGrowth || 0}
          loading={isLoading}
          refreshing={isRefreshingData}
          data={[]}
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
              <TrendingUp className="h-4 w-4" />
            </div>
          }
          value={`${(metrics.roas || 0).toFixed(1)}x`}
          change={metrics.roasGrowth || 0}
          loading={isLoading}
          refreshing={isRefreshingData}
          data={[]}
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
              <Eye className="h-4 w-4" />
            </div>
          }
          value={(metrics.impressions || 0).toLocaleString()}
          change={metrics.impressionGrowth || 0}
          loading={isLoading}
          refreshing={isRefreshingData}
          data={[]}
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
              <span className="ml-0.5">CTR</span>
              <MousePointer className="h-4 w-4" />
            </div>
          }
          value={`${(metrics.ctr || 0).toFixed(1)}%`}
          change={metrics.ctrGrowth || 0}
          loading={isLoading}
          refreshing={isRefreshingData}
          data={[]}
          platform="meta"
        />
      </PlatformTabs>
      
      {/* Only show Meta widgets when Meta tab is active */}
      {activeTab === "meta" && children}

      <div className="grid grid-cols-1 gap-4 mb-4">
        <div className="h-[400px] rounded-md border border-gray-800" style={{backgroundColor: '#131722', borderColor: '#1f2937', color: 'white'}}>
          <div className="p-4 flex flex-col h-full">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-white">Revenue Calendar</h3>
              <div className="flex space-x-1">
                <button className="text-xs h-7 px-3 rounded-md" style={{backgroundColor: '#1f2937', color: 'white', border: 'none'}}>
                  Today
                </button>
                <button className="text-xs h-7 px-3 rounded-md" style={{backgroundColor: 'transparent', color: '#d1d5db', border: 'none'}}>
                  Week
                </button>
                <button className="text-xs h-7 px-3 rounded-md" style={{backgroundColor: 'transparent', color: '#d1d5db', border: 'none'}}>
                  Month
                </button>
                <button className="text-xs h-7 px-3 rounded-md" style={{backgroundColor: 'transparent', color: '#d1d5db', border: 'none'}}>
                  Year
                </button>
              </div>
            </div>
            <div className="text-sm font-medium text-gray-400 mb-4">March 2024</div>
            
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-gray-400 mb-2">No revenue data available</div>
                <div className="text-gray-500 text-sm">Try refreshing or selecting a different date range</div>
              </div>
            </div>
            
            <div className="p-2 border-t border-gray-800 text-sm font-medium flex justify-between items-center mt-4" style={{borderColor: '#1f2937'}}>
              <div className="text-gray-300 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Total Revenue: $0
              </div>
              <div className="text-gray-400 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Last updated: 3:47 PM
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
} 
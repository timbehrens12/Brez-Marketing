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
    </>
  )
} 
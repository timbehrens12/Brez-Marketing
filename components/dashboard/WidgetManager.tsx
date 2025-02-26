"use client"

import { PlatformTabs } from "./platforms/PlatformTabs"
import { useMetrics } from "@/lib/hooks/useMetrics"
import { DateRange } from "react-day-picker"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { PlatformConnection } from "@/types/platformConnection"
import { Metrics } from "@/types/metrics"

interface WidgetManagerProps {
  dateRange: {
    from: Date;
    to: Date;
  };
  brandId: string;
  metrics: Metrics;
  isLoading: boolean;
  platformStatus: {
    shopify: boolean;
    meta: boolean;
  };
  existingConnections: PlatformConnection[];
}

export function WidgetManager({ 
  dateRange, 
  brandId, 
  metrics, 
  isLoading, 
  platformStatus,
  existingConnections 
}: WidgetManagerProps) {
  const { metrics: contextMetrics, isLoading: contextIsLoading } = useMetrics()
  const [localConnections, setLocalConnections] = useState<PlatformConnection[]>(existingConnections)

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

  return (
    <PlatformTabs 
      platforms={localPlatformStatus}
      dateRange={dateRange}
      metrics={metrics}
      isLoading={isLoading}
      brandId={brandId}
      connections={localConnections}
    />
  )
} 
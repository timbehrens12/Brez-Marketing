"use client"

import { PlatformTabs } from "./platforms/PlatformTabs"
import { useMetrics } from "@/lib/hooks/useMetrics"
import { DateRange } from "react-day-picker"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { PlatformConnection } from "@/types"

interface WidgetManagerProps {
  dateRange?: DateRange
  brandId: string
}

export function WidgetManager({ dateRange, brandId }: WidgetManagerProps) {
  const { metrics, isLoading } = useMetrics()
  const [connections, setConnections] = useState<PlatformConnection[]>([])

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

      setConnections(data || [])
    }

    loadConnections()
  }, [brandId])

  const platforms = {
    shopify: connections.some(c => c.platform_type === 'shopify' && c.status === 'active'),
    meta: connections.some(c => c.platform_type === 'meta' && c.status === 'active')
  }

  return (
    <PlatformTabs 
      platforms={platforms}
      dateRange={dateRange}
      metrics={metrics}
      isLoading={isLoading}
      brandId={brandId}
      connections={connections}
    />
  )
} 
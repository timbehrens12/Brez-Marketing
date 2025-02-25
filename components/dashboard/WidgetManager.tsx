"use client"

import { PlatformTabs } from "./platforms/PlatformTabs"
import { useMetrics } from "@/lib/hooks/useMetrics"
import { DateRange } from "react-day-picker"

interface WidgetManagerProps {
  dateRange?: DateRange
  brandId: string
}

export function WidgetManager({ dateRange, brandId }: WidgetManagerProps) {
  const { metrics, isLoading } = useMetrics()

  const platforms = {
    shopify: true, // You might want to make this dynamic based on connections
    meta: true
  }

  return (
    <PlatformTabs 
      platforms={platforms}
      dateRange={dateRange}
      metrics={metrics}
      isLoading={isLoading}
    />
  )
} 
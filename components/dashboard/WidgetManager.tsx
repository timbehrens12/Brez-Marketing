"use client"

import { PlatformTabs } from "./platforms/PlatformTabs"
import { useMetrics } from "@/lib/hooks/useMetrics"
import { DateRange } from "react-day-picker"

interface WidgetManagerProps {
  dateRange: DateRange | undefined
}

export function WidgetManager({ dateRange }: WidgetManagerProps) {
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
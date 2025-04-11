"use client"

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Metrics } from '@/types/metrics'
import { PlatformConnection } from '@/types/platformConnection'
import { DateRange } from 'react-day-picker'
import { GreetingWidget } from '@/components/dashboard/GreetingWidget'

interface HomeTabProps {
  brandId: string
  brandName: string
  dateRange: DateRange
  metrics: Metrics
  isLoading: boolean
  isRefreshingData?: boolean
  platformStatus: {
    shopify: boolean
    meta: boolean
  }
  connections: PlatformConnection[]
  brands?: Array<{ id: string, name: string }>
}

export function HomeTab({
  brandId,
  brandName,
  dateRange,
  metrics,
  isLoading,
  isRefreshingData = false,
  platformStatus,
  connections,
  brands = []
}: HomeTabProps) {
  return (
    <div className="space-y-8">
      <GreetingWidget 
        brandId={brandId}
        brandName={brandName}
        metrics={metrics as any}
        connections={connections}
      />
    </div>
  )
} 
"use client"

import { useState } from "react"
import { defaultMetrics } from "@/types/metrics"

export function useMetrics() {
  const [metrics] = useState(() => ({
    ...defaultMetrics,
    dailyData: [], // Ensure this is initialized as an empty array
    revenueByDay: [], // Ensure this is initialized as an empty array
    topProducts: [], // Ensure this is initialized as an empty array
    customerSegments: {
      newCustomers: 0,
      returningCustomers: 0
    }
  }))
  const [isLoading] = useState(false)

  return {
    metrics,
    isLoading,
  }
} 
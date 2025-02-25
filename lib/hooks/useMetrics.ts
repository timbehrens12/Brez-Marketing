"use client"

import { useState } from "react"
import { Metrics, defaultMetrics } from "@/types/metrics"

export function useMetrics() {
  const [metrics] = useState<Metrics>(defaultMetrics)
  const [isLoading] = useState(false)

  return {
    metrics,
    isLoading,
  }
} 
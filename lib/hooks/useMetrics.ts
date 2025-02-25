"use client"

import { useState, useCallback } from "react"
import { defaultMetrics } from "@/types/metrics"
import type { DateRange } from "react-day-picker"
import { supabase } from "@/lib/supabaseClient"

export function useMetrics() {
  const [metrics, setMetrics] = useState(defaultMetrics)
  const [isLoading, setIsLoading] = useState(false)

  const fetchMetrics = useCallback(async (dateRange?: DateRange) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (dateRange?.from) params.append('from', dateRange.from.toISOString())
      if (dateRange?.to) params.append('to', dateRange.to.toISOString())

      const response = await fetch(`/api/metrics?${params}`)
      const data = await response.json()
      setMetrics(data)
    } catch (error) {
      console.error('Error fetching metrics:', error)
      setMetrics(defaultMetrics)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    metrics,
    isLoading,
    fetchMetrics
  }
} 
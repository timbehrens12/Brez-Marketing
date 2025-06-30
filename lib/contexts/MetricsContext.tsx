"use client"

import { createContext, useContext, ReactNode } from 'react'
import { useMetrics as useMetricsHook } from '@/lib/hooks/useMetrics'

const MetricsContext = createContext<ReturnType<typeof useMetricsHook> | undefined>(undefined)

export function MetricsProvider({ children }: { children: ReactNode }) {
  const metrics = useMetricsHook()
  return <MetricsContext.Provider value={metrics}>{children}</MetricsContext.Provider>
}

export function useMetrics() {
  const context = useContext(MetricsContext)
  if (!context) throw new Error('useMetrics must be used within MetricsProvider')
  return context
} 
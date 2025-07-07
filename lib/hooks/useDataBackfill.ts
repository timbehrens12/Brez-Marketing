import { useState, useCallback } from 'react'
import { toast } from 'react-hot-toast'

export interface DataGap {
  start_date: string
  end_date: string
  days_missing: number
  gap_type: 'meta' | 'shopify' | 'both'
}

export interface BackfillResult {
  success: boolean
  gaps_found: DataGap[]
  gaps_filled: DataGap[]
  errors: string[]
  total_records_created: number
  message?: string
}

export interface BackfillStatus {
  checking: boolean
  backfilling: boolean
  hasGaps: boolean
  gaps: DataGap[]
  totalDaysMissing: number
  lastChecked: Date | null
  backfillResult: BackfillResult | null
  error: string | null
}

export function useDataBackfill() {
  const [status, setStatus] = useState<BackfillStatus>({
    checking: false,
    backfilling: false,
    hasGaps: false,
    gaps: [],
    totalDaysMissing: 0,
    lastChecked: null,
    backfillResult: null,
    error: null
  })

  const checkForGaps = useCallback(async () => {
    console.log('🔍 Checking for data gaps...')
    
    setStatus(prev => ({ 
      ...prev, 
      checking: true, 
      error: null 
    }))

    try {
      const response = await fetch('/api/data/backfill', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      console.log('📊 Gap check result:', data)

      setStatus(prev => ({
        ...prev,
        checking: false,
        hasGaps: data.has_gaps || false,
        gaps: data.gaps_found || [],
        totalDaysMissing: data.total_days_missing || 0,
        lastChecked: new Date(),
        error: null
      }))

      return {
        hasGaps: data.has_gaps || false,
        gaps: data.gaps_found || [],
        totalDaysMissing: data.total_days_missing || 0
      }
    } catch (error) {
      console.error('❌ Error checking for gaps:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to check for data gaps'
      
      setStatus(prev => ({
        ...prev,
        checking: false,
        error: errorMessage
      }))

      toast.error('Failed to check for data gaps')
      throw error
    }
  }, [])

  const performBackfill = useCallback(async () => {
    console.log('🚀 Starting backfill process...')
    
    setStatus(prev => ({ 
      ...prev, 
      backfilling: true, 
      error: null 
    }))

    try {
      const response = await fetch('/api/data/backfill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      })

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Backfill was already performed recently. Please wait before trying again.')
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: BackfillResult = await response.json()
      
      console.log('📝 Backfill result:', result)

      setStatus(prev => ({
        ...prev,
        backfilling: false,
        hasGaps: false, // Reset gaps after successful backfill
        gaps: [],
        totalDaysMissing: 0,
        backfillResult: result,
        error: null
      }))

      if (result.success) {
        if (result.gaps_filled.length > 0) {
          toast.success(
            `✅ Backfill completed! ${result.total_records_created} records added across ${result.gaps_filled.length} gaps.`
          )
        } else {
          toast.success('✅ No data gaps found - your data is up to date!')
        }
      } else {
        toast.error('⚠️ Backfill completed with some errors. Check logs for details.')
      }

      return result
    } catch (error) {
      console.error('❌ Error during backfill:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to perform backfill'
      
      setStatus(prev => ({
        ...prev,
        backfilling: false,
        error: errorMessage
      }))

      toast.error(errorMessage)
      throw error
    }
  }, [])

  const resetStatus = useCallback(() => {
    setStatus({
      checking: false,
      backfilling: false,
      hasGaps: false,
      gaps: [],
      totalDaysMissing: 0,
      lastChecked: null,
      backfillResult: null,
      error: null
    })
  }, [])

  return {
    status,
    checkForGaps,
    performBackfill,
    resetStatus,
    // Convenience flags
    isLoading: status.checking || status.backfilling,
    isChecking: status.checking,
    isBackfilling: status.backfilling,
    hasGaps: status.hasGaps,
    gaps: status.gaps,
    totalDaysMissing: status.totalDaysMissing,
    error: status.error
  }
} 
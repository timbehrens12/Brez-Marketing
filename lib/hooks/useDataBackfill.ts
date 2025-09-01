import { useState, useCallback, useRef } from 'react'
import { toast } from 'react-hot-toast'

export interface BackfillStatus {
  isChecking: boolean
  isBackfilling: boolean
  hasGaps: boolean
  gapsDetected: number
  totalMissingDays: number
  lastBackfillCheck: Date | null
  backfillResults: any | null
}

export interface BackfillHookResult {
  status: BackfillStatus
  checkForGaps: (brandId: string, force?: boolean) => Promise<void>
  performBackfill: (brandId: string, force?: boolean) => Promise<boolean>
  resetStatus: () => void
}

/**
 * Hook for handling automatic data gap detection and backfill
 */
export function useDataBackfill(): BackfillHookResult {
  const [status, setStatus] = useState<BackfillStatus>({
    isChecking: false,
    isBackfilling: false,
    hasGaps: false,
    gapsDetected: 0,
    totalMissingDays: 0,
    lastBackfillCheck: null,
    backfillResults: null
  })

  const lastCheckRef = useRef<string | null>(null)
  const backfillInProgressRef = useRef<boolean>(false)

  const resetStatus = useCallback(() => {
    setStatus({
      isChecking: false,
      isBackfilling: false,
      hasGaps: false,
      gapsDetected: 0,
      totalMissingDays: 0,
      lastBackfillCheck: null,
      backfillResults: null
    })
    lastCheckRef.current = null
    backfillInProgressRef.current = false
  }, [])

  const checkForGaps = useCallback(async (brandId: string, force: boolean = false) => {
    // Prevent duplicate checks for the same brand
    if (lastCheckRef.current === brandId && !force) {
      // console.log('[Backfill Hook] Skipping duplicate gap check for brand', brandId)
      return
    }

    if (status.isChecking || status.isBackfilling) {
      // console.log('[Backfill Hook] Already checking/backfilling, skipping')
      return
    }

    try {
      setStatus(prev => ({ ...prev, isChecking: true }))
      lastCheckRef.current = brandId

      // console.log('[Backfill Hook] Checking for data gaps for brand', brandId)

      const response = await fetch(`/api/data/backfill?brandId=${brandId}&lookbackDays=60`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }

      const data = await response.json()

      if (data.success) {
        const recommendation = data.recommendation
        const hasSignificantGaps = recommendation.shouldBackfill && recommendation.totalMissingDays >= 3

        setStatus(prev => ({
          ...prev,
          isChecking: false,
          hasGaps: hasSignificantGaps,
          gapsDetected: recommendation.criticalGaps,
          totalMissingDays: recommendation.totalMissingDays,
          lastBackfillCheck: new Date()
        }))

        if (hasSignificantGaps) {
          // console.log(`[Backfill Hook] Found significant gaps: ${recommendation.criticalGaps} critical gaps, ${recommendation.totalMissingDays} total missing days`)
        } else {
          // console.log('[Backfill Hook] No significant data gaps detected')
        }
      } else {
        throw new Error(data.error || 'Failed to check for gaps')
      }

    } catch (error) {
      console.error('[Backfill Hook] Error checking for gaps:', error)
      setStatus(prev => ({ 
        ...prev, 
        isChecking: false,
        lastBackfillCheck: new Date()
      }))
      
      // Only show error toast if it's a significant error (not just no gaps)
      if (error instanceof Error && !error.message.includes('No significant')) {
        toast.error('Failed to check for data gaps')
      }
    }
  }, [status.isChecking, status.isBackfilling])

  const performBackfill = useCallback(async (brandId: string, force: boolean = false): Promise<boolean> => {
    if (backfillInProgressRef.current) {
      // console.log('[Backfill Hook] Backfill already in progress')
      return false
    }

    if (status.isBackfilling) {
      // console.log('[Backfill Hook] Backfill already in progress (status)')
      return false
    }

    try {
      backfillInProgressRef.current = true
      setStatus(prev => ({ ...prev, isBackfilling: true }))

      // console.log('[Backfill Hook] Starting backfill process for brand', brandId)

      // Show loading toast for user feedback
      const loadingToast = toast.loading('Backfilling missing data...')

      const response = await fetch('/api/data/backfill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Brez-Dashboard-Backfill'
        },
        body: JSON.stringify({
          brandId,
          autoDetect: true,
          force
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }

      const data = await response.json()

      // Dismiss loading toast
      toast.dismiss(loadingToast)

      if (data.success) {
        setStatus(prev => ({
          ...prev,
          isBackfilling: false,
          hasGaps: false, // Reset gaps since we just backfilled
          backfillResults: data,
          lastBackfillCheck: new Date()
        }))

        const recordsBackfilled = data.totalRecordsBackfilled || 0
        const successfulOps = data.successfulOperations || 0

        if (recordsBackfilled > 0) {
          toast.success(`✅ Backfill completed! Added ${recordsBackfilled} records across ${successfulOps} operations.`)
          // console.log(`[Backfill Hook] Backfill successful: ${recordsBackfilled} records, ${successfulOps} operations`)
        } else {
          toast.success('✅ Data is up to date - no backfill needed')
          // console.log('[Backfill Hook] No backfill needed')
        }

        return true
      } else {
        throw new Error(data.error || 'Backfill failed')
      }

    } catch (error) {
      console.error('[Backfill Hook] Error performing backfill:', error)
      
      setStatus(prev => ({ 
        ...prev, 
        isBackfilling: false,
        lastBackfillCheck: new Date()
      }))

      toast.error(`❌ Backfill failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return false

    } finally {
      backfillInProgressRef.current = false
    }
  }, [status.isBackfilling])

  return {
    status,
    checkForGaps,
    performBackfill,
    resetStatus
  }
}

/**
 * Utility function to check if backfill should be suggested to the user
 */
export function shouldSuggestBackfill(status: BackfillStatus): boolean {
  return status.hasGaps && 
         status.totalMissingDays >= 3 && 
         !status.isBackfilling && 
         !status.isChecking
}

/**
 * Utility function to format backfill status for display
 */
export function formatBackfillStatus(status: BackfillStatus): string {
  if (status.isBackfilling) {
    return 'Backfilling missing data...'
  }
  
  if (status.isChecking) {
    return 'Checking for data gaps...'
  }
  
  if (status.hasGaps) {
    return `Found ${status.gapsDetected} data gaps (${status.totalMissingDays} missing days)`
  }
  
  if (status.lastBackfillCheck) {
    return 'Data coverage is complete'
  }
  
  return 'Not checked'
} 
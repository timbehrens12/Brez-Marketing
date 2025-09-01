"use client"

import { Loader2, CheckCircle, AlertTriangle, Database } from 'lucide-react'
import { useSyncStatus } from '@/lib/hooks/useSyncStatus'
import { useState, useEffect } from 'react'

interface SyncStatusIndicatorProps {
  brandId: string | null
  className?: string
}

export function SyncStatusIndicator({ brandId, className = "" }: SyncStatusIndicatorProps) {
  const { isLoading, status, lastSynced, hasRecentConnection, hasAnyData, shouldHideData } = useSyncStatus(brandId)
  const [hasBeenRefreshed, setHasBeenRefreshed] = useState(false)

  // Set refreshed state immediately on mount if status is completed
  useEffect(() => {
    if (status === 'completed') {
      // Hide completed status after 5 seconds or on page load
      const timer = setTimeout(() => {
        setHasBeenRefreshed(true)
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [status])

  // Detect page refresh/navigation
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && status === 'completed') {
        setHasBeenRefreshed(true)
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [status])

  if (isLoading || !brandId) {
    return null
  }

  // Hide if user has refreshed after completion or status is completed and we've set the flag
  if (status === 'completed' && hasBeenRefreshed) {
    return null
  }

  // Don't show if sync completed and enough time has passed
  if (status === 'completed' && lastSynced && !shouldHideData) {
    const syncDate = new Date(lastSynced)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    if (syncDate < fiveMinutesAgo) {
      return null
    }
  }

  // Only show if actively syncing or very recently completed
  if (status !== 'in_progress' && status !== 'pending' && status !== 'completed') {
    return null
  }

  // Don't show completed status if it's been more than a few seconds since page load
  if (status === 'completed') {
    const pageLoadTime = performance.timing?.loadEventEnd || Date.now()
    const timeSincePageLoad = Date.now() - pageLoadTime
    if (timeSincePageLoad > 5000) { // 5 seconds
      return null
    }
  }

  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          icon: <Database className="w-4 h-4 text-blue-400" />,
          text: 'Preparing to sync all historical data (2010 onwards)...',
          className: 'bg-blue-500/10 border-blue-500/20 text-blue-300'
        }
      case 'in_progress':
        return {
          icon: <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />,
          text: 'Syncing all historical data (2010 onwards) - 5-15 minutes',
          className: 'bg-blue-500/10 border-blue-500/20 text-blue-300'
        }
      case 'completed':
        return {
          icon: <CheckCircle className="w-4 h-4 text-green-400" />,
          text: 'Historical data sync complete!',
          className: 'bg-green-500/10 border-green-500/20 text-green-300'
        }
      case 'failed':
        return {
          icon: <AlertTriangle className="w-4 h-4 text-red-400" />,
          text: 'Data sync failed. Please try reconnecting.',
          className: 'bg-red-500/10 border-red-500/20 text-red-300'
        }
      default:
        return null
    }
  }

  const config = getStatusConfig()
  if (!config) return null

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${config.className} ${className}`}>
      {config.icon}
      <span className="text-sm font-medium">
        {config.text}
      </span>
      {status === 'in_progress' && (
        <span className="text-xs opacity-75">
          Stay on this page until complete
        </span>
      )}
    </div>
  )
}

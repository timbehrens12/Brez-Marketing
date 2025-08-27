"use client"

import { Loader2, CheckCircle, AlertTriangle, Database } from 'lucide-react'
import { useSyncStatus } from '@/lib/hooks/useSyncStatus'

interface SyncStatusIndicatorProps {
  brandId: string | null
  className?: string
}

export function SyncStatusIndicator({ brandId, className = "" }: SyncStatusIndicatorProps) {
  const { isLoading, status, lastSynced, hasRecentConnection, hasAnyData, shouldHideData } = useSyncStatus(brandId)

  if (isLoading || !brandId) {
    return null
  }

  // Don't show if sync completed and enough time has passed
  if (status === 'completed' && lastSynced && !shouldHideData) {
    const syncDate = new Date(lastSynced)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
    if (syncDate < tenMinutesAgo) {
      return null
    }
  }

  // Don't show if not syncing and no recent connection
  if (!hasRecentConnection && !shouldHideData) {
    return null
  }

  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          icon: <Database className="w-4 h-4 text-blue-400" />,
          text: 'Connection added - Preparing to load data...',
          className: 'bg-blue-500/10 border-blue-500/20 text-blue-300'
        }
      case 'in_progress':
        return {
          icon: <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />,
          text: 'Syncing all historical data (3-7 minutes)...',
          className: 'bg-blue-500/10 border-blue-500/20 text-blue-300'
        }
      case 'completed':
        return {
          icon: <CheckCircle className="w-4 h-4 text-green-400" />,
          text: hasAnyData ? 'Data loaded successfully! Refresh to view.' : 'Connection ready - No historical data found.',
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

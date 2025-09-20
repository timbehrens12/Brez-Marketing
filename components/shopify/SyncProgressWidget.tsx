"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react'

interface SyncProgressWidgetProps {
  brandId: string
  onSyncComplete?: () => void
}

interface SyncStatus {
  shopify: {
    milestones: Array<{
      label: string
      status: 'queued' | 'running' | 'completed' | 'failed'
      progress?: {
        rows_written?: number
        total_rows?: number
        progress_pct?: number
      }
      entity: string
      error?: string
      updated_at: string
    }>
    overall_status: 'pending' | 'syncing' | 'completed' | 'error' | 'partial'
    summary: string
    last_update: string
  }
}

export function SyncProgressWidget({ brandId, onSyncComplete }: SyncProgressWidgetProps) {
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null)

  const fetchStatus = async () => {
    try {
      const response = await fetch(`/api/sync/${brandId}/status`)
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
        
        // Show widget if sync is in progress
        const isActive = data.shopify.overall_status === 'syncing' || data.shopify.overall_status === 'partial'
        setIsVisible(isActive)
        
        // Call completion callback if sync is done
        if (data.shopify.overall_status === 'completed' && onSyncComplete) {
          onSyncComplete()
        }
        
        return isActive
      }
    } catch (error) {
      // Error fetching sync progress status
    }
    return false
  }

  useEffect(() => {
    // Initial fetch
    fetchStatus().then((isActive) => {
      if (isActive) {
        // Start polling every 5 seconds if sync is active
        const interval = setInterval(async () => {
          const stillActive = await fetchStatus()
          if (!stillActive) {
            clearInterval(interval)
            setPollInterval(null)
            // Hide widget after 3 seconds
            setTimeout(() => setIsVisible(false), 3000)
          }
        }, 5000)
        
        setPollInterval(interval)
      }
    })

    // Cleanup
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval)
      }
    }
  }, [brandId])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'running':
        return <RefreshCw className="h-4 w-4 text-white animate-spin" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'queued':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default' as const // Green
      case 'running':
        return 'secondary' as const // Blue
      case 'failed':
        return 'destructive' as const // Red
      case 'queued':
        return 'outline' as const // Gray
      default:
        return 'outline' as const
    }
  }

  if (!isVisible || !status) {
    return null
  }

  return (
    <Card className="fixed bottom-4 right-4 w-96 z-50 bg-white dark:bg-[#2A2A2A] shadow-lg border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <RefreshCw className="h-4 w-4" />
          Shopify Data Sync
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {status.shopify.summary}
        </p>
        
        <div className="space-y-2">
          {status.shopify.milestones.map((milestone, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(milestone.status)}
                <span className="text-sm">{milestone.label}</span>
              </div>
              
              <div className="flex items-center gap-2">
                {milestone.progress?.rows_written && (
                  <span className="text-xs text-gray-500">
                    {milestone.progress.rows_written.toLocaleString()}
                  </span>
                )}
                <Badge variant={getStatusBadgeVariant(milestone.status)} className="text-xs">
                  {milestone.status === 'completed' ? '✓' : 
                   milestone.status === 'running' ? '...' : 
                   milestone.status === 'failed' ? '✗' : 
                   '○'}
                </Badge>
              </div>
            </div>
          ))}
        </div>

        {/* Overall progress bar */}
        {status.shopify.overall_status === 'syncing' && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Overall Progress</span>
              <span>
                {status.shopify.milestones.filter(m => m.status === 'completed').length} / {status.shopify.milestones.length}
              </span>
            </div>
            <Progress 
              value={(status.shopify.milestones.filter(m => m.status === 'completed').length / status.shopify.milestones.length) * 100} 
              className="h-2"
            />
          </div>
        )}

        {/* Show error if any milestone failed */}
        {status.shopify.milestones.some(m => m.status === 'failed') && (
          <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600 dark:text-red-400">
            Some sync operations failed. Data may be incomplete. Check logs for details.
          </div>
        )}

        {/* Success message */}
        {status.shopify.overall_status === 'completed' && (
          <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs text-green-600 dark:text-green-400">
            ✓ All Shopify data has been synced successfully!
          </div>
        )}
      </CardContent>
    </Card>
  )
}

"use client"
import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, Clock, Loader2 } from 'lucide-react'

interface MetaSyncStatusProps {
  brandId: string
  onSyncComplete?: () => void
}

interface SyncStatus {
  status: 'not_connected' | 'syncing' | 'completed' | 'unknown'
  syncing: boolean
  queuedJobs: number
  totalRecords: number
  totalSpent: number
  estimatedTimeRemaining: number
  syncStartedAt?: string
}

export function MetaSyncStatus({ brandId, onSyncComplete }: MetaSyncStatusProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkSyncStatus = async () => {
      try {
        const response = await fetch(`/api/meta/queue-historical-sync?brandId=${brandId}`)
        const data = await response.json()
        setSyncStatus(data)
        
        // If sync completed, notify parent
        if (data.status === 'completed' && onSyncComplete) {
          onSyncComplete()
        }
      } catch (error) {
        console.error('Error checking sync status:', error)
      } finally {
        setLoading(false)
      }
    }

    // Check immediately
    checkSyncStatus()
    
    // Poll every 5 seconds while syncing
    const interval = setInterval(checkSyncStatus, 5000)
    
    return () => clearInterval(interval)
  }, [brandId, onSyncComplete])

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Checking sync status...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!syncStatus || syncStatus.status === 'not_connected') {
    return null
  }

  if (syncStatus.status === 'completed') {
    return (
      <Card className="w-full border-green-200 bg-green-50">
        <CardContent className="p-6">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <h3 className="font-semibold text-green-800">Meta Sync Complete!</h3>
              <p className="text-sm text-green-600">
                Synced {syncStatus.totalRecords} records • Total spend: ${syncStatus.totalSpent.toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (syncStatus.syncing) {
    const progress = syncStatus.queuedJobs > 0 
      ? Math.max(10, 100 - (syncStatus.queuedJobs / 12) * 100) 
      : 95 // Almost done if no jobs queued

    return (
      <Card className="w-full border-blue-200 bg-blue-50">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <div>
                <h3 className="font-semibold text-blue-800">Syncing Meta Data...</h3>
                <p className="text-sm text-blue-600">
                  Pulling 12 months of historical data from Meta
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">Progress</span>
                <span className="text-blue-700">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-blue-600">
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>
                  {syncStatus.estimatedTimeRemaining > 0 
                    ? `~${Math.ceil(syncStatus.estimatedTimeRemaining)} min remaining`
                    : 'Almost done...'
                  }
                </span>
              </div>
              {syncStatus.queuedJobs > 0 && (
                <span>{syncStatus.queuedJobs} jobs remaining</span>
              )}
            </div>
            
            {syncStatus.totalRecords > 0 && (
              <p className="text-sm text-blue-600">
                {syncStatus.totalRecords} records synced so far
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return null
}

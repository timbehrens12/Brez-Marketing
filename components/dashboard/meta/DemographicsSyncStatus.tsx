/**
 * Demographics Sync Status Component
 * 
 * Shows sync progress and allows manual control of the demographics sync process
 */

"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, Clock, RefreshCw, Play, Pause, RotateCcw } from "lucide-react"
import { toast } from "sonner"

interface DemographicsSyncStatusProps {
  brandId: string
  className?: string
}

interface SyncStatus {
  overall_status: string
  progress_percentage: number
  days_completed: number
  total_days_target: number
  current_phase: string
  estimated_completion?: string
}

export function DemographicsSyncStatus({ brandId, className = "" }: DemographicsSyncStatusProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const fetchSyncStatus = async () => {
    if (!brandId) return

    try {
      const response = await fetch(`/api/test/demographics-sync?brandId=${brandId}`)
      const result = await response.json()

      if (result.success && result.syncStatus) {
        setSyncStatus({
          overall_status: result.syncStatus.overall_status,
          progress_percentage: Math.round((result.syncStatus.days_completed / result.syncStatus.total_days_target) * 100),
          days_completed: result.syncStatus.days_completed,
          total_days_target: result.syncStatus.total_days_target,
          current_phase: result.syncStatus.current_phase,
          estimated_completion: result.syncStatus.estimated_completion
        })
      } else {
        setSyncStatus(null)
      }
    } catch (error) {
      console.error('Error fetching sync status:', error)
    }
  }

  const startSync = async () => {
    setIsProcessing(true)
    try {
      const response = await fetch('/api/meta/demographics/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId, action: 'start_full_sync' })
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Demographics sync started!', {
          description: `${result.jobsCreated} jobs created. Estimated duration: ${result.estimatedDuration}`
        })
        await fetchSyncStatus()
      } else {
        toast.error('Failed to start sync', {
          description: result.error || 'Unknown error'
        })
      }
    } catch (error) {
      toast.error('Error starting sync', {
        description: error.message
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const pauseSync = async () => {
    setIsProcessing(true)
    try {
      const response = await fetch('/api/meta/demographics/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId, action: 'pause_sync' })
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Sync paused')
        await fetchSyncStatus()
      } else {
        toast.error('Failed to pause sync')
      }
    } catch (error) {
      toast.error('Error pausing sync')
    } finally {
      setIsProcessing(false)
    }
  }

  const resumeSync = async () => {
    setIsProcessing(true)
    try {
      const response = await fetch('/api/meta/demographics/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId, action: 'resume_sync' })
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Sync resumed')
        await fetchSyncStatus()
      } else {
        toast.error('Failed to resume sync')
      }
    } catch (error) {
      toast.error('Error resuming sync')
    } finally {
      setIsProcessing(false)
    }
  }

  useEffect(() => {
    fetchSyncStatus()
    
    // More aggressive polling during active sync
    const interval = setInterval(() => {
      if (syncStatus?.overall_status === 'in_progress') {
        fetchSyncStatus()
      }
    }, 10000) // Poll every 10 seconds instead of 30

    return () => clearInterval(interval)
  }, [brandId, syncStatus?.overall_status]) // Include status in dependencies

  // Additional fast polling when percentage is changing rapidly
  useEffect(() => {
    if (syncStatus?.overall_status === 'in_progress') {
      const fastInterval = setInterval(() => {
        fetchSyncStatus()
      }, 5000) // Poll every 5 seconds during active sync
      
      return () => clearInterval(fastInterval)
    }
  }, [syncStatus?.overall_status, syncStatus?.progress_percentage])

  const getStatusIcon = () => {
    switch (syncStatus?.overall_status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'in_progress':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
      case 'paused':
        return <Pause className="h-5 w-5 text-yellow-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = () => {
    switch (syncStatus?.overall_status) {
      case 'completed':
        return 'bg-green-950/30 text-green-500 border-green-800/50'
      case 'failed':
        return 'bg-red-950/30 text-red-500 border-red-800/50'
      case 'in_progress':
        return 'bg-blue-950/30 text-blue-500 border-blue-800/50'
      case 'paused':
        return 'bg-yellow-950/30 text-yellow-500 border-yellow-800/50'
      default:
        return 'bg-gray-950/30 text-gray-500 border-gray-800/50'
    }
  }

  return (
    <Card className={`bg-[#111] border-[#333] ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium text-white flex items-center gap-2">
            {getStatusIcon()}
            Demographics Sync Status
          </CardTitle>
            <Button
            variant="ghost"
            size="sm"
            onClick={fetchSyncStatus}
            disabled={isLoading}
            className="text-gray-400 hover:text-white"
            title="Refresh sync status"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {syncStatus ? (
          <>
            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <Badge className={`text-xs px-2 py-1 ${getStatusColor()}`}>
                {syncStatus.overall_status.replace('_', ' ').toUpperCase()}
              </Badge>
              <span className="text-sm text-gray-400">
                Phase: {syncStatus.current_phase}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Progress</span>
                <span className="text-white font-mono transition-all duration-300">
                  {syncStatus.progress_percentage}%
                </span>
              </div>
              <Progress 
                value={syncStatus.progress_percentage} 
                className="h-2 bg-[#333]"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{syncStatus.days_completed} of {syncStatus.total_days_target} days</span>
                {syncStatus.estimated_completion && (
                  <span>ETA: {new Date(syncStatus.estimated_completion).toLocaleDateString()}</span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              {syncStatus.overall_status === 'pending' && (
                <Button
                  onClick={startSync}
                  disabled={isProcessing}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Sync
                </Button>
              )}
              
              {syncStatus.overall_status === 'in_progress' && (
                <Button
                  onClick={pauseSync}
                  disabled={isProcessing}
                  size="sm"
                  variant="outline"
                  className="border-yellow-600 text-yellow-500 hover:bg-yellow-600/10"
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </Button>
              )}
              
              {syncStatus.overall_status === 'paused' && (
                <Button
                  onClick={resumeSync}
                  disabled={isProcessing}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Resume
                </Button>
              )}
              
              {(syncStatus.overall_status === 'failed' || syncStatus.overall_status === 'completed') && (
                <Button
                  onClick={startSync}
                  disabled={isProcessing}
                  size="sm"
                  variant="outline"
                  className="border-blue-600 text-blue-500 hover:bg-blue-600/10"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restart Sync
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="text-gray-400 mb-4">No sync status found</div>
            <Button
              onClick={startSync}
              disabled={isProcessing}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Play className="h-4 w-4 mr-2" />
              Start 12-Month Sync
            </Button>
          </div>
        )}

        {/* Info Text */}
        <div className="text-xs text-gray-500 mt-4 p-3 bg-[#0A0A0A] rounded border border-[#333]">
          <p className="mb-1">
            <strong>12-Month Demographics Sync:</strong>
          </p>
          <p>
            • 0-35 days: Daily granularity<br/>
            • 36-180 days: Weekly aggregates<br/>
            • 181-365 days: Monthly aggregates<br/>
            • Auto-rollover prevents database bloat
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, Clock, RefreshCw, Loader2, Database, Users, BarChart3 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface UnifiedMetaSyncStatusProps {
  brandId: string
  connectionId?: string
  isVisible: boolean
  onSyncComplete?: () => void
}

interface SyncPhase {
  id: string
  name: string
  icon: React.ReactNode
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  progress: number
  estimated_time?: string
}

interface UnifiedSyncStatus {
  overall_status: 'not_started' | 'in_progress' | 'completed' | 'failed'
  overall_progress: number
  phases: SyncPhase[]
  estimated_completion?: string
  time_remaining?: string
  started_at?: string
  completed_at?: string
}

export function UnifiedMetaSyncStatus({ brandId, connectionId, isVisible, onSyncComplete }: UnifiedMetaSyncStatusProps) {
  const [syncStatus, setSyncStatus] = useState<UnifiedSyncStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showLeaveWarning, setShowLeaveWarning] = useState(false)

  // Browser leave warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (syncStatus?.overall_status === 'in_progress') {
        e.preventDefault()
        e.returnValue = "Meta sync is in progress. Leaving now may interrupt the sync. Are you sure you want to leave?"
        return e.returnValue
      }
    }

    if (syncStatus?.overall_status === 'in_progress') {
      window.addEventListener('beforeunload', handleBeforeUnload)
      setShowLeaveWarning(true)
    } else {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      setShowLeaveWarning(false)
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [syncStatus?.overall_status])

  const fetchSyncStatus = useCallback(async () => {
    if (!brandId) return

    try {
      setIsLoading(true)
      
      // Fetch both platform connection sync status and demographics sync status
      const [connectionResponse, demographicsResponse] = await Promise.all([
        fetch(`/api/platforms/sync-status?brandId=${brandId}&platformType=meta`),
        fetch(`/api/test/demographics-sync?brandId=${brandId}`)
      ])

      const connectionData = await connectionResponse.json()
      const demographicsData = await demographicsResponse.json()

      console.log('[UnifiedMetaSyncStatus] Connection data:', connectionData)
      console.log('[UnifiedMetaSyncStatus] Demographics data:', demographicsData)

      // Build unified status with real data
      const campaignProgress = getCampaignProgress(connectionData)
      const demographicsProgress = demographicsData.syncStatus?.progress_percentage || 0
      const insightsProgress = getInsightsProgress(connectionData)

      const phases: SyncPhase[] = [
        {
          id: 'campaigns',
          name: 'Campaigns & Ads',
          icon: <BarChart3 className="h-4 w-4" />,
          status: getPhaseStatus(connectionData.sync_status, 'campaigns'),
          progress: campaignProgress,
          estimated_time: '2-5 minutes'
        },
        {
          id: 'demographics',
          name: 'Demographics Data',
          icon: <Users className="h-4 w-4" />,
          status: getPhaseStatus(demographicsData.syncStatus?.overall_status, 'demographics'),
          progress: demographicsProgress,
          estimated_time: '5-15 minutes'
        },
        {
          id: 'insights',
          name: 'Historical Insights',
          icon: <Database className="h-4 w-4" />,
          status: getPhaseStatus(connectionData.sync_status, 'insights'),
          progress: insightsProgress,
          estimated_time: '3-8 minutes'
        }
      ]

      // Calculate overall progress as average of all phase progress
      const totalProgress = phases.reduce((sum, phase) => sum + phase.progress, 0)
      const overallProgress = Math.round(totalProgress / phases.length)
      
      const hasInProgressPhases = phases.some(p => p.status === 'in_progress')
      const hasFailedPhases = phases.some(p => p.status === 'failed')
      const allCompleted = phases.every(p => p.status === 'completed')

      let overallStatus: UnifiedSyncStatus['overall_status'] = 'not_started'
      if (allCompleted) {
        overallStatus = 'completed'
        if (onSyncComplete) {
          onSyncComplete()
        }
      } else if (hasFailedPhases) {
        overallStatus = 'failed'
      } else if (hasInProgressPhases) {
        overallStatus = 'in_progress'
      }

      setSyncStatus({
        overall_status: overallStatus,
        overall_progress: overallProgress,
        phases,
        estimated_completion: calculateEstimatedCompletion(phases),
        time_remaining: calculateTimeRemaining(phases),
        started_at: connectionData.started_at,
        completed_at: allCompleted ? new Date().toISOString() : undefined
      })

    } catch (error) {
      console.error('Error fetching unified sync status:', error)
    } finally {
      setIsLoading(false)
    }
  }, [brandId, onSyncComplete])

  // Helper functions
  const getCampaignProgress = (connectionData: any): number => {
    if (!connectionData.success) return 0
    
    // Use API-calculated campaign progress if available
    if (typeof connectionData.campaign_progress === 'number') {
      return connectionData.campaign_progress
    }
    
    // Fallback to connection sync status
    switch (connectionData.sync_status) {
      case 'completed':
        return 100
      case 'in_progress':
      case 'syncing':
        return 50 // Assume halfway through if no job data
      default:
        return 0
    }
  }

  const getInsightsProgress = (connectionData: any): number => {
    if (!connectionData.success) return 0
    
    // Use API-calculated insight progress if available
    if (typeof connectionData.insight_progress === 'number') {
      return connectionData.insight_progress
    }
    
    // Fallback to connection sync status
    switch (connectionData.sync_status) {
      case 'completed':
        return 100
      case 'in_progress':
      case 'syncing':
        return 30 // Insights usually start after campaigns
      default:
        return 0
    }
  }

  const getPhaseStatus = (status: string, phase: string): SyncPhase['status'] => {
    if (!status) return 'pending'
    
    switch (status) {
      case 'in_progress':
      case 'syncing':
        return 'in_progress'
      case 'completed':
        return 'completed'
      case 'failed':
        return 'failed'
      default:
        return 'pending'
    }
  }

  const getPhaseProgress = (status: string, phase: string): number => {
    if (!status) return 0
    
    switch (status) {
      case 'completed':
        return 100
      case 'in_progress':
      case 'syncing':
        return 45 // Show partial progress
      default:
        return 0
    }
  }

  const calculateEstimatedCompletion = (phases: SyncPhase[]): string => {
    const inProgressPhases = phases.filter(p => p.status === 'in_progress' || p.status === 'pending')
    if (inProgressPhases.length === 0) return ''
    
    // Estimate 8 minutes total for all phases
    const estimatedMinutes = inProgressPhases.length * 5
    const completionTime = new Date()
    completionTime.setMinutes(completionTime.getMinutes() + estimatedMinutes)
    
    return completionTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const calculateTimeRemaining = (phases: SyncPhase[]): string => {
    const inProgressPhases = phases.filter(p => p.status === 'in_progress' || p.status === 'pending')
    if (inProgressPhases.length === 0) return ''
    
    const estimatedMinutes = inProgressPhases.length * 5
    return `~${estimatedMinutes} minutes remaining`
  }

  const getStatusIcon = () => {
    switch (syncStatus?.overall_status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'in_progress':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusBadgeColor = () => {
    switch (syncStatus?.overall_status) {
      case 'completed':
        return 'bg-green-950/30 text-green-500 border-green-800/50'
      case 'failed':
        return 'bg-red-950/30 text-red-500 border-red-800/50'
      case 'in_progress':
        return 'bg-blue-950/30 text-blue-400 border-blue-800/50'
      default:
        return 'bg-gray-950/30 text-gray-400 border-gray-800/50'
    }
  }

  // Polling for updates during sync
  useEffect(() => {
    fetchSyncStatus()
    
    const interval = setInterval(() => {
      fetchSyncStatus() // Always poll to catch status changes
    }, 2000) // Poll every 2 seconds for real-time updates
    
    return () => clearInterval(interval)
  }, [fetchSyncStatus])

  if (!isVisible || !syncStatus) {
    return null
  }

  return (
    <div className="space-y-4">
      {/* Leave warning */}
      {showLeaveWarning && (
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <AlertCircle className="h-4 w-4 text-amber-400" />
          <AlertDescription className="text-amber-200">
            <strong>Sync in progress!</strong> Please don't leave this page until sync is complete to avoid interruption.
          </AlertDescription>
        </Alert>
      )}

      {/* Main sync status */}
      <div className="bg-[#111] border border-[#333] rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <h3 className="text-sm font-medium text-white">Meta Data Sync</h3>
            <Badge className={`text-xs px-2 py-0.5 ${getStatusBadgeColor()}`}>
              {syncStatus.overall_status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
          {isLoading && <RefreshCw className="h-4 w-4 text-gray-400 animate-spin" />}
        </div>

        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Overall Progress</span>
            <span className="text-white font-mono">{syncStatus.overall_progress}%</span>
          </div>
          <Progress 
            value={syncStatus.overall_progress} 
            className="h-2 bg-[#222]"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{syncStatus.time_remaining}</span>
            {syncStatus.estimated_completion && (
              <span>ETA: {syncStatus.estimated_completion}</span>
            )}
          </div>
        </div>

        {/* Phase breakdown */}
        <div className="space-y-3">
          <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide">Sync Phases</h4>
          {syncStatus.phases.map((phase) => (
            <div key={phase.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {phase.icon}
                  <span className="text-sm text-white">{phase.name}</span>
                  <Badge 
                    className={`text-xs px-1.5 py-0 ${
                      phase.status === 'completed' ? 'bg-green-950/30 text-green-500' :
                      phase.status === 'in_progress' ? 'bg-blue-950/30 text-blue-400' :
                      phase.status === 'failed' ? 'bg-red-950/30 text-red-500' :
                      'bg-gray-950/30 text-gray-400'
                    }`}
                  >
                    {phase.status === 'in_progress' ? 'Syncing...' : 
                     phase.status === 'completed' ? 'Done' :
                     phase.status === 'failed' ? 'Failed' : 'Waiting'}
                  </Badge>
                </div>
                <span className="text-xs text-gray-500">{phase.estimated_time}</span>
              </div>
              <Progress 
                value={phase.progress} 
                className="h-1.5 bg-[#222]"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

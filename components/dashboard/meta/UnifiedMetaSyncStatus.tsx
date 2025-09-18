"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, Clock, RefreshCw, Loader2, Database, Users, BarChart3 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Extend window type for sync timing
declare global {
  interface Window {
    _syncStartTime?: number
  }
}

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
        fetch(`/api/meta/demographics/data?brandId=${brandId}&breakdown=age_gender&limit=1`)
      ])

      const connectionData = await connectionResponse.json()
      const demographicsData = await demographicsResponse.json()

      // Debug logging (can be removed later)
      if (connectionData.sync_status === 'in_progress') {
        console.log('[UnifiedMetaSyncStatus] Sync active, API data:', {
          sync_status: connectionData.sync_status,
          campaign_progress: connectionData.campaign_progress,
          recent_jobs_count: connectionData.recent_jobs?.length,
          demographics_has_data: demographicsData.success && demographicsData.data?.length > 0
        })
      }

      // Build unified status with real data
      const campaignProgress = getCampaignProgress(connectionData)
      
      // Get demographics progress - check if we have demographics data in the simple table
      let demographicsProgress = 0
      
      // Check if we have demographics data (simple approach)
      if (demographicsData.success && demographicsData.data && demographicsData.data.length > 0) {
        // We have demographics data - assume completed
        demographicsProgress = 100
      } else if (connectionData.sync_status === 'completed') {
        // Sync is marked as completed - assume demographics are done
        demographicsProgress = 100
      } else if (connectionData.sync_status === 'in_progress') {
        // Sync is active but no demographics data yet - show progress
        const now = Date.now()
        const elapsedSeconds = Math.floor((now - (window._syncStartTime || now)) / 1000)
        demographicsProgress = Math.min(95, 10 + Math.floor(elapsedSeconds / 2)) // Gradual increase
      } else {
        // No sync active and no data - show 0%
        demographicsProgress = 0
      }
      
      const insightsProgress = getInsightsProgress(connectionData)

      const hasDemographicsData = demographicsData.success && demographicsData.data && demographicsData.data.length > 0
      let demographicsPhaseStatus: SyncPhase['status'] = 'pending'
      if (hasDemographicsData || connectionData.sync_status === 'completed') {
        demographicsPhaseStatus = 'completed'
      } else if (connectionData.sync_status === 'in_progress') {
        demographicsPhaseStatus = 'in_progress'
      }

      // Show calculated progress during active sync
      if (connectionData.sync_status === 'in_progress') {
        console.log('[UnifiedMetaSyncStatus] Progress update:', {
          campaignProgress,
          demographicsProgress,
          insightsProgress,
          overall: Math.round((campaignProgress + demographicsProgress + insightsProgress) / 3)
        })
      }

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
          status: demographicsPhaseStatus,
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
        // Clean up sync timing when completed
        if (window._syncStartTime) {
          delete window._syncStartTime
        }
        if (onSyncComplete) {
          onSyncComplete()
        }
      } else if (hasFailedPhases) {
        overallStatus = 'failed'
        // Clean up sync timing on failure too
        if (window._syncStartTime) {
          delete window._syncStartTime
        }
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
    if (typeof connectionData.campaign_progress === 'number' && connectionData.campaign_progress > 0) {
      return connectionData.campaign_progress
    }
    
    // If sync is in progress but no jobs yet, show steadily increasing progress
    if (connectionData.sync_status === 'in_progress' || connectionData.sync_status === 'syncing') {
      // Show steady progress from 15% to 85% over time (not cycling)
      const now = Date.now()
      const elapsedSeconds = Math.floor((now - (window._syncStartTime || now)) / 1000)
      const animatedProgress = Math.min(85, 15 + Math.floor(elapsedSeconds / 2)) // Increase by 0.5% every second
      
      // Store sync start time if not already set
      if (!window._syncStartTime) {
        window._syncStartTime = now
      }
      
      return animatedProgress
    }
    
    // Fallback to connection sync status
    switch (connectionData.sync_status) {
      case 'completed':
        return 100
      default:
        return 0
    }
  }

  const getInsightsProgress = (connectionData: any): number => {
    if (!connectionData.success) return 0
    
    // Use API-calculated insight progress if available
    if (typeof connectionData.insight_progress === 'number' && connectionData.insight_progress > 0) {
      return connectionData.insight_progress
    }
    
    // If sync is in progress but no jobs yet, show steadily increasing progress (behind campaigns)
    if (connectionData.sync_status === 'in_progress' || connectionData.sync_status === 'syncing') {
      // Show steady progress from 10% to 75% over time, slower than campaigns
      const now = Date.now()
      const elapsedSeconds = Math.floor((now - (window._syncStartTime || now)) / 1000)
      const animatedProgress = Math.min(75, 10 + Math.floor(elapsedSeconds / 3)) // Increase by 0.33% every second (slower)
      
      return animatedProgress
    }
    
    // Fallback to connection sync status
    switch (connectionData.sync_status) {
      case 'completed':
        return 100
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

  // Initial fetch and smart polling only when sync is active
  useEffect(() => {
    fetchSyncStatus()
  }, [brandId, connectionId]) // Only refetch when brand/connection changes

  // Smart polling - only poll when sync is actually in progress
  useEffect(() => {
    if (!syncStatus) return

    const isActiveSync = syncStatus.overall_status === 'in_progress' || 
                         syncStatus.sync_status === 'in_progress'
    
    if (isActiveSync) {
      const interval = setInterval(() => {
        fetchSyncStatus()
      }, 5000) // Poll every 5 seconds during active sync only
      
      return () => clearInterval(interval)
    }
  }, [syncStatus?.overall_status, syncStatus?.sync_status, brandId])

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

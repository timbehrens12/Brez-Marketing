'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle, Clock, Database, RefreshCw, X } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

interface SyncStatus {
  connectionId: string
  brandId: string
  shop: string
  overallStatus: 'pending' | 'in_progress' | 'bulk_importing' | 'completed' | 'failed'
  lastSyncedAt: string
  miniSyncCompleted: boolean
  bulkJobs: {
    id: string
    type: string
    status: string
    recordsProcessed?: number
    createdAt: string
    completedAt?: string
  }[]
  progress: {
    totalJobs: number
    completedJobs: number
    failedJobs: number
    runningJobs: number
    percentComplete: number
  }
  metadata?: any
}

interface SyncStatusWidgetProps {
  brandId?: string
  connectionId?: string
  className?: string
  showDetails?: boolean
  onComplete?: () => void
}

export function SyncStatusWidget({ 
  brandId, 
  connectionId, 
  className = "",
  showDetails = true,
  onComplete 
}: SyncStatusWidgetProps) {
  const [syncStatuses, setSyncStatuses] = useState<SyncStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)

  const fetchSyncStatus = async () => {
    try {
      // Use the new V2 sync status API if brandId is available
      if (brandId) {
        const response = await fetch(`/api/sync/${brandId}/status`)
        if (response.ok) {
          const data = await response.json()
          
          // Check if sync is actually active
          const isActive = data.shopify?.overall_status === 'syncing' || data.shopify?.overall_status === 'partial'
          
          if (isActive) {
            // Convert V2 format to widget format
            const mockStatus: SyncStatus = {
              connectionId: 'v2-sync',
              brandId: brandId,
              shop: 'Shopify Store',
              overallStatus: 'bulk_importing',
              lastSyncedAt: data.shopify.last_update,
              miniSyncCompleted: true,
              bulkJobs: data.shopify.milestones?.map((m: any) => ({
                id: m.entity,
                type: m.entity,
                status: m.status,
                recordsProcessed: m.progress?.rows_written || 0,
                createdAt: new Date().toISOString(),
                completedAt: m.status === 'completed' ? new Date().toISOString() : undefined
              })) || [],
              progress: {
                totalJobs: data.shopify.milestones?.length || 0,
                completedJobs: data.shopify.milestones?.filter((m: any) => m.status === 'completed').length || 0,
                failedJobs: data.shopify.milestones?.filter((m: any) => m.status === 'failed').length || 0,
                runningJobs: data.shopify.milestones?.filter((m: any) => m.status === 'running').length || 0,
                percentComplete: Math.round((data.shopify.milestones?.filter((m: any) => m.status === 'completed').length || 0) / (data.shopify.milestones?.length || 1) * 100)
              }
            }
            setSyncStatuses([mockStatus])
          } else {
            // No active sync, hide widget
            setSyncStatuses([])
          }
        } else {
          // API error, hide widget
          setSyncStatuses([])
        }
      } else {
        // Fallback to old API for legacy support
        const params = new URLSearchParams()
        if (connectionId) params.append('connectionId', connectionId)
        
        const response = await fetch(`/api/shopify/sync/status?${params}`)
        const data = await response.json()
        
        setSyncStatuses(data.syncStatuses || [])
      }
      
    } catch (error) {
      // Error fetching sync status
      setSyncStatuses([]) // Hide widget on error
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSyncStatus()
    
    // Poll for updates every 10 seconds
    const interval = setInterval(fetchSyncStatus, 10000)
    return () => clearInterval(interval)
  }, [brandId, connectionId])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'bulk_importing':
      case 'in_progress':
        return <RefreshCw className="h-4 w-4 text-white animate-spin" />
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusText = (status: string, miniSyncCompleted: boolean) => {
    switch (status) {
      case 'completed':
        return 'Import Complete'
      case 'failed':
        return 'Import Failed'
      case 'bulk_importing':
        return miniSyncCompleted ? 'Importing History...' : 'Starting Import...'
      case 'in_progress':
        return 'Initializing...'
      default:
        return 'Pending'
    }
  }

  const getJobTypeLabel = (type: string) => {
    switch (type) {
      case 'orders':
        return 'Orders'
      case 'customers':
        return 'Customers'
      case 'products':
        return 'Products'
      default:
        return type.charAt(0).toUpperCase() + type.slice(1)
    }
  }

  // Don't show loading state if we're not showing details
  if (loading && !showDetails) {
    return null
  }

  if (loading) {
    return (
      <Card className={`${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm">Checking sync status...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!syncStatuses.length) {
    return null
  }

  const activeSyncs = syncStatuses.filter(status => 
    ['bulk_importing', 'in_progress'].includes(status.overallStatus)
  )

  if (!activeSyncs.length && !showDetails) {
    return null
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Card className="w-80 shadow-lg">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Data Sync Active</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(false)}
                className="h-6 w-6 p-0"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <Card className={`${className} relative`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Database className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-base">Shopify Data Sync</CardTitle>
          </div>
          {activeSyncs.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(true)}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {syncStatuses.map((status) => (
          <div key={status.connectionId} className="space-y-3">
            {/* Main Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getStatusIcon(status.overallStatus)}
                <span className="font-medium">{status.shop}</span>
                <Badge variant="outline" className="text-xs">
                  {getStatusText(status.overallStatus, status.miniSyncCompleted)}
                </Badge>
              </div>
              
              {status.overallStatus === 'bulk_importing' && (
                <span className="text-sm text-muted-foreground">
                  {status.progress.percentComplete}%
                </span>
              )}
            </div>

            {/* Progress Bar */}
            {status.overallStatus === 'bulk_importing' && (
              <div className="space-y-2">
                <Progress value={status.progress.percentComplete} className="h-2" />
                <div className="text-xs text-muted-foreground">
                  {status.progress.completedJobs} of {status.progress.totalJobs} data exports complete
                </div>
              </div>
            )}

            {/* Mini-sync Status */}
            {status.miniSyncCompleted && status.overallStatus === 'bulk_importing' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-green-800">
                    Recent data is live now
                  </span>
                </div>
                <p className="text-xs text-green-600 mt-1">
                  Your dashboard is populated with the last 3 days of data while we import your complete history.
                </p>
              </div>
            )}

            {/* Detailed Job Status */}
            {showDetails && status.bulkJobs.length > 0 && (
              <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-start p-0 h-auto">
                    <span className="text-xs text-muted-foreground">
                      {isExpanded ? 'Hide' : 'Show'} import details
                    </span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2">
                  {status.bulkJobs.map((job) => (
                    <div key={job.id} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(job.status)}
                        <span>{getJobTypeLabel(job.type)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {job.recordsProcessed && (
                          <span>{job.recordsProcessed.toLocaleString()} records</span>
                        )}
                      </div>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Error State */}
            {status.overallStatus === 'failed' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium text-red-800">
                    Import failed
                  </span>
                </div>
                <p className="text-xs text-red-600 mt-1">
                  Please try reconnecting your store or contact support if the issue persists.
                </p>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

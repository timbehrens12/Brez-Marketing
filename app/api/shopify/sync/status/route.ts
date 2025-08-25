import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { auth } from '@clerk/nextjs/server'

export interface SyncStatus {
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

// Get sync status for user's connections
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const connectionId = searchParams.get('connectionId')
    const brandId = searchParams.get('brandId')
    
    const supabase = createClient()
    
    // Build query
    let query = supabase
      .from('platform_connections')
      .select(`
        id,
        brand_id,
        shop,
        sync_status,
        last_synced_at,
        metadata,
        shopify_bulk_jobs (
          job_id,
          job_type,
          status,
          records_processed,
          created_at,
          completed_at
        )
      `)
      .eq('user_id', userId)
      .eq('platform_type', 'shopify')
    
    if (connectionId) {
      query = query.eq('id', connectionId)
    }
    
    if (brandId) {
      query = query.eq('brand_id', brandId)
    }
    
    const { data: connections, error } = await query
    
    if (error) {
      console.error('[Sync Status] Error fetching connections:', error)
      return NextResponse.json({ error: 'Failed to fetch sync status' }, { status: 500 })
    }
    
    if (!connections?.length) {
      return NextResponse.json({ syncStatuses: [] })
    }
    
    // Transform data into sync status format
    const syncStatuses: SyncStatus[] = connections.map(connection => {
      const bulkJobs = connection.shopify_bulk_jobs || []
      
      const totalJobs = bulkJobs.length
      const completedJobs = bulkJobs.filter(job => job.status === 'COMPLETED').length
      const failedJobs = bulkJobs.filter(job => job.status === 'FAILED').length
      const runningJobs = bulkJobs.filter(job => ['RUNNING', 'CREATED'].includes(job.status)).length
      
      const percentComplete = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0
      
      return {
        connectionId: connection.id,
        brandId: connection.brand_id,
        shop: connection.shop,
        overallStatus: connection.sync_status,
        lastSyncedAt: connection.last_synced_at,
        miniSyncCompleted: connection.metadata?.mini_sync_completed || false,
        bulkJobs: bulkJobs.map(job => ({
          id: job.job_id,
          type: job.job_type,
          status: job.status,
          recordsProcessed: job.records_processed,
          createdAt: job.created_at,
          completedAt: job.completed_at
        })),
        progress: {
          totalJobs,
          completedJobs,
          failedJobs,
          runningJobs,
          percentComplete
        },
        metadata: connection.metadata
      }
    })
    
    // If requesting a specific connection, return single object
    if (connectionId && syncStatuses.length === 1) {
      return NextResponse.json({ syncStatus: syncStatuses[0] })
    }
    
    return NextResponse.json({ syncStatuses })
    
  } catch (error) {
    console.error('[Sync Status] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update sync status (for internal use)
export async function POST(request: NextRequest) {
  try {
    const { connectionId, status, metadata } = await request.json()
    
    if (!connectionId || !status) {
      return NextResponse.json({ error: 'connectionId and status are required' }, { status: 400 })
    }
    
    const supabase = createClient()
    
    const updateData: any = {
      sync_status: status,
      last_synced_at: new Date().toISOString()
    }
    
    if (metadata) {
      updateData.metadata = metadata
    }
    
    const { error } = await supabase
      .from('platform_connections')
      .update(updateData)
      .eq('id', connectionId)
    
    if (error) {
      console.error('[Sync Status] Error updating status:', error)
      return NextResponse.json({ error: 'Failed to update sync status' }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('[Sync Status] Error updating status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

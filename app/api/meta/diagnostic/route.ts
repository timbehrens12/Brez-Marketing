import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { auth } from '@clerk/nextjs'

/**
 * PRODUCTION-SAFE DIAGNOSTIC - Check Meta connection status and trigger manual sync
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { brandId } = await request.json()
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
    }

    const supabase = createClient()
    
    // Check if connection exists
    const { data: connections } = await supabase
      .from('platform_connections')
      .select('id, status, sync_status, access_token, created_at')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .order('created_at', { ascending: false })
      .limit(3)

    if (!connections || connections.length === 0) {
      return NextResponse.json({
        success: false,
        issue: 'no_connection',
        message: 'No Meta connection found. Please reconnect Meta account.',
        action: 'reconnect'
      })
    }

    const activeConnection = connections.find(c => c.status === 'active')
    
    if (!activeConnection) {
      // Try to reactivate the most recent connection
      const mostRecent = connections[0]
      
      const { error: updateError } = await supabase
        .from('platform_connections')
        .update({ 
          status: 'active',
          sync_status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', mostRecent.id)

      if (updateError) {
        return NextResponse.json({
          success: false,
          issue: 'update_failed',
          message: 'Failed to reactivate connection',
          error: updateError.message
        })
      }

      return NextResponse.json({
        success: true,
        issue: 'reactivated',
        message: 'Connection reactivated. Try checking data now.',
        action: 'check_data'
      })
    }

    // Connection exists and is active - try a simple manual sync
    try {
      const { fetchMetaAdInsights } = await import('@/lib/services/meta-service')
      
      // Try to sync last 7 days
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(endDate.getDate() - 7)

      const result = await fetchMetaAdInsights(brandId, startDate, endDate, false, true) // Skip demographics

      return NextResponse.json({
        success: result.success,
        issue: result.success ? 'sync_completed' : 'sync_failed',
        message: result.success ? 'Manual sync completed successfully' : 'Sync failed',
        syncResult: {
          success: result.success,
          count: result.count || 0,
          error: result.error
        },
        action: result.success ? 'check_dashboard' : 'check_logs'
      })

    } catch (syncError) {
      return NextResponse.json({
        success: false,
        issue: 'sync_error',
        message: 'Sync encountered an error',
        error: syncError.message,
        action: 'check_token'
      })
    }

  } catch (error) {
    return NextResponse.json({
      success: false,
      issue: 'system_error',
      message: 'System error occurred',
      error: error.message
    }, { status: 500 })
  }
}

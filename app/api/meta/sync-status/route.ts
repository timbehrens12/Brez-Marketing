import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

/**
 * CHECK META SYNC STATUS: Monitor progress of background sync
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
    }

    const supabase = createClient()

    // 1. Get current sync status
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('sync_status, last_synced_at, updated_at')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .single()

    if (connectionError) {
      return NextResponse.json({ 
        error: 'Meta connection not found',
        details: connectionError.message 
      }, { status: 400 })
    }

    // 2. Get data coverage summary
    const { data: monthlyCoverage } = await supabase
      .from('meta_ad_insights')
      .select('date')
      .eq('brand_id', brandId)
      .gte('date', '2025-03-01')
      .lte('date', '2025-09-22')

    // Calculate monthly coverage
    const monthlyBreakdown = {
      'March 2025': 0,
      'April 2025': 0,
      'May 2025': 0,
      'June 2025': 0,
      'July 2025': 0,
      'August 2025': 0,
      'September 2025': 0
    }

    if (monthlyCoverage) {
      monthlyCoverage.forEach(record => {
        const date = new Date(record.date)
        const month = date.getMonth() + 1
        const year = date.getFullYear()
        
        if (year === 2025) {
          switch (month) {
            case 3: monthlyBreakdown['March 2025']++; break
            case 4: monthlyBreakdown['April 2025']++; break
            case 5: monthlyBreakdown['May 2025']++; break
            case 6: monthlyBreakdown['June 2025']++; break
            case 7: monthlyBreakdown['July 2025']++; break
            case 8: monthlyBreakdown['August 2025']++; break
            case 9: monthlyBreakdown['September 2025']++; break
          }
        }
      })
    }

    // 3. Calculate progress percentage
    const totalRecords = monthlyCoverage?.length || 0
    const completedMonths = Object.values(monthlyBreakdown).filter(count => count > 0).length
    const progressPercentage = Math.round((completedMonths / 7) * 100)

    // 4. Determine status message
    let statusMessage = ''
    let isComplete = false
    
    if (connection.sync_status === 'completed') {
      statusMessage = completedMonths === 7 ? 
        '✅ Complete: All 7 months synced successfully' :
        `⚠️ Partially complete: ${completedMonths}/7 months synced`
      isComplete = true
    } else if (connection.sync_status === 'in_progress') {
      statusMessage = `🔄 In progress: ${completedMonths}/7 months completed (${progressPercentage}%)`
    } else if (connection.sync_status === 'failed') {
      statusMessage = `❌ Failed: ${completedMonths}/7 months completed before failure`
    } else {
      statusMessage = `⏳ ${connection.sync_status}: ${completedMonths}/7 months completed`
    }

    return NextResponse.json({
      brandId,
      syncStatus: connection.sync_status,
      lastSynced: connection.last_synced_at,
      updatedAt: connection.updated_at,
      progress: {
        percentage: progressPercentage,
        completedMonths,
        totalMonths: 7,
        message: statusMessage
      },
      dataBreakdown: {
        totalRecords,
        monthlyBreakdown,
        dateRange: {
          earliest: monthlyCoverage?.[0]?.date || null,
          latest: monthlyCoverage?.[monthlyCoverage.length - 1]?.date || null
        }
      },
      isComplete,
      nextAction: isComplete ? 
        'Refresh your dashboard to see the complete data' :
        'Wait for background sync to complete, then check again'
    })

  } catch (error) {
    console.error('Error checking sync status:', error)
    
    return NextResponse.json({
      error: 'Failed to check sync status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
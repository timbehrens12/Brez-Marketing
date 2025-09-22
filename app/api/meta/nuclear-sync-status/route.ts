import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

/**
 * NUCLEAR SYNC STATUS: Monitor progress of queued nuclear sync
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

    console.log(`📊 [Nuclear Sync Status] Checking progress for brand ${brandId}`)

    const supabase = createClient()

    // 1. Get connection status
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('sync_status, last_synced_at, updated_at')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .single()

    if (connectionError) {
      return NextResponse.json({ 
        error: 'Connection not found',
        details: connectionError.message 
      }, { status: 400 })
    }

    // 2. Check data coverage by month
    const { data: monthlyData, error: monthlyError } = await supabase
      .from('meta_ad_insights')
      .select('date, spend, reach')
      .eq('brand_id', brandId)
      .gte('date', '2025-03-01')
      .lte('date', '2025-09-22')
      .order('date')

    if (monthlyError) {
      console.error('Error fetching monthly data:', monthlyError)
    }

    // 3. Analyze data coverage
    const monthlyBreakdown = {}
    const expectedMonths = [
      '2025-03', '2025-04', '2025-05', '2025-06', 
      '2025-07', '2025-08', '2025-09'
    ]

    // Initialize months
    expectedMonths.forEach(month => {
      monthlyBreakdown[month] = {
        records: 0,
        totalSpend: 0,
        totalReach: 0,
        dateRange: '',
        status: 'missing'
      }
    })

    // Fill with actual data
    if (monthlyData) {
      monthlyData.forEach(record => {
        const month = record.date.substring(0, 7) // YYYY-MM
        if (monthlyBreakdown[month]) {
          monthlyBreakdown[month].records++
          monthlyBreakdown[month].totalSpend += parseFloat(record.spend || 0)
          monthlyBreakdown[month].totalReach += parseInt(record.reach || 0)
          monthlyBreakdown[month].status = 'has_data'
          
          if (!monthlyBreakdown[month].dateRange) {
            monthlyBreakdown[month].dateRange = record.date
          } else {
            monthlyBreakdown[month].dateRange = `${monthlyBreakdown[month].dateRange.split(' to ')[0]} to ${record.date}`
          }
        }
      })
    }

    // 4. Calculate overall progress
    const totalRecords = monthlyData?.length || 0
    const monthsWithData = Object.values(monthlyBreakdown).filter((month: any) => month.status === 'has_data').length
    const completionPercentage = Math.round((monthsWithData / expectedMonths.length) * 100)

    // 5. Determine overall status
    let overallStatus = 'unknown'
    let message = ''

    if (connection.sync_status === 'in_progress') {
      overallStatus = 'in_progress'
      message = `Sync in progress... ${monthsWithData}/${expectedMonths.length} months completed`
    } else if (connection.sync_status === 'completed') {
      if (monthsWithData === expectedMonths.length) {
        overallStatus = 'completed'
        message = 'Nuclear sync completed successfully - all months have data!'
      } else {
        overallStatus = 'partial'
        message = `Sync marked complete but missing ${expectedMonths.length - monthsWithData} months`
      }
    } else if (connection.sync_status === 'failed') {
      overallStatus = 'failed'
      message = 'Sync failed - check logs for details'
    }

    return NextResponse.json({
      success: true,
      brandId,
      status: overallStatus,
      message,
      progress: {
        completionPercentage,
        monthsWithData,
        totalMonths: expectedMonths.length,
        totalRecords
      },
      connection: {
        syncStatus: connection.sync_status,
        lastSynced: connection.last_synced_at,
        lastUpdated: connection.updated_at
      },
      monthlyBreakdown: Object.entries(monthlyBreakdown).map(([month, data]: [string, any]) => ({
        month,
        ...data,
        monthName: new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      })),
      recommendations: {
        nextAction: overallStatus === 'completed' 
          ? 'Refresh your dashboard - all data should now be available!'
          : overallStatus === 'in_progress'
          ? 'Wait for background jobs to complete, then check status again'
          : overallStatus === 'partial'
          ? 'Consider running nuclear sync again for missing months'
          : 'Check error logs and retry nuclear sync',
        estimatedCompletion: overallStatus === 'in_progress' 
          ? `${(expectedMonths.length - monthsWithData) * 30} seconds remaining`
          : null
      }
    })

  } catch (error) {
    console.error('📊 [Nuclear Sync Status] Error:', error)
    return NextResponse.json({
      error: 'Failed to check nuclear sync status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

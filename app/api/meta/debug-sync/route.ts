import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

/**
 * DEBUG: Check what data is missing vs what should be there
 * This endpoint helps diagnose why the sync isn't pulling all data
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

    console.log(`🔍 [Meta Debug] Analyzing data completeness for brand ${brandId}`)

    const supabase = createClient()

    // Check what we have vs what we should have (March 21 - Sept 22 = ~185 days)
    const expectedStartDate = '2025-03-21'
    const expectedEndDate = '2025-09-22'
    const expectedDays = Math.ceil((new Date(expectedEndDate).getTime() - new Date(expectedStartDate).getTime()) / (1000 * 60 * 60 * 24))

    // 1. Check all Meta tables
    const tables = [
      'meta_ad_insights',
      'meta_adset_daily_insights', 
      'meta_campaigns',
      'meta_adsets',
      'meta_ads',
      'meta_demographics',
      'meta_device_performance'
    ]

    const dataStatus = {}

    for (const table of tables) {
      try {
        let query
        if (table === 'meta_demographics' || table === 'meta_device_performance') {
          query = supabase
            .from(table)
            .select('*')
            .eq('brand_id', brandId)
            .gte('date_range_start', expectedStartDate)
            .lte('date_range_start', expectedEndDate)
        } else if (table === 'meta_campaigns' || table === 'meta_adsets' || table === 'meta_ads') {
          query = supabase
            .from(table)
            .select('*')
            .eq('brand_id', brandId)
        } else {
          query = supabase
            .from(table)
            .select('*')
            .eq('brand_id', brandId)
            .gte('date', expectedStartDate)
            .lte('date', expectedEndDate)
        }

        const { data, error } = await query

        if (error) {
          dataStatus[table] = { error: error.message }
        } else {
          const uniqueDates = new Set()
          const reachValues = []
          
          if (data) {
            data.forEach(record => {
              const dateField = record.date || record.date_range_start
              if (dateField) uniqueDates.add(dateField)
              if (record.reach !== undefined) reachValues.push(record.reach)
            })
          }

          dataStatus[table] = {
            totalRecords: data?.length || 0,
            uniqueDates: uniqueDates.size,
            expectedDays,
            completeness: Math.round((uniqueDates.size / expectedDays) * 100),
            reachStats: reachValues.length > 0 ? {
              total: reachValues.length,
              zeros: reachValues.filter(r => r === 0 || r === null).length,
              nonZeros: reachValues.filter(r => r > 0).length,
              maxReach: Math.max(...reachValues.filter(r => r > 0), 0)
            } : null,
            sampleRecord: data?.[0] || null
          }
        }
      } catch (err) {
        dataStatus[table] = { error: `Table query failed: ${err}` }
      }
    }

    // 2. Check Meta connection status
    const { data: connection } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .single()

    // 3. Identify what's missing
    const issues = []
    
    Object.entries(dataStatus).forEach(([table, status]: [string, any]) => {
      if (status.error) {
        issues.push(`❌ ${table}: ${status.error}`)
      } else if (status.totalRecords === 0) {
        issues.push(`🚨 ${table}: COMPLETELY EMPTY (0 records)`)
      } else if (status.completeness < 80) {
        issues.push(`⚠️ ${table}: INCOMPLETE (${status.completeness}% of expected ${expectedDays} days)`)
      } else if (status.reachStats && status.reachStats.zeros > status.reachStats.nonZeros) {
        issues.push(`🔍 ${table}: REACH ISSUE (${status.reachStats.zeros} zeros vs ${status.reachStats.nonZeros} valid)`)
      }
    })

    return NextResponse.json({
      brandId,
      expectedDateRange: { from: expectedStartDate, to: expectedEndDate },
      expectedDays,
      dataStatus,
      connection: {
        status: connection?.status,
        syncStatus: connection?.sync_status,
        lastSynced: connection?.last_synced_at,
        hasToken: !!connection?.access_token
      },
      issues,
      summary: {
        totalIssues: issues.length,
        recommendation: issues.length === 0 
          ? '✅ Data looks complete!' 
          : '🚨 Major data gaps found - sync is not working properly'
      }
    })

  } catch (error) {
    console.error('❌ [Meta Debug] Error:', error)
    return NextResponse.json({
      error: 'Failed to analyze Meta data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

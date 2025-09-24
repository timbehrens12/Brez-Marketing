import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'

// 🚀 SMART HISTORICAL SYNC: Only fills gaps, leverages existing data
export async function POST(request: NextRequest) {
  try {
    console.log(`[Smart Historical Sync] 🎯 Starting intelligent gap-filling sync...`)

    // 🚨 ALLOW SERVER CALLS: Same logic as other endpoints
    const userAgent = request.headers.get('User-Agent') || ''
    const isServerCall = userAgent.includes('node') || request.headers.get('X-Vercel-ID')
    
    let userId = null
    if (!isServerCall) {
      const authResult = await auth()
      userId = authResult.userId
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    } else {
      console.log(`[Smart Historical Sync] Server call detected, proceeding without user auth`)
    }

    const { brandId } = await request.json()
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
    }

    // Initialize Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get Meta connection
    const { data: connection } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single()

    if (!connection?.access_token) {
      return NextResponse.json({ error: 'No active Meta connection found' }, { status: 404 })
    }

    const adAccountId = connection.metadata?.ad_account_id
    if (!adAccountId) {
      return NextResponse.json({ error: 'No ad account ID found' }, { status: 400 })
    }

    console.log(`[Smart Historical Sync] Using ad account: ${adAccountId}`)

    // 🔍 ANALYZE EXISTING DATA: Find gaps in the last 12 months
    const now = new Date()
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1) // Start of 12 months ago
    
    console.log(`[Smart Historical Sync] 🔍 Analyzing data gaps from ${twelveMonthsAgo.toISOString().split('T')[0]} to ${now.toISOString().split('T')[0]}`)

    // Check what data we already have
    const { data: existingInsights } = await supabase
      .from('meta_adset_daily_insights')
      .select('date')
      .eq('brand_id', brandId)
      .gte('date', twelveMonthsAgo.toISOString().split('T')[0])
      .lte('date', now.toISOString().split('T')[0])
      .order('date')

    // Create list of all days in the 12-month period
    const allDays = []
    const currentDay = new Date(twelveMonthsAgo)
    while (currentDay <= now) {
      allDays.push(currentDay.toISOString().split('T')[0])
      currentDay.setDate(currentDay.getDate() + 1)
    }

    // Find missing days
    const existingDates = new Set(existingInsights?.map(insight => insight.date) || [])
    const missingDays = allDays.filter(day => !existingDates.has(day))

    console.log(`[Smart Historical Sync] 📊 Data analysis:`)
    console.log(`[Smart Historical Sync] - Total days in 12 months: ${allDays.length}`)
    console.log(`[Smart Historical Sync] - Days with data: ${existingDates.size}`)
    console.log(`[Smart Historical Sync] - Missing days: ${missingDays.length}`)

    if (missingDays.length === 0) {
      console.log(`[Smart Historical Sync] ✅ NO GAPS FOUND! All 12 months of data already present`)
      
      // Force data aggregation to ensure consistency
      await supabase.rpc('aggregate_meta_data', { target_brand_id: brandId })
      
      return NextResponse.json({
        success: true,
        message: 'No gaps found - all 12 months of data already present',
        analysis: {
          totalDays: allDays.length,
          daysWithData: existingDates.size,
          missingDays: 0,
          dataCompleteness: '100%'
        },
        action: 'aggregated_existing_data'
      })
    }

    // 🚀 SMART SYNC: Only sync the missing gaps (much faster!)
    console.log(`[Smart Historical Sync] 🚀 Syncing only ${missingDays.length} missing days (not all ${allDays.length} days)`)
    
    // Group missing days into contiguous ranges for efficient API calls
    const missingRanges = []
    let currentRange = { start: missingDays[0], end: missingDays[0] }
    
    for (let i = 1; i < missingDays.length; i++) {
      const currentDay = new Date(missingDays[i])
      const rangeEnd = new Date(currentRange.end)
      rangeEnd.setDate(rangeEnd.getDate() + 1)
      
      if (currentDay.getTime() === rangeEnd.getTime()) {
        // Contiguous day, extend range
        currentRange.end = missingDays[i]
      } else {
        // Gap found, start new range
        missingRanges.push(currentRange)
        currentRange = { start: missingDays[i], end: missingDays[i] }
      }
    }
    missingRanges.push(currentRange) // Add final range

    console.log(`[Smart Historical Sync] 📦 Grouped ${missingDays.length} missing days into ${missingRanges.length} ranges:`)
    missingRanges.forEach((range, i) => {
      const days = Math.ceil((new Date(range.end).getTime() - new Date(range.start).getTime()) / (1000 * 60 * 60 * 24)) + 1
      console.log(`[Smart Historical Sync]   ${i+1}. ${range.start} to ${range.end} (${days} days)`)
    })

    // 🎯 SYNC ONLY THE GAPS (super fast!)
    const { fetchMetaAdInsights } = await import('@/lib/services/meta-service')
    
    let totalSynced = 0
    let errors = []

    for (const range of missingRanges) {
      try {
        console.log(`[Smart Historical Sync] 🔄 Syncing gap: ${range.start} to ${range.end}`)
        
        const result = await fetchMetaAdInsights(
          brandId,
          new Date(range.start),
          new Date(range.end),
          false, // dryRun = false
          false  // skipDemographics = false
        )

        if (result.success) {
          totalSynced += result.count || 0
          console.log(`[Smart Historical Sync] ✅ Gap filled: ${range.start} to ${range.end} (${result.count} insights)`)
        } else {
          console.warn(`[Smart Historical Sync] ⚠️ Gap sync failed: ${range.start} to ${range.end} - ${result.error}`)
          errors.push(`${range.start} to ${range.end}: ${result.error}`)
        }

        // Small delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (rangeError) {
        console.error(`[Smart Historical Sync] ❌ Exception syncing ${range.start} to ${range.end}:`, rangeError)
        errors.push(`${range.start} to ${range.end}: ${rangeError instanceof Error ? rangeError.message : String(rangeError)}`)
      }
    }

    // Force data aggregation
    console.log(`[Smart Historical Sync] 🔄 Force aggregating all data...`)
    await supabase.rpc('aggregate_meta_data', { target_brand_id: brandId })

    // Update connection status
    await supabase
      .from('platform_connections')
      .update({
        sync_status: 'completed',
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')

    const successRate = Math.round(((missingRanges.length - errors.length) / missingRanges.length) * 100)

    console.log(`[Smart Historical Sync] ✅ COMPLETE! Synced ${totalSynced} insights, ${errors.length} errors`)

    return NextResponse.json({
      success: true,
      message: `Smart sync completed! Filled ${missingRanges.length - errors.length}/${missingRanges.length} gaps`,
      analysis: {
        totalDays: allDays.length,
        daysWithData: existingDates.size,
        missingDaysBefore: missingDays.length,
        rangesSynced: missingRanges.length,
        successRate: `${successRate}%`
      },
      results: {
        insightsSynced: totalSynced,
        errors: errors.length,
        completionTime: '< 5 minutes'
      },
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('[Smart Historical Sync] Error:', error)
    return NextResponse.json({
      error: 'Smart historical sync failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

// Also support GET for easy testing
export async function GET(request: NextRequest) {
  return POST(request)
}

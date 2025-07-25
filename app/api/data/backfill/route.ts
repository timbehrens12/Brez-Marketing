import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'
import { detectAllDataGaps, shouldTriggerBackfill, type DataGap } from '@/lib/services/data-gap-detection'
import { fetchMetaAdInsights } from '@/lib/services/meta-service'

export async function POST(request: NextRequest) {
  try {
    // Check if this is an automated call (from cron job or dashboard)
    const userAgent = request.headers.get('user-agent')
    const isAutomated = userAgent === 'Brez-Backfill-Service' || userAgent === 'Brez-Dashboard-Backfill'
    
    // For non-automated calls, require authentication
    if (!isAutomated) {
      const { userId } = auth()
      
      if (!userId) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
      }
    }

    const body = await request.json()
    const { brandId, platform, startDate, endDate, autoDetect = true, force = false } = body

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    console.log(`[Backfill] Starting backfill process for brand ${brandId}`)

    let gapsToFill: DataGap[] = []
    let detectionResults: Record<string, any> = {}

    if (autoDetect) {
      // Automatically detect gaps and determine what needs to be backfilled
      console.log('[Backfill] Auto-detecting data gaps...')
      
      detectionResults = await detectAllDataGaps(brandId, 60) // Check last 60 days for gaps
      const backfillDecision = shouldTriggerBackfill(detectionResults)
      
      if (!backfillDecision.shouldBackfill && !force) {
        return NextResponse.json({
          success: true,
          message: 'No significant data gaps detected, backfill not needed',
          detectionResults,
          gaps: [],
          backfilled: 0
        })
      }

      gapsToFill = backfillDecision.criticalGaps
      console.log(`[Backfill] Found ${gapsToFill.length} critical gaps totaling ${backfillDecision.totalMissingDays} missing days`)
      
    } else if (platform && startDate && endDate) {
      // Manual backfill for specific platform and date range
      console.log(`[Backfill] Manual backfill requested for ${platform} from ${startDate} to ${endDate}`)
      
      gapsToFill = [{
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        platform: platform as 'meta' | 'shopify',
        dayCount: Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
      }]
    } else {
      return NextResponse.json({ 
        error: 'Either enable autoDetect or provide platform, startDate, and endDate' 
      }, { status: 400 })
    }

    if (gapsToFill.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No gaps to backfill',
        detectionResults,
        gaps: [],
        backfilled: 0
      })
    }

    // Process each gap
    const backfillResults = []
    let totalBackfilled = 0

    for (const gap of gapsToFill) {
      try {
        console.log(`[Backfill] Processing ${gap.platform} gap: ${gap.startDate.toISOString().split('T')[0]} to ${gap.endDate.toISOString().split('T')[0]} (${gap.dayCount} days)`)
        
        let result: any = null

        if (gap.platform === 'meta') {
          // Backfill Meta data
          console.log(`[Backfill] Calling fetchMetaAdInsights for ${gap.dayCount} days...`)
          result = await fetchMetaAdInsights(
            brandId,
            gap.startDate,
            gap.endDate,
            false // Not a dry run, actually store the data
          )
          console.log(`[Backfill] fetchMetaAdInsights result:`, result)
        } else if (gap.platform === 'shopify') {
          // Backfill Shopify data
          console.log(`[Backfill] Calling backfillShopifyData for ${gap.dayCount} days...`)
          result = await backfillShopifyData(brandId, gap.startDate, gap.endDate)
          console.log(`[Backfill] backfillShopifyData result:`, result)
        }

        if (result?.success) {
          backfillResults.push({
            platform: gap.platform,
            startDate: gap.startDate,
            endDate: gap.endDate,
            dayCount: gap.dayCount,
            recordsAdded: result.count || 0,
            success: true
          })
          totalBackfilled += result.count || 0
          console.log(`[Backfill] Successfully backfilled ${gap.platform}: ${result.count || 0} records`)
        } else {
          backfillResults.push({
            platform: gap.platform,
            startDate: gap.startDate,
            endDate: gap.endDate,
            dayCount: gap.dayCount,
            success: false,
            error: result?.error || 'Unknown error'
          })
          console.error(`[Backfill] Failed to backfill ${gap.platform}:`, result?.error)
        }

        // Add delay between backfill operations to avoid rate limits
        if (gap !== gapsToFill[gapsToFill.length - 1]) {
          console.log('[Backfill] Waiting 5 seconds before next backfill operation...')
          await new Promise(resolve => setTimeout(resolve, 5000))
        }

      } catch (error) {
        console.error(`[Backfill] Error processing gap for ${gap.platform}:`, error)
        backfillResults.push({
          platform: gap.platform,
          startDate: gap.startDate,
          endDate: gap.endDate,
          dayCount: gap.dayCount,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Log the backfill operation for monitoring
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    try {
      await supabase.from('backfill_logs').insert({
        brand_id: brandId,
        gaps_detected: gapsToFill.length,
        gaps_processed: backfillResults.length,
        records_backfilled: totalBackfilled,
        auto_detected: autoDetect,
        detection_results: detectionResults,
        backfill_results: backfillResults,
        created_at: new Date().toISOString()
      })
    } catch (logError) {
      console.error('[Backfill] Error logging backfill operation:', logError)
      // Don't fail the entire operation if logging fails
    }

    const successfulBackfills = backfillResults.filter(r => r.success)
    const failedBackfills = backfillResults.filter(r => !r.success)

    console.log(`[Backfill] Completed: ${successfulBackfills.length} successful, ${failedBackfills.length} failed, ${totalBackfilled} total records backfilled`)

    return NextResponse.json({
      success: true,
      message: `Backfill completed: ${totalBackfilled} records added across ${successfulBackfills.length} operations`,
      detectionResults,
      gaps: gapsToFill,
      backfillResults,
      totalRecordsBackfilled: totalBackfilled,
      successfulOperations: successfulBackfills.length,
      failedOperations: failedBackfills.length
    })

  } catch (error) {
    console.error('[Backfill] Error in backfill operation:', error)
    return NextResponse.json({ 
      error: 'Failed to complete backfill operation', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

/**
 * Backfill Shopify data for a specific date range
 * This is a placeholder - you'll need to implement based on your Shopify sync logic
 */
async function backfillShopifyData(brandId: string, startDate: Date, endDate: Date) {
  try {
    console.log(`[Backfill] Backfilling Shopify data for brand ${brandId} from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`)
    
    // Call your existing Shopify sync API with specific date range
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/shopify/sync`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Brez-Backfill-Service'
      },
      body: JSON.stringify({ 
        brandId,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        backfill: true
      })
    })
    
    if (response.ok) {
      const data = await response.json()
      return {
        success: true,
        count: data.count || 0,
        message: 'Shopify data backfilled successfully'
      }
    } else {
      const errorText = await response.text()
      return {
        success: false,
        error: `Shopify backfill failed: ${response.status} - ${errorText}`
      }
    }
  } catch (error) {
    console.error('[Backfill] Error backfilling Shopify data:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * GET endpoint to check for data gaps without performing backfill
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    const lookbackDays = parseInt(url.searchParams.get('lookbackDays') || '30')

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    console.log(`[Backfill] Checking data gaps for brand ${brandId}`)

    const detectionResults = await detectAllDataGaps(brandId, lookbackDays)
    const backfillDecision = shouldTriggerBackfill(detectionResults)

    return NextResponse.json({
      success: true,
      brandId,
      lookbackDays,
      detectionResults,
      recommendation: {
        shouldBackfill: backfillDecision.shouldBackfill,
        criticalGaps: backfillDecision.criticalGaps.length,
        totalMissingDays: backfillDecision.totalMissingDays
      }
    })

  } catch (error) {
    console.error('[Backfill] Error checking data gaps:', error)
    return NextResponse.json({ 
      error: 'Failed to check data gaps', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
} 
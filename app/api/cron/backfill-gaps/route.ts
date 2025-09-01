import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { detectAllDataGaps, shouldTriggerBackfill } from '@/lib/services/data-gap-detection'

export async function POST(request: NextRequest) {
  // Verify this is a legitimate cron job request
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('[Backfill Cron] Starting automatic backfill check for all brands')

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // Get all active brands with platform connections
    const { data: brands, error: brandsError } = await supabase
      .from('brands')
      .select(`
        id,
        name,
        platform_connections!inner (
          id,
          platform_type,
          status
        )
      `)
      .eq('platform_connections.status', 'active')

    if (brandsError) {
      console.error('[Backfill Cron] Error fetching brands:', brandsError)
      throw brandsError
    }

    if (!brands || brands.length === 0) {
      console.log('[Backfill Cron] No brands with active connections found')
      return NextResponse.json({
        success: true,
        message: 'No brands with active connections found',
        processed: 0
      })
    }

    console.log(`[Backfill Cron] Found ${brands.length} brands with active connections`)

    const backfillResults = []
    let totalBackfilled = 0

    // Process each brand
    for (const brand of brands) {
      try {
        console.log(`[Backfill Cron] Checking brand: ${brand.name} (${brand.id})`)

        // Check for data gaps
        const gapResults = await detectAllDataGaps(brand.id, 90) // Check last 90 days
        const backfillDecision = shouldTriggerBackfill(gapResults)

        if (backfillDecision.shouldBackfill) {
          console.log(`[Backfill Cron] Brand ${brand.name} needs backfill: ${backfillDecision.criticalGaps.length} gaps, ${backfillDecision.totalMissingDays} missing days`)

          // Trigger backfill for this brand
          const backfillResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/data/backfill`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Brez-Backfill-Cron'
            },
            body: JSON.stringify({
              brandId: brand.id,
              autoDetect: true,
              force: false // Don't force if gaps aren't critical
            })
          })

          if (backfillResponse.ok) {
            const backfillData = await backfillResponse.json()
            
            if (backfillData.success) {
              const recordsBackfilled = backfillData.totalRecordsBackfilled || 0
              totalBackfilled += recordsBackfilled

              backfillResults.push({
                brandId: brand.id,
                brandName: brand.name,
                success: true,
                recordsBackfilled,
                gapsDetected: backfillDecision.criticalGaps.length,
                missingDays: backfillDecision.totalMissingDays
              })

              console.log(`[Backfill Cron] Successfully backfilled ${recordsBackfilled} records for brand ${brand.name}`)
            } else {
              console.error(`[Backfill Cron] Backfill failed for brand ${brand.name}:`, backfillData.error)
              
              backfillResults.push({
                brandId: brand.id,
                brandName: brand.name,
                success: false,
                error: backfillData.error
              })
            }
          } else {
            const errorText = await backfillResponse.text()
            console.error(`[Backfill Cron] Backfill API call failed for brand ${brand.name}: ${backfillResponse.status} - ${errorText}`)
            
            backfillResults.push({
              brandId: brand.id,
              brandName: brand.name,
              success: false,
              error: `API call failed: ${backfillResponse.status}`
            })
          }
        } else {
          console.log(`[Backfill Cron] Brand ${brand.name} has no significant gaps, skipping`)
          
          backfillResults.push({
            brandId: brand.id,
            brandName: brand.name,
            success: true,
            recordsBackfilled: 0,
            gapsDetected: 0,
            missingDays: 0,
            skipped: true
          })
        }

        // Add delay between brand processing to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000))

      } catch (error) {
        console.error(`[Backfill Cron] Error processing brand ${brand.name}:`, error)
        
        backfillResults.push({
          brandId: brand.id,
          brandName: brand.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Log the cron job execution
    try {
      await supabase.from('cron_job_logs').insert({
        job_name: 'backfill-gaps',
        execution_time: new Date().toISOString(),
        brands_processed: brands.length,
        total_records_backfilled: totalBackfilled,
        results: backfillResults,
        success: true
      })
    } catch (logError) {
      console.error('[Backfill Cron] Error logging cron job execution:', logError)
    }

    const successfulBackfills = backfillResults.filter(r => r.success && !r.skipped)
    const failedBackfills = backfillResults.filter(r => !r.success)
    const skippedBackfills = backfillResults.filter(r => r.skipped)

    console.log(`[Backfill Cron] Completed: ${successfulBackfills.length} successful, ${failedBackfills.length} failed, ${skippedBackfills.length} skipped, ${totalBackfilled} total records backfilled`)

    return NextResponse.json({
      success: true,
      message: `Backfill cron job completed successfully`,
      summary: {
        brandsProcessed: brands.length,
        successfulBackfills: successfulBackfills.length,
        failedBackfills: failedBackfills.length,
        skippedBackfills: skippedBackfills.length,
        totalRecordsBackfilled: totalBackfilled
      },
      results: backfillResults
    })

  } catch (error) {
    console.error('[Backfill Cron] Error in backfill cron job:', error)
    
    // Try to log the error
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
      )

      await supabase.from('cron_job_logs').insert({
        job_name: 'backfill-gaps',
        execution_time: new Date().toISOString(),
        brands_processed: 0,
        total_records_backfilled: 0,
        results: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } catch (logError) {
      console.error('[Backfill Cron] Error logging cron job failure:', logError)
    }

    return NextResponse.json({ 
      error: 'Backfill cron job failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  // Allow GET requests for manual testing
  return NextResponse.json({
    message: 'Backfill cron job endpoint',
    usage: 'Send POST request with authorization header to trigger backfill check'
  })
} 
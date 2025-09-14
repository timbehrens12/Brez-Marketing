import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Comprehensive Demographics Sync - Creates individual jobs for EVERY day with campaign spend
 * This fixes the broken monthly approach that only covered 15% of days
 */
export async function POST(request: NextRequest) {
  try {
    const { brandId } = await request.json()
    
    if (!brandId) {
      return NextResponse.json({ error: 'brandId required' }, { status: 400 })
    }

    console.log(`[Comprehensive Demographics] Starting sync for brand ${brandId}`)
    
    const supabase = createClient()
    
    // Get the active Meta connection
    const { data: connection } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform', 'meta')
      .eq('status', 'connected')
      .single()
    
    if (!connection) {
      return NextResponse.json({ error: 'No active Meta connection found' }, { status: 404 })
    }
    
    // Get ALL days that have campaign spend but NO demographics data
    const { data: missingDays } = await supabase
      .from('meta_ad_daily_insights')
      .select(`
        date,
        spent
      `)
      .eq('brand_id', brandId)
      .gt('spent', 0)
      .order('date')
    
    if (!missingDays || missingDays.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No missing demographics days found',
        missingDays: 0
      })
    }
    
    console.log(`[Comprehensive Demographics] Found ${missingDays.length} days with missing demographics`)
    
    // Import queue service
    const { MetaQueueService, MetaJobType } = await import('@/lib/services/metaQueueService')
    
    // Create individual demographics jobs for each missing day
    let jobsCreated = 0
    
    for (const dayData of missingDays) {
      const jobDate = dayData.date
      
      await MetaQueueService.addJob(MetaJobType.HISTORICAL_DEMOGRAPHICS, {
        brandId: brandId,
        connectionId: connection.id,
        accessToken: connection.access_token,
        accountId: connection.account_id,
        jobType: MetaJobType.HISTORICAL_DEMOGRAPHICS,
        startDate: jobDate,
        endDate: jobDate, // Single day job
        entity: 'demographics',
        metadata: {
          chunkNumber: jobsCreated + 1,
          totalChunks: missingDays.length,
          chunkType: 'daily_demographics',
          comprehensive: true,
          missingSpend: dayData.spent
        }
      }, { 
        priority: 7, // High priority for comprehensive sync
        delay: jobsCreated * 2000 // 2 second delay between jobs
      })
      
      jobsCreated++
    }
    
    console.log(`[Comprehensive Demographics] Created ${jobsCreated} individual daily demographics jobs`)
    
    return NextResponse.json({
      success: true,
      message: `Created ${jobsCreated} comprehensive demographics jobs`,
      jobsCreated,
      missingDays: missingDays.length,
      estimatedSpend: missingDays.reduce((sum, day) => sum + parseFloat(day.spent || '0'), 0)
    })
    
  } catch (error) {
    console.error('[Comprehensive Demographics] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

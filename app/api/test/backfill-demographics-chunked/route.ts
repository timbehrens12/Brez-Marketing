import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    const chunkSize = parseInt(searchParams.get('chunkSize') || '7') // 7 days per chunk
    
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 })
    }

    console.log(`[Demographics Backfill] Starting chunked backfill for brand ${brandId}`)

    // Get the Meta connection
    const supabase = createClient()
    const { data: connection, error: connError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single()

    if (connError || !connection) {
      return NextResponse.json({
        error: 'No active Meta connection found',
        details: connError?.message
      }, { status: 404 })
    }

    // Get account ID from metadata or fetch it
    const metadata = connection.metadata as any
    let accountId = metadata?.ad_account_id

    if (!accountId) {
      // Try to get account ID from Meta API
      try {
        const meResponse = await fetch(`https://graph.facebook.com/v18.0/me/adaccounts?access_token=${connection.access_token}&fields=id,name,account_status`)
        const meData = await meResponse.json()
        accountId = meData.data?.[0]?.id
        
        if (!accountId) {
          return NextResponse.json({
            error: 'Could not determine Meta ad account ID'
          }, { status: 400 })
        }
      } catch (apiError) {
        return NextResponse.json({
          error: 'Failed to fetch Meta account ID',
          details: apiError instanceof Error ? apiError.message : 'Unknown error'
        }, { status: 500 })
      }
    }

    console.log(`[Demographics Backfill] Using account ID: ${accountId}`)

    // Define the historical range (6 months back)
    const endDate = new Date('2025-09-12')
    const startDate = new Date('2025-03-21') // Based on existing data range
    
    console.log(`[Demographics Backfill] Backfilling from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`)

    // Process in chunks to avoid timeout
    const chunks = []
    let currentDate = new Date(startDate)
    
    while (currentDate <= endDate) {
      const chunkEnd = new Date(currentDate)
      chunkEnd.setDate(chunkEnd.getDate() + chunkSize - 1)
      
      if (chunkEnd > endDate) {
        chunkEnd.setTime(endDate.getTime())
      }
      
      chunks.push({
        since: currentDate.toISOString().split('T')[0],
        until: chunkEnd.toISOString().split('T')[0]
      })
      
      currentDate.setDate(currentDate.getDate() + chunkSize)
    }

    console.log(`[Demographics Backfill] Created ${chunks.length} chunks of ${chunkSize} days each`)

    // Process first chunk only (to avoid timeout)
    const firstChunk = chunks[0]
    console.log(`[Demographics Backfill] Processing first chunk: ${firstChunk.since} to ${firstChunk.until}`)

    try {
      const { DataBackfillService } = await import('@/lib/services/dataBackfillService')
      await DataBackfillService.fetchMetaDemographicsAndDevice(
        brandId, 
        accountId, 
        connection.access_token, 
        firstChunk
      )
      
      console.log(`[Demographics Backfill] ✅ Successfully processed chunk: ${firstChunk.since} to ${firstChunk.until}`)
      
      return NextResponse.json({
        success: true,
        message: `Processed chunk ${firstChunk.since} to ${firstChunk.until}`,
        totalChunks: chunks.length,
        processedChunk: 1,
        nextChunk: chunks[1] || null,
        remainingChunks: chunks.length - 1
      })
      
    } catch (error) {
      console.error(`[Demographics Backfill] Error processing chunk:`, error)
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        chunk: firstChunk
      }, { status: 500 })
    }

  } catch (error) {
    console.error('[Demographics Backfill] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

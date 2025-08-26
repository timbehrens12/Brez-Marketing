import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ShopifyBulkService } from '@/lib/services/shopifyBulkService'

// Shopify sync endpoint for brand reports and cron jobs
export async function POST(request: NextRequest) {
  try {
    const { brandId, force_refresh, dateRange } = await request.json()
    
    if (!brandId) {
      return NextResponse.json({ error: 'brandId is required' }, { status: 400 })
    }

    console.log(`[Shopify Sync] Starting sync for brand ${brandId}${force_refresh ? ' (forced)' : ''}`)
    if (dateRange) {
      console.log(`[Shopify Sync] Date range requested: ${dateRange.from} to ${dateRange.to}`)
    }

    const supabase = createClient()

    // Get active Shopify connections for this brand
    const { data: connections, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'shopify')
      .eq('status', 'active')

    if (connectionError) {
      console.error('[Shopify Sync] Error fetching connections:', connectionError)
      return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 })
    }

    if (!connections || connections.length === 0) {
      console.log('[Shopify Sync] No active Shopify connections found for brand')
      return NextResponse.json({ 
        success: true, 
        message: 'No Shopify connections to sync',
        synced: 0
      })
    }

    const syncResults = []

    // Sync each connection
    for (const connection of connections) {
      try {
        console.log(`[Shopify Sync] Syncing connection ${connection.id} for shop ${connection.shop}`)
        
        // If date range is specified, sync that specific range, otherwise sync recent data
        if (dateRange?.from && dateRange?.to) {
          console.log(`[Shopify Sync] Syncing historical data for range: ${dateRange.from} to ${dateRange.to}`)
          
          // Call the historical backfill API for the specific date range
          const backfillResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://www.brezmarketingdashboard.com'}/api/shopify/historical-backfill`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              brandId,
              startDate: dateRange.from,
              endDate: dateRange.to,
              forceRefresh: force_refresh || false
            })
          })
          
          if (!backfillResponse.ok) {
            throw new Error(`Historical sync failed: ${backfillResponse.status}`)
          }
          
          const backfillResult = await backfillResponse.json()
          console.log(`[Shopify Sync] Historical sync result:`, backfillResult)
          
        } else {
          // Default: sync recent data only
          await ShopifyBulkService.immediateRecentSync(
            brandId,
            connection.shop,
            connection.access_token,
            connection.id
          )
        }
        
        // Update connection sync status
        await supabase
          .from('platform_connections')
          .update({
            sync_status: 'completed',
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', connection.id)
        
        syncResults.push({
          connectionId: connection.id,
          shop: connection.shop,
          status: 'success',
          message: 'Sync completed'
        })
        
        console.log(`[Shopify Sync] Completed sync for shop ${connection.shop}`)
        
      } catch (connectionError) {
        console.error(`[Shopify Sync] Error syncing connection ${connection.id}:`, connectionError)
        
        syncResults.push({
          connectionId: connection.id,
          shop: connection.shop,
          status: 'error',
          error: connectionError instanceof Error ? connectionError.message : 'Unknown error'
        })
        
        // Update connection with error status
        await supabase
          .from('platform_connections')
          .update({
            sync_status: 'error',
            updated_at: new Date().toISOString()
          })
          .eq('id', connection.id)
      }
    }

    const successCount = syncResults.filter(r => r.status === 'success').length
    const errorCount = syncResults.filter(r => r.status === 'error').length

    console.log(`[Shopify Sync] Completed brand sync: ${successCount} success, ${errorCount} errors`)

    return NextResponse.json({
      success: true,
      message: `Synced ${successCount} Shopify connections`,
      synced: successCount,
      errors: errorCount,
      results: syncResults
    })

  } catch (error) {
    console.error('[Shopify Sync] Error in sync process:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// Also allow GET for manual triggering
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const brandId = url.searchParams.get('brandId')
  const forceRefresh = url.searchParams.get('force_refresh') === 'true'
  
  if (!brandId) {
    return NextResponse.json({ error: 'brandId parameter is required' }, { status: 400 })
  }
  
  // Convert to POST request format
  const mockRequest = new Request(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brandId, force_refresh: forceRefresh })
  }) as NextRequest
  
  return POST(mockRequest)
}

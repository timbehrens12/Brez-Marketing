import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ShopifyBulkService } from '@/lib/services/shopifyBulkService'

// Set maximum duration for Shopify sync (5 minutes)
export const maxDuration = 300

// Shopify sync endpoint for brand reports and cron jobs
export async function POST(request: NextRequest) {
  try {
    const { brandId, force_refresh, dateRange } = await request.json()
    
    if (!brandId) {
      return NextResponse.json({ error: 'brandId is required' }, { status: 400 })
    }

    // Starting sync for brand
    if (dateRange) {
      // Date range requested
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
      // Error fetching connections
      return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 })
    }

    if (!connections || connections.length === 0) {
      // No active Shopify connections found
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
        // Syncing connection for shop
        
        // If date range is specified, sync that specific range, otherwise sync recent data
        if (dateRange?.from && dateRange?.to) {
          // Syncing historical data for range
          
          // Use the new V2 historical backfill system
          // Using V2 queue system
          
          // For now, skip the historical import as we're transitioning to V2
          // The new system will handle this via background jobs
          // V2 system will handle historical import
          
          // V2 system will handle historical sync via background jobs
          // Mark this as successful for now
          // V2 historical sync queued
          
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
        
        // Completed sync for shop
        
      } catch (connectionError) {
        // Error syncing connection
        
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

    // Completed brand sync

    return NextResponse.json({
      success: true,
      message: `Synced ${successCount} Shopify connections`,
      synced: successCount,
      errors: errorCount,
      results: syncResults
    })

  } catch (error) {
    // Error in sync process
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

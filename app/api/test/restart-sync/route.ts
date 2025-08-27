import { NextRequest, NextResponse } from 'next/server'

/**
 * Test endpoint to restart Shopify sync jobs for a brand
 */
export async function POST(request: NextRequest) {
  try {
    const brandId = '1a30f34b-b048-4f80-b880-6c61bd12c720' // Your brand ID
    
    console.log(`[Restart Sync] Restarting sync jobs for brand ${brandId}`)

    // Import services dynamically
    const { createClient } = await import('@/lib/supabase/server')
    const { ShopifyQueueService } = await import('@/lib/services/shopifyQueueService')
    
    const supabase = createClient()
    
    // Get active Shopify connection for this brand
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'shopify')
      .eq('status', 'active')
      .single()

    if (connectionError || !connection) {
      return NextResponse.json({ 
        success: false, 
        error: 'No active Shopify connection found' 
      }, { status: 404 })
    }

    console.log(`[Restart Sync] Found connection for shop: ${connection.shop}`)

    // Update connection status to syncing
    await supabase
      .from('platform_connections')
      .update({
        sync_status: 'syncing',
        metadata: {
          restart_initiated: true,
          restarted_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', connection.id)

    // Add fresh queue jobs
    await ShopifyQueueService.addRecentSyncJob(
      brandId,
      connection.id,
      connection.shop,
      connection.access_token
    )

    await ShopifyQueueService.addBulkJobs(
      brandId,
      connection.id,
      connection.shop,
      connection.access_token
    )

    console.log(`[Restart Sync] Fresh jobs queued for brand ${brandId}`)

    return NextResponse.json({
      success: true,
      message: 'Sync jobs restarted successfully',
      brandId,
      connectionId: connection.id,
      shop: connection.shop
    })

  } catch (error) {
    console.error('[Restart Sync] Error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return POST(request)
}

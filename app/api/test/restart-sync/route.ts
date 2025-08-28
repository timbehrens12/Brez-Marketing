import { NextRequest, NextResponse } from 'next/server'

/**
 * Test endpoint to restart Shopify FULL HISTORICAL sync for a brand
 */
export async function POST(request: NextRequest) {
  try {
    const brandId = '1a30f34b-b048-4f80-b880-6c61bd12c720' // Your brand ID

    console.log(`[Restart Sync] 🚀 STARTING FULL HISTORICAL SYNC for brand ${brandId}`)

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

    // Update connection status to show full historical sync
    await supabase
      .from('platform_connections')
      .update({
        sync_status: 'syncing',
        metadata: {
          full_historical_sync: true,
          sync_started_at: new Date().toISOString(),
          sync_architecture: 'full_historical_v3',
          restarted: true
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', connection.id)

    // Start the FULL HISTORICAL sync
    await ShopifyQueueService.addRecentSyncJob(
      brandId,
      connection.id,
      connection.shop,
      connection.access_token
    )

    console.log(`[Restart Sync] ✅ FULL HISTORICAL SYNC initiated for brand ${brandId}`)

    return NextResponse.json({
      success: true,
      message: '🚀 Full historical sync started! Will sync ALL data from 2010 onwards.',
      brandId,
      connectionId: connection.id,
      shop: connection.shop,
      syncType: 'FULL_HISTORICAL',
      expectedData: 'All orders, customers, and products from 2010 onwards'
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

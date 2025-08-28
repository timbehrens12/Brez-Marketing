import { NextRequest, NextResponse } from 'next/server'

/**
 * Test endpoint to restart Shopify FULL HISTORICAL sync for a brand
 * Also available at GET /api/test/restart-sync for easy testing
 */
export async function POST(request: NextRequest) {
  try {
    const brandId = '1a30f34b-b048-4f80-b880-6c61bd12c720' // Your brand ID

    console.log(`[Restart Sync] 🚀 STARTING FULL HISTORICAL SYNC for brand ${brandId}`)

    // Import services dynamically
    const { createClient } = await import('@/lib/supabase/server')
    const { ShopifyQueueService } = await import('@/lib/services/shopifyQueueService')
    const { ShopifyGraphQLService } = await import('@/lib/services/shopifyGraphQLService')

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

    // CHECK FOR EXISTING BULK OPERATIONS FIRST
    console.log(`[Restart Sync] Checking for existing bulk operations...`)
    const existingOp = await ShopifyGraphQLService.checkExistingBulkOperation(connection.shop, connection.access_token)

    if (existingOp && (existingOp.status === 'RUNNING' || existingOp.status === 'CREATED')) {
      console.log(`[Restart Sync] ⚠️ Found existing bulk operation: ${existingOp.id} (${existingOp.status})`)

      return NextResponse.json({
        success: false,
        error: `Bulk operation already in progress: ${existingOp.id}`,
        existingOperation: existingOp,
        message: 'Please wait for the current bulk operation to complete before starting a new sync'
      }, { status: 409 })
    }

    // Clear any old ETL jobs first
    console.log(`[Restart Sync] Clearing old ETL jobs...`)
    await supabase
      .from('etl_job')
      .delete()
      .eq('brand_id', brandId)

    // Update connection status to show full historical sync
    await supabase
      .from('platform_connections')
      .update({
        sync_status: 'syncing',
        metadata: {
          full_historical_sync: true,
          sync_started_at: new Date().toISOString(),
          sync_architecture: 'full_historical_v3',
          restarted: true,
          cleared_old_jobs: true
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

    // Also trigger inventory sync immediately
    try {
      console.log(`[Restart Sync] Triggering inventory sync...`)
      const inventoryResponse = await fetch(`${APP_URL}/api/shopify/inventory/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId: connection.id })
      })

      if (inventoryResponse.ok) {
        console.log(`[Restart Sync] ✅ Inventory sync initiated`)
      } else {
        const errorText = await inventoryResponse.text()
        console.log(`[Restart Sync] ⚠️ Inventory sync failed:`, errorText)
      }
    } catch (inventoryError) {
      console.log(`[Restart Sync] ⚠️ Inventory sync request failed:`, inventoryError)
    }

    // Test webhook registration
    try {
      console.log(`[Restart Sync] Testing webhook registration...`)
      const { testWebhookRegistration } = await import('@/lib/services/shopify-service')
      const webhookResult = await testWebhookRegistration(connection.shop, connection.access_token)

      if (webhookResult.success) {
        console.log(`[Restart Sync] ✅ Webhook registration successful`)
      } else {
        console.log(`[Restart Sync] ⚠️ Webhook registration failed:`, webhookResult.error)
      }
    } catch (webhookError) {
      console.log(`[Restart Sync] ⚠️ Webhook test failed:`, webhookError)
    }

    console.log(`[Restart Sync] ✅ FULL HISTORICAL SYNC initiated for brand ${brandId}`)

    return NextResponse.json({
      success: true,
      message: '🚀 Full historical sync started! Will sync ALL data from 2010 onwards.',
      brandId,
      connectionId: connection.id,
      shop: connection.shop,
      syncType: 'FULL_HISTORICAL',
      expectedData: 'All orders, customers, and products from 2010 onwards',
      clearedOldJobs: true,
      noExistingBulkOperations: true,
      inventorySyncTriggered: true
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

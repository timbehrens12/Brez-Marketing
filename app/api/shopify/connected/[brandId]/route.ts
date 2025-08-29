import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { ShopifyQueueService } from '@/lib/services/shopifyQueueService'

/**
 * POST /api/shopify/connected/{brandId}
 * 
 * Called after successful Shopify OAuth connection
 * Starts the new queue-based sync process
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { brandId: string } }
) {
  const syncStartTime = Date.now()
  const syncId = `sync_${syncStartTime}`
  
  console.log(`🚀 [SHOPIFY-SYNC-${syncId}] ===== QUEUE-BASED SYNC STARTED =====`)
  console.log(`🚀 [SHOPIFY-SYNC-${syncId}] Timestamp: ${new Date().toISOString()}`)
  
  try {
    // Check for internal server call (from callback) vs external user call
    const { userId } = auth()
    const internalCall = request.headers.get('x-internal-call') === 'true'

    console.log(`🔐 [SHOPIFY-SYNC-${syncId}] Auth check:`)
    console.log(`🔐 [SHOPIFY-SYNC-${syncId}] - User ID: ${userId || 'NONE'}`)
    console.log(`🔐 [SHOPIFY-SYNC-${syncId}] - Internal Call: ${internalCall}`)

    if (!userId && !internalCall) {
      console.error(`❌ [SHOPIFY-SYNC-${syncId}] Unauthorized - no user ID and not internal call`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fix for Next.js 15: await params before using properties
    const { brandId } = await params
    const { shop, accessToken, connectionId } = await request.json()

    console.log(`📋 [SHOPIFY-SYNC-${syncId}] Request parameters:`)
    console.log(`📋 [SHOPIFY-SYNC-${syncId}] - Brand ID: ${brandId || 'MISSING'}`)
    console.log(`📋 [SHOPIFY-SYNC-${syncId}] - Shop: ${shop || 'MISSING'}`)
    console.log(`📋 [SHOPIFY-SYNC-${syncId}] - Access Token: ${accessToken ? 'PRESENT' : 'MISSING'}`)
    console.log(`📋 [SHOPIFY-SYNC-${syncId}] - Connection ID: ${connectionId || 'MISSING'}`)

    if (!brandId || !shop || !accessToken || !connectionId) {
      console.error(`❌ [SHOPIFY-SYNC-${syncId}] Missing required parameters`)
      return NextResponse.json({ 
        error: 'Missing required parameters: brandId, shop, accessToken, connectionId' 
      }, { status: 400 })
    }

    console.log(`💾 [SHOPIFY-SYNC-${syncId}] Initializing database connection...`)

    const supabase = createClient()

    // Verify the connection exists and is active
    console.log(`🔍 [SHOPIFY-SYNC-${syncId}] Verifying connection exists and is active...`)
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('brand_id', brandId)
      .eq('platform_type', 'shopify')
      .eq('status', 'active')
      .single()

    if (connectionError || !connection) {
      console.error(`❌ [SHOPIFY-SYNC-${syncId}] Connection verification failed:`, connectionError)
      
      // Debug: Check what connections exist
      console.log(`🔍 [SHOPIFY-SYNC-${syncId}] Searching for any connections...`)
      const { data: debugConnections } = await supabase
        .from('platform_connections')
        .select('id, brand_id, platform_type, status, shop, created_at')
        .eq('brand_id', brandId)
        .eq('platform_type', 'shopify')
        .order('created_at', { ascending: false })
        .limit(10)
      
      console.log(`🔍 [SHOPIFY-SYNC-${syncId}] Found ${debugConnections?.length || 0} Shopify connections for brand:`)
      debugConnections?.forEach((conn, idx) => {
        console.log(`📋 [SHOPIFY-SYNC-${syncId}] Connection ${idx + 1}: ID=${conn.id}, Status=${conn.status}, Shop=${conn.shop || 'NONE'}`)
      })
      
      return NextResponse.json({ 
        error: 'Shopify connection not found or inactive' 
      }, { status: 404 })
    }

    console.log(`✅ [SHOPIFY-SYNC-${syncId}] Connection verified:`)
    console.log(`📋 [SHOPIFY-SYNC-${syncId}] - ID: ${connection.id}`)
    console.log(`📋 [SHOPIFY-SYNC-${syncId}] - Brand: ${connection.brand_id}`)
    console.log(`📋 [SHOPIFY-SYNC-${syncId}] - Shop: ${connection.shop || 'NONE'}`)
    console.log(`📋 [SHOPIFY-SYNC-${syncId}] - Status: ${connection.status}`)
    console.log(`📋 [SHOPIFY-SYNC-${syncId}] - Sync Status: ${connection.sync_status || 'NONE'}`)

    // Update connection status to indicate sync starting
    console.log(`💾 [SHOPIFY-SYNC-${syncId}] Updating connection status to 'starting'...`)
    const { error: statusUpdateError } = await supabase
      .from('platform_connections')
      .update({
        sync_status: 'starting',
        metadata: {
          ...connection.metadata,
          v2_sync_started: true,
          sync_started_at: new Date().toISOString(),
          sync_id: syncId
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionId)

    if (statusUpdateError) {
      console.error(`❌ [SHOPIFY-SYNC-${syncId}] Failed to update connection status:`, statusUpdateError)
    } else {
      console.log(`✅ [SHOPIFY-SYNC-${syncId}] Connection status updated to 'starting'`)
    }

    // Step 1: Add recent sync job (high priority for immediate UI)
    console.log(`📋 [SHOPIFY-SYNC-${syncId}] STEP 1: Adding recent sync job (high priority)...`)
    try {
      await ShopifyQueueService.addRecentSyncJob(
        brandId,
        connectionId,
        shop,
        accessToken
      )
      console.log(`✅ [SHOPIFY-SYNC-${syncId}] Recent sync job added successfully`)
    } catch (recentSyncError) {
      console.error(`❌ [SHOPIFY-SYNC-${syncId}] Failed to add recent sync job:`, recentSyncError)
      throw recentSyncError
    }

    // Step 2: Add bulk jobs for historical data (lower priority, background)
    console.log(`📋 [SHOPIFY-SYNC-${syncId}] STEP 2: Adding bulk jobs for historical data...`)
    try {
      await ShopifyQueueService.addBulkJobs(
        brandId,
        connectionId,
        shop,
        accessToken
      )
      console.log(`✅ [SHOPIFY-SYNC-${syncId}] Bulk jobs added successfully`)
    } catch (bulkJobsError) {
      console.error(`❌ [SHOPIFY-SYNC-${syncId}] Failed to add bulk jobs:`, bulkJobsError)
      throw bulkJobsError
    }

    // Step 3: Register webhooks (if not already registered)
    console.log(`📋 [SHOPIFY-SYNC-${syncId}] STEP 3: Registering webhooks...`)
    try {
      await registerShopifyWebhooks(shop, accessToken, brandId, syncId)
      console.log(`✅ [SHOPIFY-SYNC-${syncId}] Webhooks registered successfully`)
    } catch (webhookError) {
      console.error(`❌ [SHOPIFY-SYNC-${syncId}] Failed to register webhooks:`, webhookError)
      // Don't fail the whole process for webhook issues
    }

    // Step 4: Update connection status
    console.log(`📋 [SHOPIFY-SYNC-${syncId}] STEP 4: Updating connection to 'syncing' status...`)
    const { error: finalStatusError } = await supabase
      .from('platform_connections')
      .update({
        sync_status: 'syncing',
        metadata: {
          ...connection.metadata,
          jobs_queued: true,
          webhooks_registered: true,
          full_sync_initiated: true,
          sync_id: syncId
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionId)

    if (finalStatusError) {
      console.error(`❌ [SHOPIFY-SYNC-${syncId}] Failed to update final connection status:`, finalStatusError)
    } else {
      console.log(`✅ [SHOPIFY-SYNC-${syncId}] Connection status updated to 'syncing'`)
    }

    console.log(`🎯 [SHOPIFY-SYNC-${syncId}] Queue-based sync initiated successfully`)

    // Step 5: Immediately trigger worker to start processing jobs
    console.log(`📋 [SHOPIFY-SYNC-${syncId}] STEP 5: Triggering worker to process jobs...`)
    try {
      let baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'
      
      // Ensure VERCEL_URL has protocol
      if (process.env.VERCEL_URL && !baseUrl.startsWith('http')) {
        baseUrl = `https://${process.env.VERCEL_URL}`
      }
      
      const workerUrl = `${baseUrl}/api/worker/shopify`
      console.log(`🔧 [SHOPIFY-SYNC-${syncId}] Worker URL: ${workerUrl}`)
      
      const workerResponse = await fetch(workerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-call': 'true'
        },
        body: JSON.stringify({
          maxJobs: 10, // Process all queued jobs
          sync_id: syncId
        })
      })
      
      console.log(`📡 [SHOPIFY-SYNC-${syncId}] Worker API response status: ${workerResponse.status}`)
      
      let workerResult
      try {
        workerResult = await workerResponse.json()
        console.log(`✅ [SHOPIFY-SYNC-${syncId}] Worker response:`, JSON.stringify(workerResult, null, 2))
      } catch (parseError) {
        console.error(`❌ [SHOPIFY-SYNC-${syncId}] Failed to parse worker response:`, parseError)
        try {
          const responseText = await workerResponse.clone().text()
          console.error(`❌ [SHOPIFY-SYNC-${syncId}] Raw worker response:`, responseText)
        } catch (textError) {
          console.error(`❌ [SHOPIFY-SYNC-${syncId}] Failed to read worker response text:`, textError)
        }
        throw new Error(`Worker API returned invalid JSON. Status: ${workerResponse.status}`)
      }
      
      console.log(`✅ [SHOPIFY-SYNC-${syncId}] Worker processing initiated successfully`)
      
    } catch (workerError) {
      console.error(`❌ [SHOPIFY-SYNC-${syncId}] Failed to trigger worker:`, workerError)
      console.error(`❌ [SHOPIFY-SYNC-${syncId}] Worker error stack:`, workerError instanceof Error ? workerError.stack : 'No stack trace')
      // Don't fail the whole request if worker trigger fails
    }

    const syncEndTime = Date.now()
    const totalSyncTime = syncEndTime - syncStartTime
    
    console.log(`🎉 [SHOPIFY-SYNC-${syncId}] ===== QUEUE-BASED SYNC COMPLETED =====`)
    console.log(`⏱️ [SHOPIFY-SYNC-${syncId}] Total setup time: ${totalSyncTime}ms`)

    return NextResponse.json({
      success: true,
      message: 'Shopify sync initiated with queue-based architecture',
      sync_status: 'syncing',
      sync_id: syncId,
      jobs_queued: {
        recent_sync: true,
        bulk_orders: true,
        bulk_customers: true,
        bulk_products: true
      },
      status_endpoint: `/api/sync/${brandId}/status`,
      timing: {
        setup_time_ms: totalSyncTime,
        started_at: new Date(syncStartTime).toISOString()
      }
    })

  } catch (error) {
    console.error(`❌ [SHOPIFY-SYNC-${syncId}] FATAL ERROR in connected API:`, error)
    console.error(`❌ [SHOPIFY-SYNC-${syncId}] Stack trace:`, error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({
      success: false,
      error: 'Failed to initiate Shopify sync',
      sync_id: syncId,
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Register Shopify webhooks for real-time updates
 */
async function registerShopifyWebhooks(
  shop: string,
  accessToken: string,
  brandId: string,
  syncId?: string
): Promise<void> {
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/shopify`
  
  const webhooks = [
    {
      topic: 'orders/create',
      address: `${webhookUrl}/orders/create`,
      format: 'json'
    },
    {
      topic: 'orders/updated',
      address: `${webhookUrl}/orders/updated`,
      format: 'json'
    },
    {
      topic: 'orders/cancelled',
      address: `${webhookUrl}/orders/cancelled`,
      format: 'json'
    },
    {
      topic: 'customers/create',
      address: `${webhookUrl}/customers/create`,
      format: 'json'
    },
    {
      topic: 'customers/update',
      address: `${webhookUrl}/customers/update`,
      format: 'json'
    },
    {
      topic: 'products/create',
      address: `${webhookUrl}/products/create`,
      format: 'json'
    },
    {
      topic: 'products/update',
      address: `${webhookUrl}/products/update`,
      format: 'json'
    }
  ]

  for (const webhook of webhooks) {
    try {
      const response = await fetch(`https://${shop}/admin/api/2024-01/webhooks.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          webhook: {
            ...webhook,
            fields: webhook.topic.startsWith('orders') ? 
              ['id', 'name', 'email', 'created_at', 'updated_at', 'total_price', 'line_items'] :
              webhook.topic.startsWith('customers') ?
              ['id', 'email', 'first_name', 'last_name', 'created_at', 'updated_at'] :
              ['id', 'title', 'created_at', 'updated_at']
          }
        })
      })

      if (response.ok) {
        console.log(`[Webhooks] Registered ${webhook.topic} webhook for ${shop}`)
      } else {
        const errorText = await response.text()
        console.error(`[Webhooks] Failed to register ${webhook.topic} webhook:`, errorText)
      }
    } catch (error) {
      console.error(`[Webhooks] Error registering ${webhook.topic} webhook:`, error)
    }
  }
}

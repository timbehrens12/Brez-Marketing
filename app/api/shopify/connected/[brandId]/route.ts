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
  try {
    // Check for internal server call (from callback) vs external user call
    const { userId } = auth()
    const internalCall = request.headers.get('x-internal-call') === 'true'
    
    if (!userId && !internalCall) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { brandId } = params
    const { shop, accessToken, connectionId } = await request.json()

    if (!brandId || !shop || !accessToken || !connectionId) {
      return NextResponse.json({ 
        error: 'Missing required parameters: brandId, shop, accessToken, connectionId' 
      }, { status: 400 })
    }

    console.log(`[Shopify Connected] Starting queue-based sync for brand ${brandId}, shop ${shop}`)

    const supabase = createClient()

    // Verify the connection exists and is active
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('brand_id', brandId)
      .eq('platform_type', 'shopify')
      .eq('status', 'active')
      .single()

    if (connectionError || !connection) {
      console.error('[Shopify Connected] Connection not found:', connectionError)
      return NextResponse.json({ 
        error: 'Shopify connection not found or inactive' 
      }, { status: 404 })
    }

    // Update connection status to indicate sync starting
    await supabase
      .from('platform_connections')
      .update({
        sync_status: 'starting',
        metadata: {
          ...connection.metadata,
          v2_sync_started: true,
          sync_started_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionId)

    // Step 1: Add recent sync job (high priority for immediate UI)
    await ShopifyQueueService.addRecentSyncJob(
      brandId,
      connectionId,
      shop,
      accessToken
    )

    // Step 2: Add bulk jobs for historical data (lower priority, background)
    await ShopifyQueueService.addBulkJobs(
      brandId,
      connectionId,
      shop,
      accessToken
    )

    // Step 3: Register webhooks (if not already registered)
    await registerShopifyWebhooks(shop, accessToken, brandId)

    // Step 4: Update connection status
    await supabase
      .from('platform_connections')
      .update({
        sync_status: 'syncing',
        metadata: {
          ...connection.metadata,
          jobs_queued: true,
          webhooks_registered: true,
          full_sync_initiated: true
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionId)

    console.log(`[Shopify Connected] Queue-based sync initiated for brand ${brandId}`)

    // Step 5: Immediately trigger worker to start processing jobs
    try {
      let baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'
      
      // Ensure VERCEL_URL has protocol
      if (process.env.VERCEL_URL && !baseUrl.startsWith('http')) {
        baseUrl = `https://${process.env.VERCEL_URL}`
      }
      
      const workerUrl = `${baseUrl}/api/worker/shopify`
      
      console.log(`[Shopify Connected] Calling worker at: ${workerUrl}`)
      
      const workerResponse = await fetch(workerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-call': 'true'
        },
        body: JSON.stringify({
          maxJobs: 10 // Process all queued jobs
        })
      })
      
      let workerResult
      try {
        workerResult = await workerResponse.json()
      } catch (parseError) {
        try {
          const responseText = await workerResponse.clone().text()
          console.error(`[Shopify Connected] Failed to parse worker response as JSON. Status: ${workerResponse.status}, Response: ${responseText.substring(0, 500)}`)
        } catch (textError) {
          console.error(`[Shopify Connected] Failed to read response as text or JSON. Status: ${workerResponse.status}`)
        }
        throw new Error(`Worker API returned invalid JSON. Status: ${workerResponse.status}`)
      }
      
      console.log(`[Shopify Connected] Worker processing initiated:`, workerResult)
      
    } catch (workerError) {
      console.error(`[Shopify Connected] Failed to trigger worker:`, workerError)
      // Don't fail the whole request if worker trigger fails
    }

    return NextResponse.json({
      success: true,
      message: 'Shopify sync initiated with queue-based architecture',
      sync_status: 'syncing',
      jobs_queued: {
        recent_sync: true,
        bulk_orders: true,
        bulk_customers: true,
        bulk_products: true
      },
      status_endpoint: `/api/sync/${brandId}/status`
    })

  } catch (error) {
    console.error('[Shopify Connected] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to initiate Shopify sync'
    }, { status: 500 })
  }
}

/**
 * Register Shopify webhooks for real-time updates
 */
async function registerShopifyWebhooks(
  shop: string,
  accessToken: string,
  brandId: string
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
              'id,name,email,created_at,updated_at,total_price,line_items' :
              webhook.topic.startsWith('customers') ?
              'id,email,first_name,last_name,created_at,updated_at' :
              'id,title,created_at,updated_at'
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

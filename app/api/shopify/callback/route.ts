import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.brezmarketingdashboard.com'

export async function GET(request: NextRequest) {
  try {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const shop = searchParams.get('shop')
  const state = searchParams.get('state')

    if (!code || !shop || !state) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Parse the state parameter to get brandId and connectionId
    let brandId: string | null = null, connectionId: string | null = null, isAutomated = false
    try {
      const stateData = JSON.parse(state)
      brandId = stateData.brandId
      connectionId = stateData.connectionId
      isAutomated = stateData.automated === true
      
      // For automated installs, brandId/connectionId won't be provided
      if (!isAutomated && (!brandId || !connectionId)) {
        throw new Error('Missing brandId or connectionId in state for manual install')
      }
    } catch (error) {
      console.error('[Shopify Callback] Invalid state parameter:', error)
      return NextResponse.json({ error: 'Invalid state parameter' }, { status: 400 })
    }

    if (!SHOPIFY_CLIENT_ID || !SHOPIFY_CLIENT_SECRET) {
      return NextResponse.json({ error: 'Shopify app not configured' }, { status: 500 })
    }

    console.log('[Shopify Callback] Processing OAuth callback for shop:', shop)

    // Exchange authorization code for access token
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
      body: JSON.stringify({
        client_id: SHOPIFY_CLIENT_ID,
        client_secret: SHOPIFY_CLIENT_SECRET,
        code,
      }),
    })

        if (!tokenResponse.ok) {
      console.error('[Shopify Callback] Token exchange failed:', await tokenResponse.text())
      return NextResponse.json({ error: 'Failed to exchange authorization code' }, { status: 400 })
        }

        const tokenData = await tokenResponse.json()
    const { access_token, scope } = tokenData

    console.log('[Shopify Callback] Successfully obtained access token for shop:', shop)

    // Get shop information
    const shopInfoResponse = await fetch(`https://${shop}/admin/api/2024-01/shop.json`, {
      headers: {
        'X-Shopify-Access-Token': access_token,
      },
    })

    if (!shopInfoResponse.ok) {
      console.error('[Shopify Callback] Failed to fetch shop info')
      return NextResponse.json({ error: 'Failed to fetch shop information' }, { status: 400 })
    }

    const shopInfo = await shopInfoResponse.json()
    const shopData = shopInfo.shop

    // For automated installs, just return success without database operations
    if (isAutomated) {
      console.log('[Shopify Callback] Automated install completed successfully for shop:', shop)
      return NextResponse.json({ 
        message: 'Automated install successful',
        shop: shop,
        scopes: scope
      })
    }

    // Store the connection in database
    const supabase = createClient()
    
    // Get the specific connection that was created in the settings flow
    const { data: existingConnection, error: fetchError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('id', connectionId!)
      .single()

    if (fetchError || !existingConnection) {
      console.error('[Shopify Callback] Connection not found:', fetchError)
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }

    // Update the existing connection with access token and shop data
    const { error: updateError } = await supabase
      .from('platform_connections')
      .update({
        shop: shop,
        access_token: access_token,
        status: 'active',
        sync_status: 'pending',
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          shop_name: shopData.name,
          scope: scope,
          shop_id: shopData.id,
          shop_email: shopData.email,
          shop_country: shopData.country_name,
          shop_currency: shopData.currency,
          shop_timezone: shopData.iana_timezone,
          connected_at: new Date().toISOString()
        }
      })
      .eq('id', connectionId)

    if (updateError) {
      console.error('[Shopify Callback] Error updating connection:', updateError)
      return NextResponse.json({ error: 'Failed to save connection' }, { status: 500 })
    }

    console.log('[Shopify Callback] Successfully saved connection for shop:', shop)

    // Trigger immediate mini-sync for instant dashboard population
    try {
      console.log('[Shopify Callback] Starting immediate sync for instant UX...')
      
      // Import services dynamically to avoid circular imports
      const { DataBackfillService } = await import('@/lib/services/dataBackfillService')
      const { ShopifyBulkService } = await import('@/lib/services/shopifyBulkService')
      
      // 1. IMMEDIATE: Start mini-sync (recent data) and WAIT for it
      console.log('[Shopify Callback] Running immediate recent data sync...')
      console.log(`[Shopify Callback] Sync params: brandId=${brandId}, shop=${shop}, connectionId=${connectionId}`)
      
      const syncStartTime = Date.now()
      await ShopifyBulkService.immediateRecentSync(brandId, shop, access_token, connectionId)
      const syncDuration = Date.now() - syncStartTime
      
      console.log(`[Shopify Callback] ✅ Immediate sync completed in ${syncDuration}ms`)
      
      // 1.5. IMMEDIATE: Sync inventory/products for inventory widgets
      console.log('[Shopify Callback] Starting inventory sync for widgets...')
      try {
        const inventoryResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/shopify/inventory/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ connectionId })
        })
        
        if (inventoryResponse.ok) {
          console.log('[Shopify Callback] ✅ Inventory sync completed')
        } else {
          console.log('[Shopify Callback] ⚠️ Inventory sync failed, but continuing...')
        }
      } catch (inventoryError) {
        console.log('[Shopify Callback] ⚠️ Inventory sync error, but continuing...', inventoryError)
      }
      
      // Verify data was actually inserted
      const { data: verifyOrders, error: verifyError } = await supabase
        .from('shopify_orders')
        .select('id, total_price, created_at')
        .eq('connection_id', connectionId)
        .limit(5)
      
      if (verifyError) {
        console.error('[Shopify Callback] ❌ Error verifying inserted data:', verifyError)
      } else {
        console.log(`[Shopify Callback] ✅ Verification: Found ${verifyOrders?.length || 0} orders in database`)
        if (verifyOrders?.length) {
          console.log('[Shopify Callback] Sample orders:', verifyOrders.map(o => `#${o.id} ($${o.total_price})`))
        }
      }
      
      // 2. BACKGROUND: Start new queue-based sync architecture
      console.log('[Shopify Callback] Starting queue-based sync architecture...')
      try {
        const connectedResponse = await fetch(`${APP_URL}/api/shopify/connected/${brandId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            shop,
            accessToken: access_token,
            connectionId
          })
        })
        
        if (connectedResponse.ok) {
          const result = await connectedResponse.json()
          console.log(`[Shopify Callback] ✅ Queue-based sync initiated:`, result)
          
          // Update connection status to show v2 sync is active
          await supabase
            .from('platform_connections')
            .update({
              sync_status: 'syncing',
              metadata: {
                ...{}, // existing metadata
                v2_architecture: true,
                queue_sync_initiated: true,
                sync_architecture: 'queue_based_v2',
                sync_initiated_at: new Date().toISOString()
              }
            })
            .eq('id', connectionId)
            
        } else {
          const errorText = await connectedResponse.text()
          console.error('[Shopify Callback] ❌ Queue-based sync failed:', errorText)
        }
      } catch (err) {
        console.error('[Shopify Callback] Queue-based sync request failed:', err)
      }

      // 3. BACKGROUND: Trigger inventory sync (don't wait)
      fetch(`${APP_URL}/api/shopify/inventory/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId, forceRefresh: true })
      }).catch(err => console.error('[Shopify Callback] Inventory sync failed:', err))

    } catch (syncError) {
      console.error('[Shopify Callback] Error in immediate sync:', syncError)
      // Continue anyway - sync failure shouldn't block the redirect
    }

    // Trigger analytics processing for the new Shopify features
    try {
      // Import and process analytics data for compliance features
      const { ShopifyAnalyticsService } = await import('@/lib/services/shopifyAnalyticsService')
      
      // Process analytics in background (don't block redirect)
      ShopifyAnalyticsService.processAllAnalytics(brandId!, connectionId!)
        .then(() => console.log('[Shopify Callback] Analytics processing completed'))
        .catch(err => console.error('[Shopify Callback] Analytics processing failed:', err))
        
    } catch (analyticsError) {
      console.error('[Shopify Callback] Error starting analytics processing:', analyticsError)
    }

    // Trigger cache invalidation for brand health and metrics
    try {
      // Invalidate brand health cache
      fetch(`${APP_URL}/api/metrics/brand-aggregate?brandId=${brandId}&clearCache=true`, {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' }
      }).catch(err => console.error('[Shopify Callback] Cache invalidation failed:', err))
      
      // Trigger brand health refresh
      fetch(`${APP_URL}/api/brands/health?forceRefresh=true`, {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' }
      }).catch(err => console.error('[Shopify Callback] Brand health refresh failed:', err))
      
    } catch (cacheError) {
      console.error('[Shopify Callback] Error invalidating cache:', cacheError)
    }

    // Redirect to Brand Management tab with success message
    const successUrl = `${APP_URL}/settings?tab=brand-management&shopify_connected=true&shop=${encodeURIComponent(shop)}&dataRefreshed=true`
    return NextResponse.redirect(successUrl)

  } catch (error) {
    console.error('[Shopify Callback] Error:', error)
    return NextResponse.json({ 
      error: 'OAuth callback failed' 
    }, { status: 500 })
  }
} 
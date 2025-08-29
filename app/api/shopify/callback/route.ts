import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ||
                 (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                  'http://localhost:3000')

export async function GET(request: NextRequest) {
  const callbackStartTime = Date.now()
  const callbackId = `callback_${callbackStartTime}`
  
  console.log(`🚀 [SHOPIFY-SYNC-${callbackId}] ===== OAUTH CALLBACK STARTED =====`)
  console.log(`🚀 [SHOPIFY-SYNC-${callbackId}] Timestamp: ${new Date().toISOString()}`)
  console.log(`🚀 [SHOPIFY-SYNC-${callbackId}] Request URL: ${request.url}`)
  
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const shop = searchParams.get('shop')
    const state = searchParams.get('state')

    console.log(`📋 [SHOPIFY-SYNC-${callbackId}] OAuth parameters received:`)
    console.log(`📋 [SHOPIFY-SYNC-${callbackId}] - Code: ${code ? 'PRESENT' : 'MISSING'}`)
    console.log(`📋 [SHOPIFY-SYNC-${callbackId}] - Shop: ${shop || 'MISSING'}`)
    console.log(`📋 [SHOPIFY-SYNC-${callbackId}] - State: ${state ? 'PRESENT' : 'MISSING'}`)

    if (!code || !shop || !state) {
      console.error(`❌ [SHOPIFY-SYNC-${callbackId}] Missing required OAuth parameters`)
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Parse the state parameter to get brandId and connectionId
    let brandId: string | null = null, connectionId: string | null = null, isAutomated = false
    try {
      console.log(`🔍 [SHOPIFY-SYNC-${callbackId}] Parsing state parameter...`)
      const stateData = JSON.parse(state)
      brandId = stateData.brandId
      connectionId = stateData.connectionId
      isAutomated = stateData.automated === true
      
      console.log(`📋 [SHOPIFY-SYNC-${callbackId}] State parsed:`)
      console.log(`📋 [SHOPIFY-SYNC-${callbackId}] - Brand ID: ${brandId || 'NULL'}`)
      console.log(`📋 [SHOPIFY-SYNC-${callbackId}] - Connection ID: ${connectionId || 'NULL'}`)
      console.log(`📋 [SHOPIFY-SYNC-${callbackId}] - Is Automated: ${isAutomated}`)
      
      // For automated installs, brandId/connectionId won't be provided
      if (!isAutomated && (!brandId || !connectionId)) {
        throw new Error('Missing brandId or connectionId in state for manual install')
      }
    } catch (error) {
      console.error(`❌ [SHOPIFY-SYNC-${callbackId}] State parsing failed:`, error)
      return NextResponse.json({ error: 'Invalid state parameter' }, { status: 400 })
    }

    if (!SHOPIFY_CLIENT_ID || !SHOPIFY_CLIENT_SECRET) {
      console.error(`❌ [SHOPIFY-SYNC-${callbackId}] Shopify app not configured - missing client credentials`)
      return NextResponse.json({ error: 'Shopify app not configured' }, { status: 500 })
    }

    console.log(`🔄 [SHOPIFY-SYNC-${callbackId}] Starting OAuth token exchange...`)

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

    console.log(`📡 [SHOPIFY-SYNC-${callbackId}] Token exchange response status: ${tokenResponse.status}`)

        if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error(`❌ [SHOPIFY-SYNC-${callbackId}] Token exchange failed:`, errorText)
      return NextResponse.json({ error: 'Failed to exchange authorization code' }, { status: 400 })
        }

        const tokenData = await tokenResponse.json()
    const { access_token, scope } = tokenData

    console.log(`✅ [SHOPIFY-SYNC-${callbackId}] Access token obtained successfully`)
    console.log(`📋 [SHOPIFY-SYNC-${callbackId}] - Token length: ${access_token?.length || 0} chars`)
    console.log(`📋 [SHOPIFY-SYNC-${callbackId}] - Scopes: ${scope || 'NONE'}`)

    // Get shop information
    console.log(`🏪 [SHOPIFY-SYNC-${callbackId}] Fetching shop information...`)
    const shopInfoResponse = await fetch(`https://${shop}/admin/api/2024-01/shop.json`, {
      headers: {
        'X-Shopify-Access-Token': access_token,
      },
    })

    console.log(`📡 [SHOPIFY-SYNC-${callbackId}] Shop info response status: ${shopInfoResponse.status}`)

    if (!shopInfoResponse.ok) {
      const errorText = await shopInfoResponse.text()
      console.error(`❌ [SHOPIFY-SYNC-${callbackId}] Failed to fetch shop info:`, errorText)
      return NextResponse.json({ error: 'Failed to fetch shop information' }, { status: 400 })
    }

    const shopInfo = await shopInfoResponse.json()
    const shopData = shopInfo.shop

    console.log(`✅ [SHOPIFY-SYNC-${callbackId}] Shop information retrieved:`)
    console.log(`📋 [SHOPIFY-SYNC-${callbackId}] - Shop Name: ${shopData?.name || 'UNKNOWN'}`)
    console.log(`📋 [SHOPIFY-SYNC-${callbackId}] - Shop ID: ${shopData?.id || 'UNKNOWN'}`)
    console.log(`📋 [SHOPIFY-SYNC-${callbackId}] - Currency: ${shopData?.currency || 'UNKNOWN'}`)
    console.log(`📋 [SHOPIFY-SYNC-${callbackId}] - Country: ${shopData?.country_name || 'UNKNOWN'}`)

    // For automated installs, just return success without database operations
    if (isAutomated) {
      console.log(`🤖 [SHOPIFY-SYNC-${callbackId}] Automated install - returning success without DB operations`)
      return NextResponse.json({ 
        message: 'Automated install successful',
        shop: shop,
        scopes: scope
      })
    }

    // Store the connection in database
    console.log(`💾 [SHOPIFY-SYNC-${callbackId}] Initializing database connection...`)
    const supabase = createClient()
    
    // Get the specific connection that was created in the settings flow
    console.log(`🔍 [SHOPIFY-SYNC-${callbackId}] Looking up existing connection: ${connectionId}`)
    const { data: existingConnection, error: fetchError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('id', connectionId!)
      .single()

    if (fetchError || !existingConnection) {
      console.error(`❌ [SHOPIFY-SYNC-${callbackId}] Connection lookup failed:`, fetchError)
      console.log(`🔍 [SHOPIFY-SYNC-${callbackId}] Searching for any connections for this brand...`)
      
      // Debug: Check what connections exist
      const { data: allConnections } = await supabase
        .from('platform_connections')
        .select('id, brand_id, platform_type, status, created_at')
        .eq('brand_id', brandId!)
        .eq('platform_type', 'shopify')
        .order('created_at', { ascending: false })
        .limit(5)
      
      console.log(`🔍 [SHOPIFY-SYNC-${callbackId}] Found ${allConnections?.length || 0} Shopify connections for brand ${brandId}:`)
      allConnections?.forEach((conn, idx) => {
        console.log(`📋 [SHOPIFY-SYNC-${callbackId}] Connection ${idx + 1}: ID=${conn.id}, Status=${conn.status}, Created=${conn.created_at}`)
      })
      
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }

    console.log(`✅ [SHOPIFY-SYNC-${callbackId}] Found existing connection:`)
    console.log(`📋 [SHOPIFY-SYNC-${callbackId}] - Connection ID: ${existingConnection.id}`)
    console.log(`📋 [SHOPIFY-SYNC-${callbackId}] - Brand ID: ${existingConnection.brand_id}`)
    console.log(`📋 [SHOPIFY-SYNC-${callbackId}] - Current Status: ${existingConnection.status}`)
    console.log(`📋 [SHOPIFY-SYNC-${callbackId}] - Current Sync Status: ${existingConnection.sync_status || 'NONE'}`)

    // Update the existing connection with access token and shop data
    console.log(`💾 [SHOPIFY-SYNC-${callbackId}] Updating connection with OAuth data...`)
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
          connected_at: new Date().toISOString(),
          callback_id: callbackId
        }
      })
      .eq('id', connectionId)

    if (updateError) {
      console.error(`❌ [SHOPIFY-SYNC-${callbackId}] Failed to update connection:`, updateError)
      return NextResponse.json({ error: 'Failed to save connection' }, { status: 500 })
    }

    console.log(`✅ [SHOPIFY-SYNC-${callbackId}] Connection updated successfully in database`)

    // Start FULL HISTORICAL DATA SYNC immediately
    console.log(`🚀 [SHOPIFY-SYNC-${callbackId}] ===== STARTING FULL HISTORICAL DATA SYNC =====`)
    try {
      console.log(`📊 [SHOPIFY-SYNC-${callbackId}] Initiating full historical sync for shop: ${shop}`)
      console.log(`📊 [SHOPIFY-SYNC-${callbackId}] Brand ID: ${brandId}`)
      console.log(`📊 [SHOPIFY-SYNC-${callbackId}] Connection ID: ${connectionId}`)

      // Update connection status to show we're starting sync
      console.log(`💾 [SHOPIFY-SYNC-${callbackId}] Updating connection status to 'syncing'...`)
      const { error: syncStatusError } = await supabase
        .from('platform_connections')
        .update({
          sync_status: 'syncing',
          metadata: {
            full_historical_sync: true,
            sync_started_at: new Date().toISOString(),
            sync_architecture: 'full_historical_v3',
            callback_id: callbackId
          }
        })
        .eq('id', connectionId)

      if (syncStatusError) {
        console.error(`❌ [SHOPIFY-SYNC-${callbackId}] Failed to update sync status:`, syncStatusError)
      } else {
        console.log(`✅ [SHOPIFY-SYNC-${callbackId}] Connection sync status updated to 'syncing'`)
      }

      // Start the new queue-based FULL historical sync
      const connectedUrl = `${APP_URL}/api/shopify/connected/${brandId}`
      console.log(`📡 [SHOPIFY-SYNC-${callbackId}] Calling connected API: ${connectedUrl}`)
      
      const connectedResponse = await fetch(connectedUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-call': 'true'
        },
        body: JSON.stringify({
          shop,
          accessToken: access_token,
          connectionId
        })
      })

      console.log(`📡 [SHOPIFY-SYNC-${callbackId}] Connected API response status: ${connectedResponse.status}`)

      if (connectedResponse.ok) {
        const result = await connectedResponse.json()
        console.log(`✅ [SHOPIFY-SYNC-${callbackId}] Full historical sync initiated successfully:`)
        console.log(`📋 [SHOPIFY-SYNC-${callbackId}] Response:`, JSON.stringify(result, null, 2))
      } else {
        const errorText = await connectedResponse.text()
        console.error(`❌ [SHOPIFY-SYNC-${callbackId}] Failed to initiate full historical sync:`)
        console.error(`❌ [SHOPIFY-SYNC-${callbackId}] Status: ${connectedResponse.status}`)
        console.error(`❌ [SHOPIFY-SYNC-${callbackId}] Error: ${errorText}`)
      }

    } catch (syncError) {
      console.error(`❌ [SHOPIFY-SYNC-${callbackId}] Error starting full historical sync:`, syncError)
      console.error(`❌ [SHOPIFY-SYNC-${callbackId}] Stack trace:`, syncError instanceof Error ? syncError.stack : 'No stack trace')
      // Don't block redirect for sync errors
    }

    // Trigger analytics processing for the new Shopify features
    console.log(`📈 [SHOPIFY-SYNC-${callbackId}] Starting analytics processing...`)
    try {
      // Import and process analytics data for compliance features
      const { ShopifyAnalyticsService } = await import('@/lib/services/shopifyAnalyticsService')
      
      console.log(`📈 [SHOPIFY-SYNC-${callbackId}] Analytics service imported, starting background processing...`)
      
      // Process analytics in background (don't block redirect)
      ShopifyAnalyticsService.processAllAnalytics(brandId!, connectionId!)
        .then(() => { 
          console.log(`✅ [SHOPIFY-SYNC-${callbackId}] Analytics processing completed successfully`)
        })
        .catch(err => { 
          console.error(`❌ [SHOPIFY-SYNC-${callbackId}] Analytics processing failed:`, err)
        })
        
    } catch (analyticsError) {
      console.error(`❌ [SHOPIFY-SYNC-${callbackId}] Error starting analytics processing:`, analyticsError)
    }

    // Trigger cache invalidation for brand health and metrics
    console.log(`🗑️ [SHOPIFY-SYNC-${callbackId}] Starting cache invalidation...`)
    try {
      // Invalidate brand health cache
      console.log(`🗑️ [SHOPIFY-SYNC-${callbackId}] Invalidating brand health cache...`)
      fetch(`${APP_URL}/api/metrics/brand-aggregate?brandId=${brandId}&clearCache=true`, {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' }
      }).catch(err => console.error(`❌ [SHOPIFY-SYNC-${callbackId}] Brand aggregate cache invalidation failed:`, err))
      
      // Trigger brand health refresh
      console.log(`🔄 [SHOPIFY-SYNC-${callbackId}] Triggering brand health refresh...`)
      fetch(`${APP_URL}/api/brands/health?forceRefresh=true`, {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' }
      }).catch(err => console.error(`❌ [SHOPIFY-SYNC-${callbackId}] Brand health refresh failed:`, err))
      
    } catch (cacheError) {
      console.error(`❌ [SHOPIFY-SYNC-${callbackId}] Error invalidating cache:`, cacheError)
    }

    const callbackEndTime = Date.now()
    const totalTime = callbackEndTime - callbackStartTime
    console.log(`🎉 [SHOPIFY-SYNC-${callbackId}] ===== OAUTH CALLBACK COMPLETED =====`)
    console.log(`⏱️ [SHOPIFY-SYNC-${callbackId}] Total callback time: ${totalTime}ms`)

    // Redirect to Brand Management tab with success message
    const successUrl = `${APP_URL}/settings?tab=brand-management&shopify_connected=true&shop=${encodeURIComponent(shop)}&dataRefreshed=true&callback_id=${callbackId}`
    console.log(`🔄 [SHOPIFY-SYNC-${callbackId}] Redirecting to: ${successUrl}`)
    return NextResponse.redirect(successUrl)

  } catch (error) {
    console.error(`❌ [SHOPIFY-SYNC-${callbackId}] FATAL ERROR in OAuth callback:`, error)
    console.error(`❌ [SHOPIFY-SYNC-${callbackId}] Stack trace:`, error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({ 
      error: 'OAuth callback failed',
      callback_id: callbackId,
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 
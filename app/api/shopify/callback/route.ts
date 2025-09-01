import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ||
                 (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                  'http://localhost:3000')

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
      return NextResponse.json({ error: 'Invalid state parameter' }, { status: 400 })
    }

    if (!SHOPIFY_CLIENT_ID || !SHOPIFY_CLIENT_SECRET) {
      return NextResponse.json({ error: 'Shopify app not configured' }, { status: 500 })
    }

    // Processing OAuth callback

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
      return NextResponse.json({ error: 'Failed to exchange authorization code' }, { status: 400 })
        }

        const tokenData = await tokenResponse.json()
    const { access_token, scope } = tokenData

    // Access token obtained successfully

    // Get shop information
    const shopInfoResponse = await fetch(`https://${shop}/admin/api/2024-01/shop.json`, {
      headers: {
        'X-Shopify-Access-Token': access_token,
      },
    })

    if (!shopInfoResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch shop information' }, { status: 400 })
    }

    const shopInfo = await shopInfoResponse.json()
    const shopData = shopInfo.shop

    // For automated installs, just return success without database operations
    if (isAutomated) {
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
      // Connection not found
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
      return NextResponse.json({ error: 'Failed to save connection' }, { status: 500 })
    }

    // Start FULL HISTORICAL DATA SYNC immediately
    try {
      console.log(`[Shopify Callback] Starting FULL historical data sync for shop: ${shop}`)

      // Update connection status to show we're starting sync
      await supabase
        .from('platform_connections')
        .update({
          sync_status: 'syncing',
          metadata: {
            full_historical_sync: true,
            sync_started_at: new Date().toISOString(),
            sync_architecture: 'full_historical_v3'
          }
        })
        .eq('id', connectionId)

      // Start the new queue-based FULL historical sync
      const connectedResponse = await fetch(`${APP_URL}/api/shopify/connected/${brandId}`, {
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

      if (connectedResponse.ok) {
        const result = await connectedResponse.json()
        console.log(`[Shopify Callback] Full historical sync initiated successfully:`, result)
      } else {
        const errorText = await connectedResponse.text()
        console.error(`[Shopify Callback] Failed to initiate full historical sync:`, errorText)
      }

    } catch (syncError) {
      console.error(`[Shopify Callback] Error starting full historical sync:`, syncError)
      // Don't block redirect for sync errors
    }

    // Trigger analytics processing for the new Shopify features
    try {
      // Import and process analytics data for compliance features
      const { ShopifyAnalyticsService } = await import('@/lib/services/shopifyAnalyticsService')
      
      // Process analytics in background (don't block redirect)
      ShopifyAnalyticsService.processAllAnalytics(brandId!, connectionId!)
        .then(() => { /* Analytics processing completed */ })
        .catch(err => { /* Analytics processing failed */ })
        
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
    const successUrl = `${APP_URL}/settings?tab=brand-management&shopify_connected=true&shop=${encodeURIComponent(shop)}${brandId ? `&brandId=${encodeURIComponent(brandId)}` : ''}&dataRefreshed=true`
    return NextResponse.redirect(successUrl)

  } catch (error) {
    console.error('[Shopify Callback] Error:', error)
    return NextResponse.json({ 
      error: 'OAuth callback failed' 
    }, { status: 500 })
  }
} 
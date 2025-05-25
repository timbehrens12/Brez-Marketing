import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * Force refresh Shopify data - bypasses ALL caching and fetches fresh data from Shopify API
 */
export async function POST(request: NextRequest) {
  try {
    const { brandId, connectionId } = await request.json()
    
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    console.log(`[Force Shopify Refresh] Starting aggressive refresh for brand ${brandId}`)
    
    // Step 1: Get Shopify connection if not provided
    let shopifyConnectionId = connectionId
    if (!shopifyConnectionId) {
      const { data: connection } = await supabase
        .from('platform_connections')
        .select('id')
        .eq('brand_id', brandId)
        .eq('platform_type', 'shopify')
        .eq('status', 'active')
        .single()
      
      if (!connection) {
        return NextResponse.json({ error: 'No active Shopify connection found' }, { status: 404 })
      }
      shopifyConnectionId = connection.id
    }
    
    console.log(`[Force Shopify Refresh] Using connection ${shopifyConnectionId}`)
    
    // Step 2: Force sync from Shopify API
    const syncResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/shopify/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        connectionId: shopifyConnectionId,
        forceRefresh: true,
        bypassCache: true,
        aggressiveSync: true,
        clearCache: true
      })
    })
    
    const syncResult = await syncResponse.json()
    console.log(`[Force Shopify Refresh] Sync response:`, syncResult)
    
    // Step 3: Force refresh orders and analytics
    const ordersResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/shopify/analytics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brandId,
        forceRefresh: true,
        bypassCache: true
      })
    })
    
    const ordersResult = await ordersResponse.json()
    console.log(`[Force Shopify Refresh] Orders response:`, ordersResult)
    
    return NextResponse.json({
      success: true,
      message: 'Shopify data force refreshed successfully',
      syncResult,
      ordersResult,
      refreshedAt: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('[Force Shopify Refresh] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to force refresh Shopify data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 
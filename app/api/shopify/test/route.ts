import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Test endpoint to check Shopify integration status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get('shop')

    const supabase = createClient()

    if (shop) {
      // Check specific shop
      const { data: connection, error } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('platform_type', 'shopify')
        .eq('shop', shop)
        .single()

      return NextResponse.json({
        success: true,
        shop,
        connection: connection ? {
          id: connection.id,
          status: connection.status,
          sync_status: connection.sync_status,
          has_access_token: !!connection.access_token,
          user_linked: !!connection.user_id && connection.user_id !== 'pending',
          brand_linked: !!connection.brand_id,
          last_synced: connection.last_synced_at,
          shop_name: connection.metadata?.shop_name
        } : null,
        error: error?.message
      })
    } else {
      // Check all Shopify connections
      const { data: connections, error } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('platform_type', 'shopify')
        .order('created_at', { ascending: false })
        .limit(10)

      const { data: gdprRequests } = await supabase
        .from('gdpr_requests')
        .select('*')
        .limit(5)

      return NextResponse.json({
        success: true,
        summary: {
          total_shopify_connections: connections?.length || 0,
          connected_stores: connections?.filter(c => c.status === 'connected').length || 0,
          linked_stores: connections?.filter(c => c.user_id && c.user_id !== 'pending').length || 0,
          gdpr_requests: gdprRequests?.length || 0
        },
        recent_connections: connections?.map(c => ({
          id: c.id,
          shop: c.shop,
          status: c.status,
          user_linked: !!c.user_id && c.user_id !== 'pending',
          brand_linked: !!c.brand_id,
          created_at: c.created_at
        })) || []
      })
    }

  } catch (error) {
    console.error('[Shopify Test] Error:', error)
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

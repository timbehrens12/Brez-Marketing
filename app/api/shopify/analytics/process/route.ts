import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { auth } from '@clerk/nextjs/server'
import { ShopifyAnalyticsService } from '@/lib/services/shopifyAnalyticsService'

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { brandId } = await request.json()

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    const supabase = createClient()

    // Get the connection for this brand
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('id')
      .eq('brand_id', brandId)
      .eq('platform_type', 'shopify')
      .eq('user_id', userId)
      .single()

    if (connectionError || !connection) {
      return NextResponse.json({ error: 'Shopify connection not found' }, { status: 404 })
    }

    console.log(`[Analytics Process] Starting manual analytics processing for brand ${brandId}`)

    // Process all analytics
    await ShopifyAnalyticsService.processAllAnalytics(brandId, connection.id)

    return NextResponse.json({ 
      success: true, 
      message: 'Analytics processing completed successfully' 
    })

  } catch (error) {
    console.error('Analytics processing API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { auth } from '@clerk/nextjs/server'

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    const timeRange = searchParams.get('timeRange') || '30d'

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    const supabase = createClient()

    // Get connection for this brand
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('id')
      .eq('platform_type', 'shopify')
      .eq('brand_id', brandId)
      .eq('user_id', userId)
      .single()

    if (connectionError || !connection) {
      return NextResponse.json({ error: 'No Shopify connection found for this brand' }, { status: 404 })
    }

    // Get product analytics data
    const { data: productData, error: productError } = await supabase
      .from('shopify_product_analytics')
      .select('*')
      .eq('connection_id', connection.id)
      .order('revenue', { ascending: false })

    if (productError) {
      console.error('Error fetching product analytics:', productError)
      return NextResponse.json({ error: 'Failed to fetch product analytics' }, { status: 500 })
    }

    // Calculate insights
    const insights = {
      topPerformingProducts: productData?.slice(0, 10) || [],
      lowConversionProducts: productData?.filter(p => p.conversion_rate < 1.0).slice(0, 5) || [],
      outOfStockImpact: productData?.filter(p => p.out_of_stock_count > 0) || [],
      highSearchCTR: productData?.filter(p => p.search_ctr > 5.0) || [],
      totalRevenue: productData?.reduce((sum, p) => sum + (p.revenue || 0), 0) || 0,
      averageConversionRate: productData?.length ?
        productData.reduce((sum, p) => sum + (p.conversion_rate || 0), 0) / productData.length : 0
    }

    return NextResponse.json({
      success: true,
      data: productData || [],
      insights,
      timeRange
    })

  } catch (error) {
    console.error('Error in product performance analytics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

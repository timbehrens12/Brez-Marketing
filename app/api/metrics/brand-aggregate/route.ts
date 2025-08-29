import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    const clearCache = url.searchParams.get('clearCache') === 'true'
    
    if (!brandId) {
      return NextResponse.json({ error: 'Missing brandId parameter' }, { status: 400 })
    }

    const supabase = createClient()
    
    // Get today's date for filtering
    const today = new Date()
    const todayStr = format(today, 'yyyy-MM-dd')
    
    // Also get yesterday to include recent sales
    const yesterday = new Date(today.getTime() - 24*60*60*1000)
    const yesterdayStr = format(yesterday, 'yyyy-MM-dd')
    
    // Create local timezone date ranges (start/end of day in local time converted to UTC for DB query)
    const todayStartOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const todayEndOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    const yesterdayStartOfDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0, 0);
    const yesterdayEndOfDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
    
    // Timezone debugging for brand aggregate
    
    // Step 1: Get Shopify sales for today + yesterday for this brand (to be more helpful)
    const { data: shopifyConnections } = await supabase
      .from('platform_connections')
      .select('id')
      .eq('brand_id', brandId)
      .eq('platform_type', 'shopify')
      .eq('status', 'active')

    let shopifySales = 0
    if (shopifyConnections?.length) {
      const connectionIds = shopifyConnections.map(c => c.id)
      
      // Use timezone-aware filtering like the main API
      const { data: allOrders } = await supabase
        .from('shopify_orders')
        .select('total_price, created_at')
        .in('connection_id', connectionIds)
        .order('created_at', { ascending: false })
      
      // Filter by user's timezone date (same logic as main API)
      const userTimezone = 'America/Chicago'; // Default to Chicago for now
      const todayOrders = allOrders?.filter(order => {
        if (!order.created_at) return false;
        const orderDate = new Date(order.created_at);
        const userTimezoneDate = orderDate.toLocaleDateString('en-CA', { 
          timeZone: userTimezone 
        }); // YYYY-MM-DD format
        return userTimezoneDate === todayStr;
      }) || [];
      
      const yesterdayOrders = allOrders?.filter(order => {
        if (!order.created_at) return false;
        const orderDate = new Date(order.created_at);
        const userTimezoneDate = orderDate.toLocaleDateString('en-CA', { 
          timeZone: userTimezone 
        }); // YYYY-MM-DD format
        return userTimezoneDate === yesterdayStr;
      }) || [];

      const todaySales = todayOrders?.reduce((sum, order) => 
        sum + (parseFloat(order.total_price) || 0), 0) || 0
      const yesterdaySales = yesterdayOrders?.reduce((sum, order) => 
        sum + (parseFloat(order.total_price) || 0), 0) || 0
        
      // Brand aggregate orders summary
      
      if (todayOrders?.length) {
        // Today's orders timestamps logged
      }
        
      // Use today's sales, but if zero, show yesterday's as "recent sales"
      shopifySales = todaySales > 0 ? todaySales : yesterdaySales
      // Final shopify sales value calculated
    }

    // Step 2: Get Meta ad data for today for this brand
    const { data: metaData } = await supabase
      .from('meta_campaign_daily_stats')
      .select('spend, roas, conversions')
      .eq('brand_id', brandId)
      .eq('date', todayStr)

    let metaSpend = 0
    let metaROAS = 0
    let metaRevenue = 0
    let metaConversions = 0
    
    if (metaData?.length) {
      // Aggregate all campaigns for this brand
      metaSpend = metaData.reduce((sum, record) => sum + (parseFloat(record.spend) || 0), 0)
      metaConversions = metaData.reduce((sum, record) => sum + (parseInt(record.conversions) || 0), 0)
      
      // Calculate average ROAS weighted by spend
      let totalWeightedRoas = 0
      let totalSpendForWeighting = 0
      
      metaData.forEach(record => {
        const spend = parseFloat(record.spend) || 0
        const roas = parseFloat(record.roas) || 0
        if (spend > 0) {
          totalWeightedRoas += roas * spend
          totalSpendForWeighting += spend
        }
      })
      
      metaROAS = totalSpendForWeighting > 0 ? totalWeightedRoas / totalSpendForWeighting : 0
      metaRevenue = metaSpend * metaROAS
    }

    return NextResponse.json({
      shopifySales: Math.round(shopifySales * 100) / 100,
      adRevenue: Math.round(metaRevenue * 100) / 100,
      adSpend: Math.round(metaSpend * 100) / 100,
      roas: Math.round(metaROAS * 100) / 100,
      conversions: metaConversions,
      platformBreakdown: {
        meta: { 
          revenue: Math.round(metaRevenue * 100) / 100, 
          spend: Math.round(metaSpend * 100) / 100, 
          roas: Math.round(metaROAS * 100) / 100,
          conversions: metaConversions
        },
        google: { revenue: 0, spend: 0, roas: 0, conversions: 0 },
        tiktok: { revenue: 0, spend: 0, roas: 0, conversions: 0 }
      }
    }, {
      headers: clearCache ? 
        { 'Cache-Control': 'no-cache, no-store, must-revalidate' } :
        { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' }
    })

  } catch (error) {
    // Error fetching brand aggregate metrics
    return NextResponse.json({ 
      error: 'Failed to fetch brand metrics' 
    }, { status: 500 })
  }
}

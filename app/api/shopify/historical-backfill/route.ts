import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { auth } from '@clerk/nextjs/server'

/**
 * Shopify Historical Backfill API
 * Fills gaps in historical data for specified date ranges
 * Much safer than disconnect/reconnect
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { 
      brandId, 
      startDate, 
      endDate, 
      forceRefresh = false 
    } = await request.json()
    
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    // Default to ALL historical data (2 years back) if no dates provided
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000)
    const end = endDate ? new Date(endDate) : new Date()

    console.log(`[Shopify Historical Backfill] Starting backfill for brand ${brandId}`)
    console.log(`[Shopify Historical Backfill] Date range: ${start.toISOString()} to ${end.toISOString()}`)

    const supabase = createClient()

    // Get active Shopify connections for this brand
    const { data: connections, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'shopify')
      .eq('status', 'active')

    if (connectionError) {
      console.error('[Shopify Historical Backfill] Error fetching connections:', connectionError)
      return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 })
    }

    if (!connections || connections.length === 0) {
      return NextResponse.json({ 
        error: 'No active Shopify connections found for this brand' 
      }, { status: 400 })
    }

    const results = []

    for (const connection of connections) {
      try {
        console.log(`[Shopify Historical Backfill] Processing connection ${connection.id} for shop ${connection.shop}`)
        
        const result = await backfillHistoricalData(
          brandId,
          connection.shop,
          connection.access_token,
          connection.id,
          start,
          end,
          forceRefresh
        )
        
        results.push({
          connectionId: connection.id,
          shop: connection.shop,
          ...result
        })

      } catch (error) {
        console.error(`[Shopify Historical Backfill] Error processing connection ${connection.id}:`, error)
        results.push({
          connectionId: connection.id,
          shop: connection.shop,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const errorCount = results.filter(r => !r.success).length

    return NextResponse.json({
      success: true,
      message: `Historical backfill completed: ${successCount} success, ${errorCount} errors`,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString()
      },
      results
    })

  } catch (error) {
    console.error('[Shopify Historical Backfill] Error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

/**
 * Backfill historical data for a specific connection and date range
 */
export async function backfillHistoricalData(
  brandId: string,
  shop: string,
  accessToken: string,
  connectionId: string,
  startDate: Date,
  endDate: Date,
  forceRefresh: boolean
): Promise<{ success: boolean; ordersAdded: number; customersAdded: number; error?: string }> {
  
  const supabase = createClient()
  
  try {
    console.log(`[Backfill] Starting backfill for shop ${shop} from ${startDate.toISOString()} to ${endDate.toISOString()}`)

    // Step 1: Check what data we already have to avoid duplicates (unless force refresh)
    let existingOrderIds: Set<number> = new Set()
    
    if (!forceRefresh) {
      const { data: existingOrders } = await supabase
        .from('shopify_orders')
        .select('id')
        .eq('brand_id', brandId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
      
      existingOrderIds = new Set(existingOrders?.map(o => o.id) || [])
      console.log(`[Backfill] Found ${existingOrderIds.size} existing orders in date range`)
    }

    // Step 2: Fetch orders from Shopify API in batches
    let allOrders: any[] = []
    let pageInfo = { hasNextPage: true, cursor: null }
    let pageCount = 0
    const maxPages = 200 // Increased limit to get ALL historical data

    while (pageInfo.hasNextPage && pageCount < maxPages) {
      pageCount++
      
      // Use REST API for historical data (more reliable than GraphQL for date ranges)
      let url = `https://${shop}/admin/api/2024-01/orders.json?` +
        `status=any&created_at_min=${startDate.toISOString()}&created_at_max=${endDate.toISOString()}&limit=250`
      
      if (pageInfo.cursor) {
        url += `&page_info=${pageInfo.cursor}`
      }
      
      console.log(`[Backfill] Fetching page ${pageCount} for ${shop}`)
      
      const response = await fetch(url, {
        headers: { 'X-Shopify-Access-Token': accessToken }
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Shopify API error: ${response.status} - ${errorText}`)
      }
      
      const data = await response.json()
      const orders = data.orders || []
      
      console.log(`[Backfill] Fetched ${orders.length} orders from page ${pageCount}`)
      
      // Filter out orders we already have (unless force refresh)
      const newOrders = forceRefresh ? orders : orders.filter(order => !existingOrderIds.has(order.id))
      allOrders.push(...newOrders)
      
      // Check if there are more pages (REST API pagination)
      const linkHeader = response.headers.get('Link')
      pageInfo.hasNextPage = linkHeader?.includes('rel="next"') || false
      
      if (pageInfo.hasNextPage && linkHeader) {
        // Extract next page cursor from Link header
        const nextMatch = linkHeader.match(/<[^>]*page_info=([^&>]+)[^>]*>;\s*rel="next"/)
        pageInfo.cursor = nextMatch?.[1] || null
      }
      
      // Small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.log(`[Backfill] Total orders to process: ${allOrders.length}`)

    // Step 3: Process and insert orders
    let ordersAdded = 0
    let customersAdded = 0
    const customerEmails = new Set()

    for (const order of allOrders) {
      try {
        // Transform order data to match our database schema
        const transformedOrder = {
          id: order.id,
          brand_id: brandId,
          connection_id: connectionId,
          order_number: order.order_number || order.number,
          total_price: parseFloat(order.total_price) || 0,
          subtotal_price: parseFloat(order.subtotal_price) || 0,
          total_tax: parseFloat(order.total_tax) || 0,
          currency: order.currency || 'USD',
          financial_status: order.financial_status,
          fulfillment_status: order.fulfillment_status,
          customer_id: order.customer?.id || null,
          customer_email: order.customer?.email || null,
          customer_first_name: order.customer?.first_name || null,
          customer_last_name: order.customer?.last_name || null,
          created_at: order.created_at,
          updated_at: order.updated_at,
          processed_at: order.processed_at,
          tags: order.tags || '',
          note: order.note || '',
          shipping_city: order.shipping_address?.city || null,
          shipping_province: order.shipping_address?.province || null,
          shipping_country: order.shipping_address?.country || null,
          shipping_country_code: order.shipping_address?.country_code || null,
          synced_at: new Date().toISOString()
        }

        // Insert or update order
        if (forceRefresh) {
          const { error } = await supabase
            .from('shopify_orders')
            .upsert(transformedOrder, { onConflict: 'id' })
          
          if (error) {
            console.error(`[Backfill] Error upserting order ${order.id}:`, error)
          } else {
            ordersAdded++
          }
        } else {
          const { error } = await supabase
            .from('shopify_orders')
            .insert(transformedOrder)
          
          if (error && !error.message.includes('duplicate key')) {
            console.error(`[Backfill] Error inserting order ${order.id}:`, error)
          } else if (!error) {
            ordersAdded++
          }
        }

        // Track unique customers
        if (order.customer?.email && !customerEmails.has(order.customer.email)) {
          customerEmails.add(order.customer.email)
          customersAdded++
        }

        // Also create regional sales data for location analysis
        if (order.shipping_address && (order.shipping_address.city || order.shipping_address.country)) {
          const regionData = {
            brand_id: brandId,
            connection_id: connectionId,
            order_id: order.id.toString(),
            city: order.shipping_address.city || '',
            province: order.shipping_address.province || '',
            country: order.shipping_address.country || '',
            country_code: order.shipping_address.country_code || '',
            total_sales: parseFloat(order.total_price) || 0,
            order_count: 1,
            synced_at: new Date().toISOString()
          }

          await supabase
            .from('shopify_sales_by_region')
            .upsert(regionData, { onConflict: 'order_id' })
            .catch(err => console.log('Regional data upsert failed (non-critical):', err.message))
        }

      } catch (orderError) {
        console.error(`[Backfill] Error processing order ${order.id}:`, orderError)
      }
    }

    console.log(`[Backfill] Completed for ${shop}: ${ordersAdded} orders, ${customersAdded} unique customers`)

    return {
      success: true,
      ordersAdded,
      customersAdded
    }

  } catch (error) {
    console.error(`[Backfill] Error for shop ${shop}:`, error)
    return {
      success: false,
      ordersAdded: 0,
      customersAdded: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Allow GET for manual triggering
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const brandId = url.searchParams.get('brandId')
  const startDate = url.searchParams.get('startDate')
  const endDate = url.searchParams.get('endDate')
  const forceRefresh = url.searchParams.get('forceRefresh') === 'true'
  
  if (!brandId) {
    return NextResponse.json({ error: 'brandId parameter is required' }, { status: 400 })
  }
  
  // Convert to POST request format
  const mockRequest = new Request(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brandId, startDate, endDate, forceRefresh })
  }) as NextRequest
  
  return POST(mockRequest)
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs'

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const connectionId = searchParams.get('connectionId')
    const dateRangeStart = searchParams.get('dateRangeStart')
    const dateRangeEnd = searchParams.get('dateRangeEnd')

    if (!connectionId) {
      return NextResponse.json({ error: 'Connection ID is required' }, { status: 400 })
    }

    // Verify user has access to this connection through brand access
    const { data: connection } = await supabase
      .from('platform_connections')
      .select(`
        id,
        brand_id,
        brands!inner (
          id,
          user_id
        )
      `)
      .eq('id', connectionId)
      .eq('platform_type', 'shopify')
      .single()

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }

    // Check if user owns the brand or has access through brand_access
    const { data: brandAccess } = await supabase
      .from('brand_access')
      .select('id')
      .eq('brand_id', connection.brand_id)
      .eq('user_id', userId)
      .single()

    const isOwner = connection.brands.user_id === userId
    const hasAccess = brandAccess?.id

    if (!isOwner && !hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Fetch orders with date filter
    let ordersQuery = supabase
      .from('shopify_orders')
      .select('*')
      .eq('connection_id', connectionId)
      .order('created_at', { ascending: false })
      .limit(500)

    if (dateRangeStart && dateRangeEnd) {
      ordersQuery = ordersQuery
        .gte('created_at', dateRangeStart)
        .lte('created_at', dateRangeEnd)
    }

    const { data: orders, error: ordersError } = await ordersQuery

    if (ordersError) {
      console.error('Error fetching orders:', ordersError)
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
    }

    // Fetch inventory items for cost data
    const { data: inventoryItems, error: inventoryError } = await supabase
      .from('shopify_inventory_items')
      .select('*')
      .eq('brand_id', connection.brand_id)

    if (inventoryError) {
      console.error('Error fetching inventory items:', inventoryError)
      return NextResponse.json({ error: 'Failed to fetch inventory data' }, { status: 500 })
    }

    // Fetch products for variant mapping
    const { data: products, error: productsError } = await supabase
      .from('shopify_products_enhanced')
      .select('*')
      .eq('connection_id', connectionId)

    if (productsError) {
      console.error('Error fetching products:', productsError)
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
    }

    // Create mapping of variant_id to inventory_item_id to cost
    const variantCostMap = new Map()
    for (const product of products) {
      if (product.variants && Array.isArray(product.variants)) {
        for (const variant of product.variants) {
          const inventoryItem = inventoryItems.find(item => 
            item.inventory_item_id === variant.inventory_item_id?.toString()
          )
          if (inventoryItem && inventoryItem.cost) {
            variantCostMap.set(variant.id?.toString(), inventoryItem.cost)
          }
        }
      }
    }

    // Process orders to calculate margins
    const marginData = []
    for (const order of orders) {
      if (order.line_items && Array.isArray(order.line_items)) {
        for (const lineItem of order.line_items) {
          const variantId = lineItem.variant_id?.toString()
          const unitCost = variantCostMap.get(variantId) || 0
          const quantity = parseInt(lineItem.quantity || '0')
          const unitPrice = parseFloat(lineItem.price || '0')
          const lineTotal = quantity * unitPrice
          const totalCost = quantity * unitCost
          const lineProfit = lineTotal - totalCost
          const marginPercentage = lineTotal > 0 ? (lineProfit / lineTotal) * 100 : 0

          marginData.push({
            order_id: order.id,
            order_name: order.name,
            created_at: order.created_at,
            product_title: lineItem.title,
            quantity,
            unit_price: unitPrice,
            unit_cost: unitCost,
            line_total: lineTotal,
            total_cost: totalCost,
            line_profit: lineProfit,
            margin_percentage: marginPercentage
          })
        }
      }
    }

    // Calculate summary statistics
    const totalRevenue = marginData.reduce((sum: number, item: any) => sum + parseFloat(item.line_total || 0), 0)
    const totalCost = marginData.reduce((sum: number, item: any) => sum + parseFloat(item.total_cost || 0), 0)
    const totalProfit = totalRevenue - totalCost
    const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

    // Group by product for top/bottom performers
    const productMargins = marginData.reduce((acc: any, item: any) => {
      const key = item.product_title
      if (!acc[key]) {
        acc[key] = {
          product_title: key,
          total_revenue: 0,
          total_cost: 0,
          total_profit: 0,
          units_sold: 0
        }
      }
      acc[key].total_revenue += parseFloat(item.line_total || 0)
      acc[key].total_cost += parseFloat(item.total_cost || 0)
      acc[key].total_profit += parseFloat(item.line_profit || 0)
      acc[key].units_sold += parseInt(item.quantity || 0)
      return acc
    }, {})

    const productPerformance = Object.values(productMargins).map((product: any) => ({
      ...product,
      margin_percentage: product.total_revenue > 0 ? (product.total_profit / product.total_revenue) * 100 : 0
    })).sort((a: any, b: any) => b.margin_percentage - a.margin_percentage)

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          total_revenue: totalRevenue,
          total_cost: totalCost,
          total_profit: totalProfit,
          overall_margin: overallMargin,
          orders_analyzed: marginData.length
        },
        line_items: marginData,
        top_products: productPerformance.slice(0, 10),
        bottom_products: productPerformance.slice(-10).reverse()
      }
    })

  } catch (error) {
    console.error('Error in margin analysis API:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

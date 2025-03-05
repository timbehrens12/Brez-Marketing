import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const shop = searchParams.get('shop')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  if (!shop || !from || !to) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  try {
    // Get access token from database
    const { data: connection } = await supabase
      .from('platform_connections')
      .select('access_token, id')
      .eq('shop', shop)
      .single()

    if (!connection?.access_token) {
      throw new Error('No access token found')
    }

    // Fetch orders from Shopify
    const ordersResponse = await fetch(
      `https://${shop}/admin/api/2024-01/orders.json?status=any&created_at_min=${from}&created_at_max=${to}&fields=id,created_at,total_price,line_items`, {
        headers: {
          'X-Shopify-Access-Token': connection.access_token
        }
      }
    )

    const ordersData = await ordersResponse.json()
    console.log('Shopify Orders Response:', ordersData)
    const { orders = [] } = ordersData

    if (!orders.length) {
      console.log('No orders found for date range:', { from, to })
    }

    // Calculate basic metrics from orders
    const totalSales = orders.reduce((sum: number, order: any) => sum + parseFloat(order.total_price), 0)
    const orderCount = orders.length
    const averageOrderValue = orderCount > 0 ? totalSales / orderCount : 0
    const unitsSold = orders.reduce((sum: number, order: any) => 
      sum + order.line_items.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0), 0
    )

    // Group orders by day for revenue chart
    const dailyRevenue = orders.reduce((acc: any, order: any) => {
      const date = order.created_at.split('T')[0]
      acc[date] = (acc[date] || 0) + parseFloat(order.total_price)
      return acc
    }, {})

    const revenueByDay = Object.entries(dailyRevenue).map(([date, revenue]) => ({
      day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      date,
      revenue
    }))

    // Get product data from database
    const { data: products, error: productsError } = await supabase
      .from('shopify_products')
      .select('*')
      .eq('connection_id', connection.id)

    if (productsError) {
      console.error('Error fetching products:', productsError)
    }

    // Calculate inventory levels
    let inventoryLevels = 0
    let topProducts: any[] = []

    if (products && products.length > 0) {
      // Calculate total inventory across all variants
      inventoryLevels = products.reduce((sum: number, product: any) => {
        if (!product.variants) return sum
        return sum + product.variants.reduce((variantSum: number, variant: any) => {
          return variantSum + (variant.inventory_quantity || 0)
        }, 0)
      }, 0)

      // Get top products by sales
      const productSales: Record<string, { title: string, quantity: number, revenue: number }> = {}
      
      // Aggregate sales data by product
      orders.forEach((order: any) => {
        order.line_items.forEach((item: any) => {
          const productId = item.product_id?.toString()
          if (!productId) return
          
          if (!productSales[productId]) {
            productSales[productId] = {
              title: item.title,
              quantity: 0,
              revenue: 0
            }
          }
          
          productSales[productId].quantity += item.quantity
          productSales[productId].revenue += parseFloat(item.price) * item.quantity
        })
      })
      
      // Convert to array and sort by revenue
      topProducts = Object.entries(productSales)
        .map(([id, data]) => ({
          id,
          title: data.title,
          quantity: data.quantity,
          revenue: data.revenue
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10) // Get top 10 products
    }

    // Calculate daily data for charts
    const dailyData = Object.entries(dailyRevenue).map(([date, revenue]) => {
      // Count orders for this day
      const dayOrders = orders.filter((order: any) => order.created_at.split('T')[0] === date).length
      
      // Count units sold for this day
      const dayUnits = orders
        .filter((order: any) => order.created_at.split('T')[0] === date)
        .reduce((sum: number, order: any) => 
          sum + order.line_items.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0), 0
        )
      
      return {
        date,
        revenue: Number(revenue),
        orders: dayOrders,
        units: dayUnits
      }
    })

    // Prepare the response with all metrics
    const metricsResponse = {
      totalSales,
      ordersPlaced: orderCount,
      averageOrderValue,
      unitsSold,
      inventoryLevels,
      revenueByDay,
      topProducts,
      dailyData,
      salesGrowth: 0, // Add growth calculations later
      ordersGrowth: 0,
      aovGrowth: 0,
      unitsGrowth: 0,
      inventoryGrowth: 0,
      customerSegments: {
        newCustomers: 0,
        returningCustomers: 0
      }
    }

    console.log('Metrics calculated:', {
      totalSales,
      orderCount,
      averageOrderValue,
      unitsSold,
      inventoryLevels,
      revenueByDay: revenueByDay.length,
      topProducts: topProducts.length,
      dailyData: dailyData.length
    })

    return NextResponse.json(metricsResponse)

  } catch (error) {
    console.error('Error fetching Shopify metrics:', error)
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
  }
} 
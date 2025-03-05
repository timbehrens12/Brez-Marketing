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
      .select('access_token')
      .eq('shop', shop)
      .single()

    if (!connection?.access_token) {
      throw new Error('No access token found')
    }

    // Fetch orders from Shopify
    const ordersResponse = await fetch(
      `https://${shop}/admin/api/2024-01/orders.json?status=any&created_at_min=${from}&created_at_max=${to}&fields=id,created_at,total_price,line_items,customer,financial_status,fulfillment_status,discount_codes`, {
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

    // Fetch customers from Shopify
    const customersResponse = await fetch(
      `https://${shop}/admin/api/2024-01/customers.json?created_at_min=${from}&created_at_max=${to}&fields=id,email,orders_count,total_spent,addresses,default_address,state,tags`, {
        headers: {
          'X-Shopify-Access-Token': connection.access_token
        }
      }
    )

    const customersData = await customersResponse.json()
    console.log('Shopify Customers Response:', customersData)
    const { customers = [] } = customersData

    // Fetch products from Shopify
    const productsResponse = await fetch(
      `https://${shop}/admin/api/2024-01/products.json?fields=id,title,vendor,product_type,created_at,updated_at,variants,images`, {
        headers: {
          'X-Shopify-Access-Token': connection.access_token
        }
      }
    )

    const productsData = await productsResponse.json()
    console.log('Shopify Products Response:', productsData)
    const { products = [] } = productsData

    // Calculate metrics
    const totalSales = orders.reduce((sum: number, order: any) => sum + parseFloat(order.total_price), 0)
    const orderCount = orders.length
    const averageOrderValue = orderCount > 0 ? totalSales / orderCount : 0
    const unitsSold = orders.reduce((sum: number, order: any) => 
      sum + order.line_items.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0), 0
    )

    // Calculate customer metrics
    const newCustomers = customers.filter((customer: any) => customer.orders_count === 1).length
    const returningCustomers = customers.filter((customer: any) => customer.orders_count > 1).length
    const totalCustomers = customers.length

    // Calculate average customer lifetime value
    const totalCustomerSpend = customers.reduce((sum: number, customer: any) => 
      sum + parseFloat(customer.total_spent || 0), 0)
    const averageCustomerLTV = totalCustomers > 0 ? totalCustomerSpend / totalCustomers : 0

    // Calculate inventory metrics
    const totalInventory = products.reduce((sum: number, product: any) => {
      return sum + product.variants.reduce((variantSum: number, variant: any) => {
        return variantSum + (variant.inventory_quantity || 0)
      }, 0)
    }, 0)

    // Calculate fulfillment metrics
    const fulfilledOrders = orders.filter((order: any) => order.fulfillment_status === 'fulfilled').length
    const fulfillmentRate = orderCount > 0 ? (fulfilledOrders / orderCount) * 100 : 0

    // Calculate payment metrics
    const paidOrders = orders.filter((order: any) => order.financial_status === 'paid').length
    const paymentSuccessRate = orderCount > 0 ? (paidOrders / orderCount) * 100 : 0

    // Calculate discount usage
    const ordersWithDiscount = orders.filter((order: any) => 
      order.discount_codes && order.discount_codes.length > 0).length
    const discountUsageRate = orderCount > 0 ? (ordersWithDiscount / orderCount) * 100 : 0

    // Group orders by day for revenue chart
    const dailyRevenue = orders.reduce((acc: any, order: any) => {
      const date = order.created_at.split('T')[0]
      acc[date] = (acc[date] || 0) + parseFloat(order.total_price)
      return acc
    }, {})

    // Group orders by day for daily data
    const dailyOrders = orders.reduce((acc: any, order: any) => {
      const date = order.created_at.split('T')[0]
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {})

    // Group units sold by day
    const dailyUnits = orders.reduce((acc: any, order: any) => {
      const date = order.created_at.split('T')[0]
      const units = order.line_items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)
      acc[date] = (acc[date] || 0) + units
      return acc
    }, {})

    // Create daily data array with orders and revenue
    const dailyData = Object.keys(dailyRevenue).map(date => ({
      date,
      revenue: dailyRevenue[date],
      orders: dailyOrders[date] || 0,
      units: dailyUnits[date] || 0,
      value: dailyRevenue[date] // For MetricCard compatibility
    }))

    const revenueByDay = Object.entries(dailyRevenue).map(([date, revenue]) => ({
      day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      date,
      revenue
    }))

    // Calculate top products
    const productSales: Record<string, { id: string, title: string, quantity: number, revenue: number }> = {}
    
    orders.forEach((order: any) => {
      order.line_items.forEach((item: any) => {
        const productId = item.product_id?.toString() || item.id?.toString() || 'unknown'
        
        if (!productSales[productId]) {
          productSales[productId] = {
            id: productId,
            title: item.title || item.name || 'Unknown Product',
            quantity: 0,
            revenue: 0
          }
        }
        
        productSales[productId].quantity += item.quantity || 0
        productSales[productId].revenue += (parseFloat(item.price) * (item.quantity || 1))
      })
    })
    
    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    // Calculate product categories
    const productCategories = products.reduce((acc: Record<string, number>, product: any) => {
      const category = product.product_type || 'Uncategorized'
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {})

    const productCategoriesArray = Object.entries(productCategories)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    console.log('Metrics calculated:', {
      totalSales,
      orderCount,
      averageOrderValue,
      unitsSold,
      newCustomers,
      returningCustomers,
      averageCustomerLTV,
      totalInventory,
      fulfillmentRate,
      paymentSuccessRate,
      discountUsageRate,
      revenueByDay,
      topProducts,
      productCategoriesArray
    })

    return NextResponse.json({
      totalSales,
      ordersPlaced: orderCount,
      averageOrderValue,
      unitsSold,
      revenueByDay,
      salesGrowth: 0, // Add growth calculations later
      ordersGrowth: 0,
      aovGrowth: 0,
      unitsGrowth: 0,
      customerSegments: {
        newCustomers,
        returningCustomers
      },
      customerLifetimeValue: averageCustomerLTV,
      totalInventory,
      fulfillmentRate,
      paymentSuccessRate,
      discountUsageRate,
      topProducts,
      productCategories: productCategoriesArray,
      dailyData
    })

  } catch (error) {
    console.error('Error fetching Shopify metrics:', error)
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
  }
} 
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const connectionId = searchParams.get('connectionId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!connectionId || !from || !to) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    const supabase = createClient()

    // Verify user has access to this connection's brand
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('brand_id')
      .eq('id', connectionId)
      .single()

    if (connectionError || !connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }

    // Check if user owns the brand or has shared access
    const { data: brand } = await supabase
      .from('brands')
      .select('user_id')
      .eq('id', connection.brand_id)
      .single()

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    const isOwner = brand.user_id === userId
    let hasAccess = isOwner

    if (!isOwner) {
      const { data: accessCheck } = await supabase
        .from('brand_access')
        .select('role')
        .eq('brand_id', connection.brand_id)
        .eq('user_id', userId)
        .is('revoked_at', null)
        .single()

      hasAccess = !!accessCheck
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Fetch products and orders data
    const [productsResult, ordersResult] = await Promise.all([
      supabase
        .from('shopify_products_enhanced')
        .select('*')
        .eq('connection_id', connectionId),
      supabase
        .from('shopify_orders')
        .select('*')
        .eq('connection_id', connectionId)
        .gte('created_at', from)
        .lte('created_at', to)
    ])

    if (productsResult.error) {
      console.error('Error fetching products:', productsResult.error)
      return NextResponse.json({ error: 'Failed to fetch product data' }, { status: 500 })
    }

    if (ordersResult.error) {
      console.error('Error fetching orders:', ordersResult.error)
      return NextResponse.json({ error: 'Failed to fetch orders data' }, { status: 500 })
    }

    const products = productsResult.data || []
    const orders = ordersResult.data || []

    // Calculate product performance from orders
    const productPerformance = new Map()
    
    orders.forEach(order => {
      if (order.line_items && Array.isArray(order.line_items)) {
        order.line_items.forEach((item: any) => {
          const productId = item.product_id?.toString()
          const title = item.title || 'Unknown Product'
          const quantity = parseInt(item.quantity) || 0
          const price = parseFloat(item.price) || 0
          const revenue = price * quantity

          if (productId) {
            if (!productPerformance.has(productId)) {
              productPerformance.set(productId, {
                id: productId,
                title,
                revenue: 0,
                unitsSold: 0,
                ordersCount: 0,
                conversionRate: 0
              })
            }

            const perf = productPerformance.get(productId)
            perf.revenue += revenue
            perf.unitsSold += quantity
            perf.ordersCount += 1
          }
        })
      }
    })

    // Enhance with product catalog data
    const enhancedPerformance = Array.from(productPerformance.values()).map(perf => {
      const product = products.find(p => p.id === perf.id)
      const variants = product?.variants ? (Array.isArray(product.variants) ? product.variants.length : 0) : 1
      const totalInventory = product?.total_inventory || 0
      
      // Calculate basic conversion rate (simplified)
      const conversionRate = Math.min(95, Math.max(1, (perf.unitsSold / Math.max(perf.ordersCount * 2, 10)) * 100))
      
      return {
        ...perf,
        variants,
        totalInventory,
        conversionRate,
        profitMargin: Math.random() * 40 + 10, // Placeholder - would need cost data
        trend: perf.revenue > 1000 ? 'up' : perf.revenue > 100 ? 'stable' : 'down'
      }
    })

    // Sort and categorize
    const sortedByRevenue = enhancedPerformance.sort((a, b) => b.revenue - a.revenue)
    const topPerformers = sortedByRevenue.slice(0, 10)
    const underPerformers = sortedByRevenue
      .filter(p => p.conversionRate < 5 || p.revenue < 50)
      .slice(0, 10)
      .map(p => ({
        ...p,
        stockLevel: p.totalInventory
      }))

    // Category performance
    const categoryMap = new Map()
    products.forEach(product => {
      const category = product.product_type || 'Uncategorized'
      const perf = productPerformance.get(product.id)
      
      if (!categoryMap.has(category)) {
        categoryMap.set(category, {
          category,
          revenue: 0,
          products: 0,
          totalPrice: 0
        })
      }
      
      const catData = categoryMap.get(category)
      catData.products += 1
      catData.totalPrice += product.min_price || 0
      
      if (perf) {
        catData.revenue += perf.revenue
      }
    })

    const categoryPerformance = Array.from(categoryMap.values()).map(cat => ({
      ...cat,
      avgPrice: cat.products > 0 ? cat.totalPrice / cat.products : 0
    }))

    // Inventory alerts
    const inventoryAlerts = products
      .filter(p => {
        const stock = p.total_inventory || 0
        return stock <= 10 // Low stock threshold
      })
      .map(p => ({
        productTitle: p.title,
        currentStock: p.total_inventory || 0,
        status: (p.total_inventory || 0) === 0 ? 'out' : 'low'
      }))
      .slice(0, 20)

    return NextResponse.json({
      totalProducts: products.length,
      activeProducts: products.filter(p => p.status === 'active').length,
      topPerformers,
      underPerformers,
      categoryPerformance,
      inventoryAlerts
    })

  } catch (error) {
    console.error('Product performance API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

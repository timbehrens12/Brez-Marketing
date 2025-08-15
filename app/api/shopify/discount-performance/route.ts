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

    // Fetch discounts and orders data
    const [discountsResult, ordersResult] = await Promise.all([
      supabase
        .from('shopify_discounts_enhanced')
        .select('*')
        .eq('connection_id', connectionId),
      supabase
        .from('shopify_orders')
        .select('*')
        .eq('connection_id', connectionId)
        .gte('created_at', from)
        .lte('created_at', to)
    ])

    if (discountsResult.error) {
      console.error('Error fetching discounts:', discountsResult.error)
      return NextResponse.json({ error: 'Failed to fetch discount data' }, { status: 500 })
    }

    if (ordersResult.error) {
      console.error('Error fetching orders:', ordersResult.error)
      return NextResponse.json({ error: 'Failed to fetch orders data' }, { status: 500 })
    }

    const discounts = discountsResult.data || []
    const orders = ordersResult.data || []

    // Calculate basic metrics
    const totalDiscounts = discounts.length
    const activeDiscounts = discounts.filter(d => {
      const now = new Date()
      const startDate = d.starts_at ? new Date(d.starts_at) : null
      const endDate = d.ends_at ? new Date(d.ends_at) : null
      return (!startDate || startDate <= now) && (!endDate || endDate >= now)
    }).length

    const totalUsage = discounts.reduce((sum, d) => sum + (d.usage_count || 0), 0)
    const totalDiscountAmount = orders.reduce((sum, order) => sum + parseFloat(order.total_discounts || '0'), 0)
    
    // Calculate average discount rate
    const ordersWithDiscounts = orders.filter(o => parseFloat(o.total_discounts || '0') > 0)
    const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total_price || '0'), 0)
    const avgDiscountRate = totalRevenue > 0 ? (totalDiscountAmount / totalRevenue) * 100 : 0

    // Analyze discount performance
    const discountPerformance = new Map()
    
    // Map discount codes from orders
    orders.forEach(order => {
      if (order.discount_codes && Array.isArray(order.discount_codes)) {
        order.discount_codes.forEach((discountCode: any) => {
          const code = discountCode.code
          const amount = parseFloat(discountCode.amount || '0')
          const orderValue = parseFloat(order.total_price || '0')
          
          if (!discountPerformance.has(code)) {
            discountPerformance.set(code, {
              code,
              usageCount: 0,
              revenue: 0,
              discountAmount: 0
            })
          }
          
          const perf = discountPerformance.get(code)
          perf.usageCount += 1
          perf.revenue += orderValue
          perf.discountAmount += amount
        })
      }
    })

    // Enhance with discount metadata
    const enhancedDiscounts = discounts.map(discount => {
      const perf = discountPerformance.get(discount.code) || { usageCount: 0, revenue: 0, discountAmount: 0 }
      const usageRate = discount.usage_limit ? (discount.usage_count / discount.usage_limit) * 100 : 0
      
      const now = new Date()
      const startDate = discount.starts_at ? new Date(discount.starts_at) : null
      const endDate = discount.ends_at ? new Date(discount.ends_at) : null
      
      let status = 'active'
      if (endDate && endDate < now) status = 'expired'
      else if (startDate && startDate > now) status = 'scheduled'
      
      return {
        code: discount.code,
        type: discount.type,
        amount: discount.amount || 0,
        usageCount: discount.usage_count || 0,
        usageRate,
        revenue: perf.revenue,
        status
      }
    })

    // Sort by performance
    const bestPerformers = enhancedDiscounts
      .filter(d => d.usageCount > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    const underPerformers = discounts
      .filter(d => {
        const usageRate = d.usage_limit ? (d.usage_count / d.usage_limit) * 100 : 0
        return usageRate < 20 && d.usage_count < 5
      })
      .map(d => {
        const createdDate = new Date(d.created_at)
        const daysSince = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
        
        return {
          code: d.code,
          type: d.type,
          amount: d.amount || 0,
          usageCount: d.usage_count || 0,
          usageLimit: d.usage_limit || 0,
          daysActive: daysSince
        }
      })
      .slice(0, 10)

    // Discount types analysis
    const typeMap = new Map()
    discounts.forEach(discount => {
      const type = discount.type || 'Unknown'
      if (!typeMap.has(type)) {
        typeMap.set(type, {
          type,
          count: 0,
          totalUsage: 0,
          avgPerformance: 0
        })
      }
      
      const typeData = typeMap.get(type)
      typeData.count += 1
      typeData.totalUsage += discount.usage_count || 0
    })

    const discountTypes = Array.from(typeMap.values()).map(type => ({
      ...type,
      avgPerformance: type.count > 0 ? type.totalUsage / type.count : 0
    }))

    // Revenue impact analysis
    const revenueWithDiscount = totalRevenue
    const revenueWithoutDiscount = totalRevenue + totalDiscountAmount
    const percentageIncrease = revenueWithoutDiscount > 0 ? 
      ((revenueWithDiscount - (revenueWithoutDiscount - totalDiscountAmount)) / (revenueWithoutDiscount - totalDiscountAmount)) * 100 : 0

    return NextResponse.json({
      totalDiscounts,
      activeDiscounts,
      totalUsage,
      totalDiscountAmount,
      avgDiscountRate,
      bestPerformers,
      underPerformers,
      discountTypes,
      revenueImpact: {
        withDiscount: revenueWithDiscount,
        withoutDiscount: revenueWithoutDiscount - totalDiscountAmount,
        percentageIncrease: Math.max(0, percentageIncrease)
      }
    })

  } catch (error) {
    console.error('Discount performance API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

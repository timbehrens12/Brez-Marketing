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
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    const supabase = createClient()

    // Get sales breakdown data
    const { data: salesData, error: salesError } = await supabase
      .from('shopify_sales_breakdown')
      .select('*')
      .eq('brand_id', brandId)
      .eq('user_id', userId)
      .gte('date_period', startDate || '2024-01-01')
      .lte('date_period', endDate || new Date().toISOString().split('T')[0])
      .order('date_period', { ascending: false })

    if (salesError) {
      console.error('Error fetching sales breakdown:', salesError)
      return NextResponse.json({ error: 'Failed to fetch sales data' }, { status: 500 })
    }

    // Calculate totals and aggregates
    const totals = salesData.reduce((acc, record) => ({
      grossSales: acc.grossSales + (parseFloat(record.gross_sales) || 0),
      totalDiscounts: acc.totalDiscounts + (parseFloat(record.total_discounts) || 0),
      totalTax: acc.totalTax + (parseFloat(record.total_tax) || 0),
      totalShipping: acc.totalShipping + (parseFloat(record.total_shipping) || 0),
      netSales: acc.netSales + (parseFloat(record.net_sales) || 0),
      totalOrders: acc.totalOrders + (record.total_orders || 0),
      unitsSold: acc.unitsSold + (record.units_sold || 0),
      totalRefunds: acc.totalRefunds + (parseFloat(record.total_refunds) || 0),
      processingFees: acc.processingFees + (parseFloat(record.processing_fees) || 0)
    }), {
      grossSales: 0,
      totalDiscounts: 0,
      totalTax: 0,
      totalShipping: 0,
      netSales: 0,
      totalOrders: 0,
      unitsSold: 0,
      totalRefunds: 0,
      processingFees: 0
    })

    // Calculate metrics
    const averageOrderValue = totals.totalOrders > 0 ? totals.grossSales / totals.totalOrders : 0
    const discountRate = totals.grossSales > 0 ? (totals.totalDiscounts / totals.grossSales) * 100 : 0
    const taxRate = totals.grossSales > 0 ? (totals.totalTax / totals.grossSales) * 100 : 0
    const refundRate = totals.grossSales > 0 ? (totals.totalRefunds / totals.grossSales) * 100 : 0

    return NextResponse.json({
      success: true,
      data: {
        breakdown: salesData,
        totals,
        metrics: {
          averageOrderValue,
          discountRate,
          taxRate,
          refundRate
        }
      }
    })

  } catch (error) {
    console.error('Sales breakdown API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { brandId, forceSync } = await request.json()
    
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    const supabase = createClient()

    // Get Shopify connections for this brand
    const { data: connections, error: connectionsError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform', 'shopify')
      .eq('is_active', true)

    if (connectionsError || !connections?.length) {
      return NextResponse.json({ error: 'No active Shopify connections found' }, { status: 404 })
    }

    const connectionIds = connections.map(c => c.id)

    // Get date range for sync (last 30 days)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)

    // Fetch Shopify orders for analysis
    const { data: orders, error: ordersError } = await supabase
      .from('shopify_orders')
      .select(`
        id, order_number, created_at, total_price, subtotal_price,
        total_discounts, total_tax, total_shipping_price_set,
        financial_status, fulfillment_status, cancelled_at,
        line_items, discount_codes, refunds, shipping_lines
      `)
      .in('connection_id', connectionIds)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false })

    if (ordersError) {
      console.error('Error fetching orders:', ordersError)
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
    }

    // Process orders by date
    const dailyBreakdown = new Map()

    orders?.forEach(order => {
      const orderDate = new Date(order.created_at).toISOString().split('T')[0]
      
      if (!dailyBreakdown.has(orderDate)) {
        dailyBreakdown.set(orderDate, {
          grossSales: 0,
          totalOrders: 0,
          unitsSold: 0,
          totalDiscounts: 0,
          totalTax: 0,
          totalShipping: 0,
          totalRefunds: 0,
          processingFees: 0,
          discountCodesUsed: 0,
          automaticDiscounts: 0,
          manualDiscounts: 0
        })
      }

      const dayData = dailyBreakdown.get(orderDate)
      
      // Basic metrics
      dayData.grossSales += parseFloat(order.total_price) || 0
      dayData.totalOrders += 1
      dayData.totalDiscounts += parseFloat(order.total_discounts) || 0
      dayData.totalTax += parseFloat(order.total_tax) || 0
      
      // Shipping calculation
      const shippingData = order.total_shipping_price_set?.shop_money?.amount || 
                          order.shipping_lines?.[0]?.price || 0
      dayData.totalShipping += parseFloat(shippingData) || 0

      // Units sold from line items
      if (order.line_items && Array.isArray(order.line_items)) {
        dayData.unitsSold += order.line_items.reduce((sum, item) => sum + (item.quantity || 0), 0)
      }

      // Refunds calculation
      if (order.refunds && Array.isArray(order.refunds)) {
        dayData.totalRefunds += order.refunds.reduce((sum, refund) => {
          return sum + (parseFloat(refund.amount) || 0)
        }, 0)
      }

      // Discount analysis
      if (order.discount_codes && Array.isArray(order.discount_codes)) {
        dayData.discountCodesUsed += order.discount_codes.length
        dayData.manualDiscounts += order.discount_codes.reduce((sum, code) => {
          return sum + (parseFloat(code.amount) || 0)
        }, 0)
      }

      // Estimate processing fees (typically 2.9% + $0.30 for Shopify Payments)
      const orderTotal = parseFloat(order.total_price) || 0
      dayData.processingFees += (orderTotal * 0.029) + 0.30
    })

    // Insert/update breakdown data
    const breakdownRecords = []
    for (const [date, data] of dailyBreakdown) {
      const netSales = data.grossSales - data.totalDiscounts - data.totalRefunds
      
      breakdownRecords.push({
        connection_id: connectionIds[0], // Use first connection
        brand_id: brandId,
        user_id: userId,
        date_period: date,
        period_type: 'daily',
        gross_sales: data.grossSales,
        total_orders: data.totalOrders,
        units_sold: data.unitsSold,
        total_discounts: data.totalDiscounts,
        discount_codes_used: data.discountCodesUsed,
        automatic_discounts: data.automaticDiscounts,
        manual_discounts: data.manualDiscounts,
        total_tax: data.totalTax,
        tax_rate_avg: data.grossSales > 0 ? (data.totalTax / data.grossSales) * 100 : 0,
        total_shipping: data.totalShipping,
        shipping_discounts: 0, // Calculate if needed
        processing_fees: data.processingFees,
        total_refunds: data.totalRefunds,
        net_sales: netSales,
        profit_margin: 0, // Would need cost data
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    }

    // Delete existing data for this date range if force sync
    if (forceSync && breakdownRecords.length > 0) {
      const dates = breakdownRecords.map(r => r.date_period)
      await supabase
        .from('shopify_sales_breakdown')
        .delete()
        .eq('brand_id', brandId)
        .eq('user_id', userId)
        .in('date_period', dates)
    }

    // Insert new data
    if (breakdownRecords.length > 0) {
      const { error: insertError } = await supabase
        .from('shopify_sales_breakdown')
        .upsert(breakdownRecords, {
          onConflict: 'brand_id,user_id,date_period',
          ignoreDuplicates: false
        })

      if (insertError) {
        console.error('Error inserting breakdown data:', insertError)
        return NextResponse.json({ error: 'Failed to save breakdown data' }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${breakdownRecords.length} days of sales breakdown data`,
      recordsProcessed: breakdownRecords.length
    })

  } catch (error) {
    console.error('Sales breakdown sync error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

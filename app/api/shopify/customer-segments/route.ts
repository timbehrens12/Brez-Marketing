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

    // Fetch customer data
    const { data: customers, error } = await supabase
      .from('shopify_customers')
      .select('*')
      .eq('connection_id', connectionId)
      .gte('created_at', from)
      .lte('created_at', to)
      .order('total_spent', { ascending: false })

    if (error) {
      console.error('Error fetching customers:', error)
      return NextResponse.json({ error: 'Failed to fetch customer data' }, { status: 500 })
    }

    if (!customers || customers.length === 0) {
      return NextResponse.json({
        totalCustomers: 0,
        newCustomers: 0,
        returningCustomers: 0,
        highValueCustomers: 0,
        vipCustomers: 0,
        retentionRate: 0,
        averageCustomerValue: 0,
        avgOrderFrequency: 0,
        segments: [],
        topCustomers: []
      })
    }

    // Calculate basic metrics
    const totalCustomers = customers.length
    const newCustomers = customers.filter(c => (c.orders_count || 0) === 1).length
    const returningCustomers = customers.filter(c => (c.orders_count || 0) > 1).length
    const retentionRate = totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0
    
    const totalSpent = customers.reduce((sum, c) => sum + parseFloat(c.total_spent || '0'), 0)
    const averageCustomerValue = totalCustomers > 0 ? totalSpent / totalCustomers : 0
    
    const highValueCustomers = customers.filter(c => parseFloat(c.total_spent || '0') > averageCustomerValue * 1.5).length
    const vipCustomers = customers.filter(c => parseFloat(c.total_spent || '0') > averageCustomerValue * 3).length

    // Calculate average order frequency
    const totalOrders = customers.reduce((sum, c) => sum + (c.orders_count || 0), 0)
    const avgOrderFrequency = totalCustomers > 0 ? totalOrders / totalCustomers : 0

    // Create customer segments
    const segments = [
      {
        name: 'New Customers',
        count: newCustomers,
        percentage: totalCustomers > 0 ? (newCustomers / totalCustomers) * 100 : 0,
        avgValue: newCustomers > 0 ? customers.filter(c => (c.orders_count || 0) === 1).reduce((sum, c) => sum + parseFloat(c.total_spent || '0'), 0) / newCustomers : 0,
        color: '#0088FE'
      },
      {
        name: 'Returning Customers',
        count: returningCustomers,
        percentage: totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0,
        avgValue: returningCustomers > 0 ? customers.filter(c => (c.orders_count || 0) > 1).reduce((sum, c) => sum + parseFloat(c.total_spent || '0'), 0) / returningCustomers : 0,
        color: '#00C49F'
      },
      {
        name: 'High Value',
        count: highValueCustomers,
        percentage: totalCustomers > 0 ? (highValueCustomers / totalCustomers) * 100 : 0,
        avgValue: highValueCustomers > 0 ? customers.filter(c => parseFloat(c.total_spent || '0') > averageCustomerValue * 1.5).reduce((sum, c) => sum + parseFloat(c.total_spent || '0'), 0) / highValueCustomers : 0,
        color: '#FFBB28'
      },
      {
        name: 'VIP Customers',
        count: vipCustomers,
        percentage: totalCustomers > 0 ? (vipCustomers / totalCustomers) * 100 : 0,
        avgValue: vipCustomers > 0 ? customers.filter(c => parseFloat(c.total_spent || '0') > averageCustomerValue * 3).reduce((sum, c) => sum + parseFloat(c.total_spent || '0'), 0) / vipCustomers : 0,
        color: '#FF8042'
      }
    ].filter(segment => segment.count > 0)

    // Get top customers
    const topCustomers = customers
      .slice(0, 10)
      .map(customer => ({
        email: customer.email || 'No email',
        totalSpent: parseFloat(customer.total_spent || '0'),
        ordersCount: customer.orders_count || 0,
        lastOrderDate: customer.last_order_date || customer.updated_at || customer.created_at
      }))

    return NextResponse.json({
      totalCustomers,
      newCustomers,
      returningCustomers,
      highValueCustomers,
      vipCustomers,
      retentionRate,
      averageCustomerValue,
      avgOrderFrequency,
      segments,
      topCustomers
    })

  } catch (error) {
    console.error('Customer segments API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

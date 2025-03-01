import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { parseISO, endOfDay, format, isValid } from 'date-fns'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const brandId = searchParams.get('brandId')
  const platform = searchParams.get('platform')

  console.log('Received metrics request:', { from, to, brandId, platform })

  if (!from || !to || !brandId) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
  }

  try {
    // Parse and validate date parameters
    let fromDate, toDate, adjustedToDate;
    
    try {
      fromDate = parseISO(from);
      toDate = parseISO(to);
      
      if (!isValid(fromDate) || !isValid(toDate)) {
        throw new Error('Invalid date format');
      }
      
      // Adjust the end date to include the full day (up to 23:59:59)
      adjustedToDate = endOfDay(toDate);
      
      console.log('Date range parsed successfully:');
      console.log(`From: ${format(fromDate, 'yyyy-MM-dd HH:mm:ss')}`);
      console.log(`To (original): ${format(toDate, 'yyyy-MM-dd HH:mm:ss')}`);
      console.log(`To (adjusted): ${format(adjustedToDate, 'yyyy-MM-dd HH:mm:ss')}`);
    } catch (error) {
      console.error('Error parsing date parameters:', error);
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }
    
    // Get active platform connection
    const { data: connection } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('platform_type', platform || 'shopify')
      .eq('brand_id', brandId)
      .eq('status', 'active')
      .single()

    if (!connection) {
      console.log('No active connection found')
      return NextResponse.json({
        totalSales: 0,
        ordersPlaced: 0,
        averageOrderValue: 0,
        unitsSold: 0,
        revenueByDay: [],
        salesGrowth: 0,
        ordersGrowth: 0,
        unitsGrowth: 0,
        aovGrowth: 0,
        customerSegments: [
          { name: 'new', value: 0 },
          { name: 'returning', value: 0 }
        ]
      })
    }

    console.log('Found connection:', connection)

    // Format dates for database query
    const formattedFromDate = format(fromDate, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
    const formattedToDate = format(adjustedToDate, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
    
    console.log('Querying orders with date range:');
    console.log(`From: ${formattedFromDate}`);
    console.log(`To: ${formattedToDate}`);

    // Fetch orders from Supabase
    const { data: orders, error: ordersError } = await supabase
      .from('shopify_orders')
      .select('*')
      .eq('connection_id', connection.id)
      .gte('created_at', formattedFromDate)
      .lte('created_at', formattedToDate)

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      throw ordersError;
    }

    console.log(`Found ${orders?.length || 0} orders for date range`)
    
    // Log a sample of the orders for debugging
    if (orders && orders.length > 0) {
      console.log('Sample order data:', orders.slice(0, 2).map(order => ({
        id: order.id,
        created_at: order.created_at,
        total_price: order.total_price
      })));
    }

    // Calculate metrics from orders
    const metrics = {
      totalSales: orders?.reduce((sum, order) => sum + parseFloat(order.total_price), 0) || 0,
      ordersPlaced: orders?.length || 0,
      averageOrderValue: orders?.length ? 
        orders.reduce((sum, order) => sum + parseFloat(order.total_price), 0) / orders.length : 0,
      unitsSold: orders?.reduce((sum, order) => 
        sum + order.line_items.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0), 0
      ) || 0,
      revenueByDay: Object.entries((orders || []).reduce((acc, order) => {
        const date = new Date(order.created_at).toISOString().split('T')[0]
        acc[date] = (acc[date] || 0) + parseFloat(order.total_price)
        return acc
      }, {})).map(([date, revenue]) => ({
        date,
        revenue,
        amount: revenue
      })).sort((a, b) => a.date.localeCompare(b.date)),
      customerSegments: [
        { 
          name: 'new', 
          value: new Set(orders?.map(o => o.customer_id) || []).size 
        },
        { 
          name: 'returning', 
          value: (orders?.length || 0) - new Set(orders?.map(o => o.customer_id) || []).size 
        }
      ]
    }

    console.log('Calculated metrics:', {
      totalSales: metrics.totalSales,
      ordersPlaced: metrics.ordersPlaced,
      averageOrderValue: metrics.averageOrderValue,
      unitsSold: metrics.unitsSold,
      revenueByDayCount: metrics.revenueByDay.length
    });

    return NextResponse.json(metrics)

  } catch (error) {
    console.error('Error fetching metrics:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 
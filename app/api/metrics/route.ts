import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { parseISO, endOfDay, format, isValid, subDays } from 'date-fns'

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

    // Fetch orders from Supabase for current period
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

    console.log(`Found ${orders?.length || 0} orders for current period`)
    
    // Calculate previous period date range
    const periodLengthInDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const previousFromDate = subDays(fromDate, periodLengthInDays);
    const previousToDate = subDays(toDate, periodLengthInDays);
    const formattedPreviousFromDate = format(previousFromDate, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
    const formattedPreviousToDate = format(endOfDay(previousToDate), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
    
    console.log('Querying orders for previous period:');
    console.log(`Previous From: ${formattedPreviousFromDate}`);
    console.log(`Previous To: ${formattedPreviousToDate}`);
    
    // Fetch orders from Supabase for previous period
    const { data: previousOrders, error: previousOrdersError } = await supabase
      .from('shopify_orders')
      .select('*')
      .eq('connection_id', connection.id)
      .gte('created_at', formattedPreviousFromDate)
      .lte('created_at', formattedPreviousToDate)
    
    if (previousOrdersError) {
      console.error('Error fetching previous period orders:', previousOrdersError);
      // Continue with current period data only
    }
    
    console.log(`Found ${previousOrders?.length || 0} orders for previous period`)

    // Calculate current period metrics
    const currentTotalSales = orders?.reduce((sum: number, order: any) => sum + parseFloat(order.total_price), 0) || 0;
    const currentOrdersPlaced = orders?.length || 0;
    const currentAverageOrderValue = currentOrdersPlaced ? currentTotalSales / currentOrdersPlaced : 0;
    const currentUnitsSold = orders?.reduce((sum: number, order: any) => 
      sum + order.line_items.reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0), 0
    ) || 0;
    
    // Calculate previous period metrics
    const previousTotalSales = previousOrders?.reduce((sum: number, order: any) => sum + parseFloat(order.total_price), 0) || 0;
    const previousOrdersPlaced = previousOrders?.length || 0;
    const previousAverageOrderValue = previousOrdersPlaced ? previousTotalSales / previousOrdersPlaced : 0;
    const previousUnitsSold = previousOrders?.reduce((sum: number, order: any) => 
      sum + order.line_items.reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0), 0
    ) || 0;
    
    // Calculate growth percentages
    const calculateGrowth = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };
    
    const salesGrowth = calculateGrowth(currentTotalSales, previousTotalSales);
    const ordersGrowth = calculateGrowth(currentOrdersPlaced, previousOrdersPlaced);
    const aovGrowth = calculateGrowth(currentAverageOrderValue, previousAverageOrderValue);
    const unitsGrowth = calculateGrowth(currentUnitsSold, previousUnitsSold);
    
    console.log('Growth calculations:', {
      salesGrowth,
      ordersGrowth,
      aovGrowth,
      unitsGrowth
    });

    // Calculate metrics from orders
    const metrics = {
      totalSales: currentTotalSales,
      ordersPlaced: currentOrdersPlaced,
      averageOrderValue: currentAverageOrderValue,
      unitsSold: currentUnitsSold,
      revenueByDay: Object.entries((orders || []).reduce((acc: Record<string, number>, order: any) => {
        const date = new Date(order.created_at).toISOString().split('T')[0]
        acc[date] = (acc[date] || 0) + parseFloat(order.total_price)
        return acc
      }, {})).map(([date, revenue]) => ({
        date,
        revenue,
        amount: revenue
      })).sort((a, b) => a.date.localeCompare(b.date)),
      salesGrowth,
      ordersGrowth,
      aovGrowth,
      unitsGrowth,
      customerSegments: {
        newCustomers: new Set(orders?.map((o: any) => o.customer_id) || []).size,
        returningCustomers: (orders?.length || 0) - new Set(orders?.map((o: any) => o.customer_id) || []).size
      },
      dailyData: Object.entries((orders || []).reduce((acc: Record<string, { date: string, revenue: number, orders: number }>, order: any) => {
        const date = new Date(order.created_at).toISOString().split('T')[0]
        if (!acc[date]) {
          acc[date] = { date, revenue: 0, orders: 0 }
        }
        acc[date].revenue += parseFloat(order.total_price)
        acc[date].orders += 1
        return acc
      }, {})).map(([date, data]) => ({
        date,
        revenue: (data as any).revenue,
        orders: (data as any).orders,
        value: (data as any).revenue
      })).sort((a, b) => a.date.localeCompare(b.date))
    }

    console.log('Calculated metrics:', {
      totalSales: metrics.totalSales,
      ordersPlaced: metrics.ordersPlaced,
      averageOrderValue: metrics.averageOrderValue,
      unitsSold: metrics.unitsSold,
      revenueByDayCount: metrics.revenueByDay.length,
      salesGrowth: metrics.salesGrowth,
      ordersGrowth: metrics.ordersGrowth,
      aovGrowth: metrics.aovGrowth,
      unitsGrowth: metrics.unitsGrowth
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
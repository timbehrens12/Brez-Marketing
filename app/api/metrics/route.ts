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

    // Calculate the previous period date range (same length as current period)
    const daysDiff = Math.ceil((adjustedToDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
    const prevFromDate = subDays(fromDate, daysDiff);
    const prevToDate = subDays(fromDate, 1);
    
    const formattedPrevFromDate = format(prevFromDate, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
    const formattedPrevToDate = format(prevToDate, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
    
    console.log('Previous period date range:');
    console.log(`From: ${formattedPrevFromDate}`);
    console.log(`To: ${formattedPrevToDate}`);

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

    // Fetch orders from Supabase for previous period
    const { data: prevOrders, error: prevOrdersError } = await supabase
      .from('shopify_orders')
      .select('*')
      .eq('connection_id', connection.id)
      .gte('created_at', formattedPrevFromDate)
      .lte('created_at', formattedPrevToDate)

    if (prevOrdersError) {
      console.error('Error fetching previous period orders:', prevOrdersError);
      // Continue with current period data even if previous period fetch fails
    }

    console.log(`Found ${orders?.length || 0} orders for current period`);
    console.log(`Found ${prevOrders?.length || 0} orders for previous period`);
    
    // Calculate current period metrics
    const currentTotalSales = orders?.reduce((sum: number, order: any) => sum + parseFloat(order.total_price), 0) || 0;
    const currentOrdersPlaced = orders?.length || 0;
    const currentAverageOrderValue = currentOrdersPlaced ? currentTotalSales / currentOrdersPlaced : 0;
    const currentUnitsSold = orders?.reduce((sum: number, order: any) => 
      sum + order.line_items.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0), 0
    ) || 0;

    // Calculate previous period metrics
    const prevTotalSales = prevOrders?.reduce((sum: number, order: any) => sum + parseFloat(order.total_price), 0) || 0;
    const prevOrdersPlaced = prevOrders?.length || 0;
    const prevAverageOrderValue = prevOrdersPlaced ? prevTotalSales / prevOrdersPlaced : 0;
    const prevUnitsSold = prevOrders?.reduce((sum: number, order: any) => 
      sum + order.line_items.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0), 0
    ) || 0;

    // Calculate growth percentages
    const calculateGrowth = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const salesGrowth = calculateGrowth(currentTotalSales, prevTotalSales);
    const ordersGrowth = calculateGrowth(currentOrdersPlaced, prevOrdersPlaced);
    const aovGrowth = calculateGrowth(currentAverageOrderValue, prevAverageOrderValue);
    const unitsGrowth = calculateGrowth(currentUnitsSold, prevUnitsSold);

    console.log('Growth calculations:');
    console.log(`Current total sales: ${currentTotalSales}, Previous: ${prevTotalSales}, Growth: ${salesGrowth}%`);
    console.log(`Current orders: ${currentOrdersPlaced}, Previous: ${prevOrdersPlaced}, Growth: ${ordersGrowth}%`);
    console.log(`Current AOV: ${currentAverageOrderValue}, Previous: ${prevAverageOrderValue}, Growth: ${aovGrowth}%`);
    console.log(`Current units: ${currentUnitsSold}, Previous: ${prevUnitsSold}, Growth: ${unitsGrowth}%`);

    // Calculate metrics from orders
    const metrics = {
      totalSales: currentTotalSales,
      ordersPlaced: currentOrdersPlaced,
      averageOrderValue: currentAverageOrderValue,
      unitsSold: currentUnitsSold,
      salesGrowth,
      ordersGrowth,
      aovGrowth,
      unitsGrowth,
      revenueByDay: Object.entries((orders || []).reduce((acc: Record<string, number>, order: any) => {
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
          value: new Set(orders?.map((o: any) => o.customer_id) || []).size 
        },
        { 
          name: 'returning', 
          value: (orders?.length || 0) - new Set(orders?.map((o: any) => o.customer_id) || []).size 
        }
      ],
      // Add detailed data for charts
      salesData: (orders || []).map((order: any) => {
        try {
          // Ensure we have a valid date string
          let dateStr = order.created_at;
          if (!dateStr) {
            console.error('Missing created_at date in order:', order.id);
            return null;
          }
          
          // Validate the date by attempting to parse it
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) {
            console.error('Invalid date in order:', order.id, dateStr);
            return null;
          }
          
          // Format date consistently - use ISO format with just the date part for daily views
          // and full ISO for hourly views
          return {
            date: format(date, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"),
            value: parseFloat(order.total_price || '0')
          };
        } catch (error) {
          console.error('Error processing sales data for order:', order.id, error);
          return null;
        }
      }).filter(Boolean),
      ordersData: (orders || []).map((order: any) => {
        try {
          // Ensure we have a valid date string
          let dateStr = order.created_at;
          if (!dateStr) {
            console.error('Missing created_at date in order:', order.id);
            return null;
          }
          
          // Validate the date by attempting to parse it
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) {
            console.error('Invalid date in order:', order.id, dateStr);
            return null;
          }
          
          // Format date consistently
          return {
            date: format(date, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"),
            value: 1 // Each order counts as 1
          };
        } catch (error) {
          console.error('Error processing orders data for order:', order.id, error);
          return null;
        }
      }).filter(Boolean),
      aovData: (orders || []).map((order: any) => {
        try {
          // Ensure we have a valid date string
          let dateStr = order.created_at;
          if (!dateStr) {
            console.error('Missing created_at date in order:', order.id);
            return null;
          }
          
          // Validate the date by attempting to parse it
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) {
            console.error('Invalid date in order:', order.id, dateStr);
            return null;
          }
          
          // Format date consistently
          return {
            date: format(date, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"),
            value: parseFloat(order.total_price || '0')
          };
        } catch (error) {
          console.error('Error processing AOV data for order:', order.id, error);
          return null;
        }
      }).filter(Boolean),
      unitsSoldData: (orders || []).map((order: any) => {
        try {
          // Ensure we have a valid date string
          let dateStr = order.created_at;
          if (!dateStr) {
            console.error('Missing created_at date in order:', order.id);
            return null;
          }
          
          // Validate the date by attempting to parse it
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) {
            console.error('Invalid date in order:', order.id, dateStr);
            return null;
          }
          
          // Format date consistently
          return {
            date: format(date, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"),
            value: order.line_items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)
          };
        } catch (error) {
          console.error('Error processing units sold data for order:', order.id, error);
          return null;
        }
      }).filter(Boolean)
    }

    console.log('Calculated metrics:', {
      totalSales: metrics.totalSales,
      ordersPlaced: metrics.ordersPlaced,
      averageOrderValue: metrics.averageOrderValue,
      unitsSold: metrics.unitsSold,
      salesGrowth: metrics.salesGrowth,
      ordersGrowth: metrics.ordersGrowth,
      aovGrowth: metrics.aovGrowth,
      unitsGrowth: metrics.unitsGrowth,
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
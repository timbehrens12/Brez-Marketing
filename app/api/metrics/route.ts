import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { parseISO, endOfDay, format, isValid, subDays, differenceInDays, startOfDay, isSameDay } from 'date-fns'

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
    let formattedFromDate = format(fromDate, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
    let formattedToDate = format(adjustedToDate, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
    
    console.log('Querying orders with date range:');
    console.log(`From: ${formattedFromDate}`);
    console.log(`To: ${formattedToDate}`);
    
    // Add more detailed date debugging for longer date ranges
    const rangeDays = differenceInDays(adjustedToDate, fromDate) + 1;
    if (rangeDays > 28) {
      console.log(`LONG DATE RANGE DETECTED: ${rangeDays} days`);
      console.log(`From date: ${format(fromDate, 'yyyy-MM-dd')} (${fromDate.toISOString()})`);
      console.log(`To date: ${format(adjustedToDate, 'yyyy-MM-dd')} (${adjustedToDate.toISOString()})`);
    }

    // Special debugging for March 1-April 2 date range that has a known discrepancy
    const fromMonthDay = format(fromDate, 'MM-dd');
    const toMonthDay = format(adjustedToDate, 'MM-dd');
    
    if (fromMonthDay === '03-01' && toMonthDay === '04-02') {
      console.log(`🔍 SPECIAL DEBUGGING: Detected March 1-April 2 date range with known discrepancy`);
      console.log(`Exact from: ${format(fromDate, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")}`);
      console.log(`Exact to: ${format(adjustedToDate, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")}`);
    }

    // Calculate the previous period date range (same length as current period)
    // Calculate the exact number of days in the selected period
    const selectedPeriodDays = differenceInDays(adjustedToDate, fromDate) + 1;
    console.log(`Selected period is ${selectedPeriodDays} days long`);
    
    // Check if we're looking at today for comparison period calculation (still relevant)
    const isTodayRequest = isSameDay(fromDate, new Date()) && isSameDay(adjustedToDate, new Date());
    
    let prevFromDate, prevToDate;
    
    // Simplified previous period calculation: always the period of same length before the current.
    prevToDate = startOfDay(fromDate); // Day before start of current period
    prevToDate.setDate(prevToDate.getDate() - 1); // End of previous period is the day before the start of current period
    prevToDate.setHours(23, 59, 59, 999); // Set to end of day
    
    prevFromDate = new Date(prevToDate);
    prevFromDate.setDate(prevFromDate.getDate() - selectedPeriodDays + 1); // Start of previous period
    prevFromDate.setHours(0, 0, 0, 0); // Set to start of day
      
    if (isTodayRequest) { // Log if comparing today to yesterday based on the actual request
      console.log('Calculating previous period for a "today" request (will be yesterday)');
    }
    
    const formattedPrevFromDate = format(prevFromDate, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
    const formattedPrevToDate = format(prevToDate, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
    
    console.log('Previous period date range:');
    console.log(`From: ${formattedPrevFromDate} (${format(prevFromDate, 'yyyy-MM-dd')})`);
    console.log(`To: ${formattedPrevToDate} (${format(prevToDate, 'yyyy-MM-dd')})`);
    console.log(`Previous period is also ${selectedPeriodDays} days long`);

    // Fetch orders from Supabase for current period
    console.log(`Executing Supabase query with date range:`)
    console.log(`Connection ID: ${connection.id}`)
    console.log(`From: ${formattedFromDate}`)
    console.log(`To: ${formattedToDate}`)

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

    console.log(`Query returned ${orders?.length || 0} orders for the selected period`);
    
    // Add detailed order debugging for troubleshooting
    if (orders && orders.length > 0) {
      // Get the date range of received orders
      const orderDates = orders.map((order: any) => new Date(order.created_at));
      const minOrderDate = new Date(Math.min(...orderDates.map((d: Date) => d.getTime())));
      const maxOrderDate = new Date(Math.max(...orderDates.map((d: Date) => d.getTime())));
      
      console.log(`Order date range in results: ${format(minOrderDate, 'yyyy-MM-dd')} to ${format(maxOrderDate, 'yyyy-MM-dd')}`);
      
      // Calculate total of orders for debugging the financial discrepancy
      const totalOrderValue = orders.reduce((sum: number, order: any) => {
        const price = parseFloat(order.total_price || '0');
        return sum + (isNaN(price) ? 0 : price);
      }, 0);
      
      console.log(`Total order value from database query: $${totalOrderValue.toFixed(2)}`);
      
      // Check if we have orders spanning month boundaries
      const uniqueMonths = new Set(orders.map((order: any) => {
        const date = new Date(order.created_at);
        return `${date.getFullYear()}-${date.getMonth() + 1}`;
      }));
      
      if (uniqueMonths.size > 1) {
        console.log(`NOTICE: Orders span across ${uniqueMonths.size} different months: ${Array.from(uniqueMonths).join(', ')}`);
        
        // Group order totals by month for debugging
        const ordersByMonth: Record<string, { count: number, total: number }> = {};
        orders.forEach((order: any) => {
          const date = new Date(order.created_at);
          const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
          
          if (!ordersByMonth[monthKey]) {
            ordersByMonth[monthKey] = { count: 0, total: 0 };
          }
          
          ordersByMonth[monthKey].count += 1;
          ordersByMonth[monthKey].total += parseFloat(order.total_price || '0');
        });
        
        console.log('Order breakdown by month:');
        Object.entries(ordersByMonth).forEach(([month, data]) => {
          console.log(`${month}: ${data.count} orders, $${data.total.toFixed(2)}`);
        });
      }
    }

    // The initial 'orders' variable should now contain the correct data based on the request's date range.
    // No further filtering or re-querying based on isYesterday or isLast30Days should be needed here.
    let filteredOrders = orders || [];
    
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
    
    // Calculate metrics from orders
    const currentTotalSales = filteredOrders.reduce((sum: number, order: any) => {
      // Add safety check for null/undefined
      const price = parseFloat(order.total_price || '0');
      if (isNaN(price)) {
        console.log(`Warning: Invalid price for order ${order.id}: ${order.total_price}`);
        return sum;
      }
      return sum + price;
    }, 0) || 0;

    console.log(`Calculated totalSales: ${currentTotalSales}`);

    const currentOrdersPlaced = filteredOrders.length || 0;
    console.log(`Calculated ordersPlaced: ${currentOrdersPlaced}`);

    const currentAverageOrderValue = currentOrdersPlaced ? currentTotalSales / currentOrdersPlaced : 0;
    console.log(`Calculated averageOrderValue: ${currentAverageOrderValue}`);

    const currentUnitsSold = filteredOrders.reduce((sum: number, order: any) => {
      if (!order.line_items || !Array.isArray(order.line_items)) {
        console.log(`Warning: Missing or invalid line_items for order ${order.id}`);
        return sum;
      }
      return sum + order.line_items.reduce((itemSum: number, item: any) => {
        const quantity = parseInt(item.quantity || '0', 10);
        if (isNaN(quantity)) {
          console.log(`Warning: Invalid quantity for item in order ${order.id}: ${item.quantity}`);
          return itemSum;
        }
        return itemSum + quantity;
      }, 0);
    }, 0) || 0;

    console.log(`Calculated unitsSold: ${currentUnitsSold}`);

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
      const growth = ((current - previous) / previous) * 100;
      // Ensure we never return exactly zero to maintain consistency with UI display
      return growth === 0 ? 0.01 : growth;
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
    const metrics: any = {
      totalSales: currentTotalSales,
      ordersPlaced: currentOrdersPlaced,
      averageOrderValue: currentAverageOrderValue,
      unitsSold: currentUnitsSold,
      salesGrowth,
      ordersGrowth,
      aovGrowth,
      unitsGrowth,
      revenueByDay: Object.entries((filteredOrders || []).reduce((acc: Record<string, number>, order: any) => { 
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
          value: new Set(filteredOrders?.map((o: any) => o.customer_id) || []).size
        },
        {
          name: 'returning',
          value: (filteredOrders?.length || 0) - new Set(filteredOrders?.map((o: any) => o.customer_id) || []).size
        }
      ],
      salesData: (filteredOrders || []).map((order: any) => {
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
      
      ordersData: (filteredOrders || []).map((order: any) => {
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
      
      aovData: (filteredOrders || []).map((order: any) => {
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
      
      unitsSoldData: (filteredOrders || []).map((order: any) => {
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

    // Add previous period date range to the response for UI display
    metrics.previousPeriod = {
      from: format(prevFromDate, 'MMM d, yyyy'),
      to: format(prevToDate, 'MMM d, yyyy'),
      totalSales: prevTotalSales
    };

    return NextResponse.json(metrics)

  } catch (error) {
    console.error('Error fetching metrics:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
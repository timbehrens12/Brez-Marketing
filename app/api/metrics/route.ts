import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { parseISO, endOfDay, format, isValid, subDays, differenceInDays, startOfDay, isSameDay } from 'date-fns'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const brandId = searchParams.get('brandId')
  const platform = searchParams.get('platform')
  const timezone = searchParams.get('timezone') || 'America/Chicago' // Default to Chicago

  // Received metrics request

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
      
      // Date range parsed successfully
      
    } catch (error) {
      // Error parsing date parameters
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
      // No active connection found
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

    // Found connection

    // Format dates for database query
    // Use PostgreSQL's timezone-aware queries to handle user's timezone properly
    const fromDateStr = format(fromDate, 'yyyy-MM-dd');
    const toDateStr = format(adjustedToDate, 'yyyy-MM-dd');
    
    // Query orders where the created_at converted to user's timezone falls within the date range
    let formattedFromDate = fromDateStr;
    let formattedToDate = toDateStr;
    
    // Timezone debugging
    console.log(`📅 Original request dates: from=${from}, to=${to}`);
    console.log(`🌍 User timezone: ${timezone}`);
    console.log(`🏠 Server timezone offset: ${new Date().getTimezoneOffset()} minutes`);
    console.log(`📍 Parsed fromDate (UTC): ${fromDate.toISOString()}`);
    console.log(`📍 Parsed toDate (UTC): ${adjustedToDate.toISOString()}`);
    console.log(`🔍 Will query orders where DATE(created_at AT TIME ZONE '${timezone}') = '${fromDateStr}' to '${toDateStr}'`);
    
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
    
    const formattedPrevFromDate = format(prevFromDate, 'yyyy-MM-dd');
    const formattedPrevToDate = format(prevToDate, 'yyyy-MM-dd');
    
    console.log('Previous period date range:');
    console.log(`From: ${formattedPrevFromDate} (${format(prevFromDate, 'yyyy-MM-dd')})`);
    console.log(`To: ${formattedPrevToDate} (${format(prevToDate, 'yyyy-MM-dd')})`);
    console.log(`Previous period is also ${selectedPeriodDays} days long`);

    // Fetch orders from Supabase for current period using timezone-aware queries
    console.log(`Executing Supabase query with timezone-aware date filtering:`)
    console.log(`Connection ID: ${connection.id}`)
    console.log(`Date range: ${formattedFromDate} to ${formattedToDate} in timezone ${timezone}`)

    // Use timezone-aware query to filter by dates in user's timezone
    let { data: orders, error: ordersError } = await supabase
      .from('shopify_orders')
      .select('*')
      .eq('connection_id', connection.id)

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      throw ordersError;
    }

    // Filter orders by timezone-aware dates on the server side
    orders = orders?.filter(order => {
      if (!order.created_at) return false;
      
      // Convert UTC timestamp to user's timezone and extract date
      const orderDate = new Date(order.created_at);
      const userTimezoneDate = orderDate.toLocaleDateString('en-CA', { 
        timeZone: timezone 
      }); // YYYY-MM-DD format
      
      return userTimezoneDate >= formattedFromDate && userTimezoneDate <= formattedToDate;
    }) || [];

    console.log(`🔍 Query returned ${orders?.length || 0} orders for the selected period`);
    
    // Add detailed order debugging for troubleshooting
    if (orders && orders.length > 0) {
      // Get the date range of received orders
      const orderDates = orders.map((order: any) => new Date(order.created_at));
      const minOrderDate = new Date(Math.min(...orderDates.map((d: Date) => d.getTime())));
      const maxOrderDate = new Date(Math.max(...orderDates.map((d: Date) => d.getTime())));
      
      console.log(`📊 Order date range in results: ${format(minOrderDate, 'yyyy-MM-dd HH:mm:ss')} to ${format(maxOrderDate, 'yyyy-MM-dd HH:mm:ss')}`);
      console.log(`📊 Min order UTC: ${minOrderDate.toISOString()}`);
      console.log(`📊 Max order UTC: ${maxOrderDate.toISOString()}`);
      
      // Show first few orders with their exact timestamps
      console.log(`📝 First 3 orders with timestamps:`);
      orders.slice(0, 3).forEach((order: any, i: number) => {
        const orderDate = new Date(order.created_at);
        console.log(`   ${i + 1}. Order #${order.order_number}: $${order.total_price} at ${order.created_at} (UTC: ${orderDate.toISOString()}, Local: ${orderDate.toString()})`);
      });
      
      // Calculate total of orders for debugging the financial discrepancy
      const totalOrderValue = orders.reduce((sum: number, order: any) => {
        const price = parseFloat(order.total_price || '0');
        return sum + (isNaN(price) ? 0 : price);
      }, 0);
      
      console.log(`💰 Total order value from database query: $${totalOrderValue.toFixed(2)}`);
      
      // Group orders by local date to see distribution
      const ordersByLocalDate: Record<string, { count: number, total: number, timestamps: string[] }> = {};
      orders.forEach((order: any) => {
        const utcDate = new Date(order.created_at);
        const userTimezoneDate = utcDate.toLocaleDateString('en-CA', { 
          timeZone: timezone 
        }); // YYYY-MM-DD format in user's timezone
        
        if (!ordersByLocalDate[userTimezoneDate]) {
          ordersByLocalDate[userTimezoneDate] = { count: 0, total: 0, timestamps: [] };
        }
        
        ordersByLocalDate[userTimezoneDate].count += 1;
        ordersByLocalDate[userTimezoneDate].total += parseFloat(order.total_price || '0');
        ordersByLocalDate[userTimezoneDate].timestamps.push(order.created_at);
      });
      
      console.log(`📅 Orders grouped by USER TIMEZONE (${timezone}) date:`);
      Object.entries(ordersByLocalDate).forEach(([date, data]) => {
        console.log(`   ${date}: ${data.count} orders, $${data.total.toFixed(2)}`);
        console.log(`   Timestamps: ${data.timestamps.slice(0, 3).join(', ')}`);
        // Show what each timestamp looks like in user's timezone
        data.timestamps.slice(0, 3).forEach(timestamp => {
          const utcDate = new Date(timestamp);
          const userDate = new Date(utcDate.toLocaleString('en-US', { timeZone: timezone }));
          console.log(`     UTC: ${timestamp} → ${timezone}: ${userDate.toString()}`);
        });
      });
    }

    // The initial 'orders' variable should now contain the correct data based on the request's date range.
    // No further filtering or re-querying based on isYesterday or isLast30Days should be needed here.
    let filteredOrders = orders || [];
    
    // Fetch orders from Supabase for previous period using timezone-aware filtering
    let { data: allPrevOrders, error: prevOrdersError } = await supabase
      .from('shopify_orders')
      .select('*')
      .eq('connection_id', connection.id)

    if (prevOrdersError) {
      console.error('Error fetching previous period orders:', prevOrdersError);
      // Continue with current period data even if previous period fetch fails
    }

    // Filter previous period orders by timezone-aware dates
    const prevOrders = allPrevOrders?.filter(order => {
      if (!order.created_at) return false;
      
      const orderDate = new Date(order.created_at);
      const userTimezoneDate = orderDate.toLocaleDateString('en-CA', { 
        timeZone: timezone 
      });
      
      return userTimezoneDate >= formattedPrevFromDate && userTimezoneDate <= formattedPrevToDate;
    }) || [];

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
        // Convert to user's timezone for chart grouping
        const orderDate = new Date(order.created_at);
        const userTimezoneDate = orderDate.toLocaleDateString('en-CA', { 
          timeZone: timezone 
        }); // YYYY-MM-DD format
        console.log(`📊 Chart grouping - Order ${order.order_number}: UTC ${order.created_at} → ${timezone} date ${userTimezoneDate} ($${order.total_price})`);
        acc[userTimezoneDate] = (acc[userTimezoneDate] || 0) + parseFloat(order.total_price)
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
          
          // SIMPLE FIX: Just use the original UTC timestamp for charts
          // The frontend will handle timezone display, we just need consistent data
          console.log(`📈 Sales data point - Order ${order.order_number}: Using UTC timestamp ${order.created_at} ($${order.total_price})`);
          return {
            date: order.created_at, // Use original UTC timestamp
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
          
          // SIMPLE FIX: Just use the original UTC timestamp for charts
          console.log(`📊 Orders data point - Order ${order.order_number}: Using UTC timestamp ${order.created_at}`);
          return {
            date: order.created_at, // Use original UTC timestamp
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
          
          // SIMPLE FIX: Just use the original UTC timestamp for charts
          console.log(`💵 AOV data point - Order ${order.order_number}: Using UTC timestamp ${order.created_at} ($${order.total_price})`);
          return {
            date: order.created_at, // Use original UTC timestamp
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
          
          // SIMPLE FIX: Just use the original UTC timestamp for charts
          console.log(`📦 Units data point - Order ${order.order_number}: Using UTC timestamp ${order.created_at} (${order.line_items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)} units)`);
          return {
            date: order.created_at, // Use original UTC timestamp
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

    console.log('📊 FINAL CHART DATA SUMMARY:');
    console.log(`📈 Revenue by day (${metrics.revenueByDay?.length || 0} days):`, metrics.revenueByDay?.map((d: any) => `${d.date}: $${d.revenue}`).join(', '));
    console.log(`📊 Sales data points: ${metrics.salesData?.length || 0}`);
    console.log(`📊 Orders data points: ${metrics.ordersData?.length || 0}`);
    console.log(`💵 AOV data points: ${metrics.aovData?.length || 0}`);
    // Units data points logged;

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
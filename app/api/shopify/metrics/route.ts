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
    // Get access token and connection ID from database
    const { data: connection } = await supabase
      .from('platform_connections')
      .select('access_token, id')
      .eq('shop', shop)
      .single()

    if (!connection?.access_token) {
      throw new Error('No access token found')
    }

    // Fetch orders directly from the database instead of the API
    // This ensures we have all historical orders
    const { data: dbOrders, error: dbOrdersError } = await supabase
      .from('shopify_orders')
      .select('*')
      .eq('connection_id', connection.id)
      .gte('created_at', from)
      .lte('created_at', to)

    if (dbOrdersError) {
      console.error('Error fetching orders from database:', dbOrdersError)
    }

    // If no orders in database, fetch from API as fallback
    let orders = dbOrders || [];
    
    if (!orders.length) {
      console.log('No orders found in database, fetching from API');
      const ordersResponse = await fetch(
        `https://${shop}/admin/api/2024-01/orders.json?status=any&created_at_min=${from}&created_at_max=${to}&fields=id,created_at,total_price,line_items`, {
          headers: {
            'X-Shopify-Access-Token': connection.access_token
          }
        }
      )

      const ordersData = await ordersResponse.json()
      console.log('Shopify Orders Response:', ordersData)
      orders = ordersData.orders || [];
    }

    if (!orders.length) {
      console.log('No orders found for date range:', { from, to })
    }

    // Calculate basic metrics from orders
    const totalSales = orders.reduce((sum: number, order: any) => {
      const price = typeof order.total_price === 'string' 
        ? parseFloat(order.total_price) 
        : order.total_price;
      return sum + (price || 0);
    }, 0);
    
    const orderCount = orders.length;
    const averageOrderValue = orderCount > 0 ? totalSales / orderCount : 0;
    
    // Calculate units sold from line items
    const unitsSold = orders.reduce((sum: number, order: any) => {
      if (!order.line_items) return sum;
      
      // Handle both API response format and database format
      const lineItems = Array.isArray(order.line_items) 
        ? order.line_items 
        : (typeof order.line_items === 'object' ? Object.values(order.line_items) : []);
      
      return sum + lineItems.reduce((itemSum: number, item: any) => {
        return itemSum + (item.quantity || 0);
      }, 0);
    }, 0);

    // Group orders by day for revenue chart
    const dailyRevenue = orders.reduce((acc: any, order: any) => {
      const dateStr = typeof order.created_at === 'string' 
        ? order.created_at.split('T')[0] 
        : new Date(order.created_at).toISOString().split('T')[0];
      
      const price = typeof order.total_price === 'string' 
        ? parseFloat(order.total_price) 
        : order.total_price;
      
      acc[dateStr] = (acc[dateStr] || 0) + (price || 0);
      return acc;
    }, {});

    const revenueByDay = Object.entries(dailyRevenue).map(([date, revenue]) => ({
      day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      date,
      revenue
    }));

    // Fetch product data directly from Shopify API
    let inventoryLevels = 0;
    let topProducts: any[] = [];

    try {
      // Fetch inventory data from Shopify API
      const inventoryResponse = await fetch(
        `https://${shop}/admin/api/2024-01/products/count.json`, {
          headers: {
            'X-Shopify-Access-Token': connection.access_token
          }
        }
      );
      
      const inventoryData = await inventoryResponse.json();
      console.log('Inventory count:', inventoryData);
      
      // Use product count as a proxy for inventory levels
      inventoryLevels = inventoryData.count || 0;
      
      // Get top products by aggregating order line items
      const productSales: Record<string, { title: string, quantity: number, revenue: number }> = {};
      
      // Aggregate sales data by product
      orders.forEach((order: any) => {
        if (!order.line_items) return;
        
        // Handle both API response format and database format
        const lineItems = Array.isArray(order.line_items) 
          ? order.line_items 
          : (typeof order.line_items === 'object' ? Object.values(order.line_items) : []);
        
        lineItems.forEach((item: any) => {
          const productId = item.product_id?.toString() || item.id?.toString();
          if (!productId) return;
          
          if (!productSales[productId]) {
            productSales[productId] = {
              title: item.title || item.name || 'Unknown Product',
              quantity: 0,
              revenue: 0
            };
          }
          
          const quantity = item.quantity || 0;
          const price = typeof item.price === 'string' 
            ? parseFloat(item.price) 
            : (item.price || 0);
          
          productSales[productId].quantity += quantity;
          productSales[productId].revenue += price * quantity;
        });
      });
      
      // Convert to array and sort by revenue
      topProducts = Object.entries(productSales)
        .map(([id, data]) => ({
          id,
          title: data.title,
          quantity: data.quantity,
          revenue: data.revenue
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10); // Get top 10 products
    } catch (error) {
      console.error('Error fetching inventory data:', error);
      // Continue with other metrics even if inventory fetch fails
    }

    // Calculate daily data for charts
    const dailyData = Object.entries(dailyRevenue).map(([date, revenue]) => {
      // Count orders for this day
      const dayOrders = orders.filter((order: any) => {
        const orderDate = typeof order.created_at === 'string' 
          ? order.created_at.split('T')[0] 
          : new Date(order.created_at).toISOString().split('T')[0];
        return orderDate === date;
      }).length;
      
      // Count units sold for this day
      const dayUnits = orders
        .filter((order: any) => {
          const orderDate = typeof order.created_at === 'string' 
            ? order.created_at.split('T')[0] 
            : new Date(order.created_at).toISOString().split('T')[0];
          return orderDate === date;
        })
        .reduce((sum: number, order: any) => {
          if (!order.line_items) return sum;
          
          // Handle both API response format and database format
          const lineItems = Array.isArray(order.line_items) 
            ? order.line_items 
            : (typeof order.line_items === 'object' ? Object.values(order.line_items) : []);
          
          return sum + lineItems.reduce((itemSum: number, item: any) => {
            return itemSum + (item.quantity || 0);
          }, 0);
        }, 0);
      
      return {
        date,
        revenue: Number(revenue),
        orders: dayOrders,
        units: dayUnits
      };
    });

    // Prepare the response with all metrics
    const metricsResponse = {
      totalSales,
      ordersPlaced: orderCount,
      averageOrderValue,
      unitsSold,
      inventoryLevels,
      revenueByDay,
      topProducts,
      dailyData,
      salesGrowth: 0, // Add growth calculations later
      ordersGrowth: 0,
      aovGrowth: 0,
      unitsGrowth: 0,
      inventoryGrowth: 0,
      customerSegments: {
        newCustomers: 0,
        returningCustomers: 0
      }
    };

    console.log('Metrics calculated:', {
      totalSales,
      orderCount,
      averageOrderValue,
      unitsSold,
      inventoryLevels,
      revenueByDay: revenueByDay.length,
      topProducts: topProducts.length,
      dailyData: dailyData.length
    });

    return NextResponse.json(metricsResponse);

  } catch (error) {
    console.error('Error fetching Shopify metrics:', error);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
} 